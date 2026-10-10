import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, EntityManager, Repository } from 'typeorm';
import { HouseCurrency } from '../database/entities/house-currency.entity';
import { ExchangeRate } from '../database/entities/exchange-rate.entity';
import { House } from '../database/entities/house.entity';
import { todayInAppTimezone } from '../common/dates';

export const CURRENCY_META: Record<
  string,
  { name: string; symbol: string; locale: string }
> = {
  CUP: { name: 'Peso Cubano', symbol: '$', locale: 'es-CU' },
  MLC: { name: 'Moneda Libremente Convertible', symbol: 'MLC$', locale: 'es-CU' },
  USD: { name: 'Dólar Estadounidense', symbol: 'US$', locale: 'en-US' },
  EUR: { name: 'Euro', symbol: '€', locale: 'es-ES' },
  ARS: { name: 'Peso Argentino', symbol: '$', locale: 'es-AR' },
  MXN: { name: 'Peso Mexicano', symbol: '$', locale: 'es-MX' },
  CLP: { name: 'Peso Chileno', symbol: '$', locale: 'es-CL' },
  COP: { name: 'Peso Colombiano', symbol: '$', locale: 'es-CO' },
  PEN: { name: 'Sol Peruano', symbol: 'S/', locale: 'es-PE' },
  BRL: { name: 'Real Brasileño', symbol: 'R$', locale: 'pt-BR' },
  GBP: { name: 'Libra Esterlina', symbol: '£', locale: 'en-GB' },
};

@Injectable()
export class HouseCurrenciesService {
  constructor(
    @InjectRepository(HouseCurrency)
    private repo: Repository<HouseCurrency>,
    @InjectRepository(ExchangeRate)
    private ratesRepo: Repository<ExchangeRate>,
    private dataSource: DataSource,
  ) {}

  async findByHouse(houseId: string): Promise<HouseCurrency[]> {
    return this.repo.find({
      where: { house: { id: houseId }, isActive: true },
      order: { isLocal: 'DESC', currencyCode: 'ASC' },
    });
  }

  async add(
    houseId: string,
    dto: {
      currencyCode: string;
      currencyName: string;
      symbol: string;
      locale?: string;
      isLocal?: boolean;
    },
  ): Promise<HouseCurrency> {
    return this.dataSource.transaction(async (manager) => {
      if (dto.isLocal) {
        // Changing the local currency of a house that already has one needs
        // the rate rebase done by `setLocal` — not a bare flag flip.
        const currentLocal = await manager.findOne(HouseCurrency, {
          where: { house: { id: houseId }, isLocal: true },
        });
        if (currentLocal && currentLocal.currencyCode !== dto.currencyCode) {
          throw new BadRequestException(
            'La casa ya tiene una moneda local. Agrega la moneda y usa "Hacer local" para cambiarla',
          );
        }
      }
      const currency = manager.create(HouseCurrency, {
        ...dto,
        house: { id: houseId },
      });
      return manager.save(HouseCurrency, currency);
    });
  }

  /**
   * Makes `currencyId` the house's local currency (N), re-basing everything
   * that was expressed in the previous local currency (O), atomically:
   *
   *  - rate(N→O) is required (or its inverse O→N); otherwise 400.
   *  - every other active currency X with an X→O rate gets X→N =
   *    rate(X→O) / rate(N→O), and O→N = 1 / rate(N→O), dated today.
   *  - the house's `household_expenses` snapshots are converted to N.
   *  - `isLocal` flags are flipped.
   *
   * Rates are stored with scale 4 (numeric 15,4). A converted rate that would
   * round to 0 (e.g. a very strong N against X) is clamped to the smallest
   * representable value, 0.0001, because a 0 rate would zero out amounts and
   * break divisions; that is the most precision the column can hold.
   */
  async setLocal(houseId: string, currencyId: string): Promise<HouseCurrency> {
    return this.dataSource.transaction(async (manager) => {
      // Serialize concurrent switches on the same house: the second caller
      // blocks here until the first commits, then re-reads the (already
      // switched) local currency below and takes the "already local" no-op.
      const house = await manager.findOne(House, {
        where: { id: houseId },
        lock: { mode: 'pessimistic_write' },
      });
      if (!house) throw new NotFoundException('Casa no encontrada');

      const target = await manager.findOne(HouseCurrency, {
        where: { id: currencyId, house: { id: houseId } },
      });
      if (!target) throw new NotFoundException('Moneda no encontrada');

      const current = await manager.findOne(HouseCurrency, {
        where: { house: { id: houseId }, isLocal: true },
        order: { createdAt: 'ASC' },
      });

      if (current && current.id === target.id) return target;

      if (current && current.currencyCode !== target.currencyCode) {
        await this.rebaseToNewLocal(
          manager,
          houseId,
          current.currencyCode,
          target.currencyCode,
        );
      }

      await manager.update(HouseCurrency, { house: { id: houseId } }, { isLocal: false });
      await manager.update(
        HouseCurrency,
        { id: currencyId, house: { id: houseId } },
        { isLocal: true },
      );
      return { ...target, isLocal: true } as HouseCurrency;
    });
  }

  private async rebaseToNewLocal(
    manager: EntityManager,
    houseId: string,
    oldCode: string,
    newCode: string,
  ): Promise<void> {
    // rate(N→O): direct, or the inverse of O→N.
    const rateNO = await this.latestRateOrInverse(manager, houseId, newCode, oldCode);
    if (rateNO === null) {
      throw new BadRequestException(
        `Configura primero la tasa de cambio ${newCode} → ${oldCode} para poder cambiar la moneda local`,
      );
    }

    const today = todayInAppTimezone();

    const others = (
      await manager.find(HouseCurrency, {
        where: { house: { id: houseId }, isActive: true },
      })
    ).filter((c) => c.currencyCode !== oldCode && c.currencyCode !== newCode);

    for (const other of others) {
      const rateXO = await this.latestRateOrInverse(manager, houseId, other.currencyCode, oldCode);
      if (rateXO === null) continue;
      await this.saveRateForDate(manager, houseId, other.currencyCode, newCode, rateXO / rateNO, today);
    }
    await this.saveRateForDate(manager, houseId, oldCode, newCode, 1 / rateNO, today);

    // Re-base the amountLocal / exchangeRate snapshots (O → N).
    await manager.query(
      `UPDATE "household_expenses"
         SET "amountLocal" = "amount", "exchangeRate" = 1
       WHERE "house_id" = $1 AND "currencyCode" = $2`,
      [houseId, newCode],
    );
    await manager.query(
      `UPDATE "household_expenses"
         SET "amountLocal" = ROUND("amountLocal" / $3::numeric, 2),
             "exchangeRate" = GREATEST(ROUND("exchangeRate" / $3::numeric, 4), 0.0001)
       WHERE "house_id" = $1 AND "currencyCode" <> $2`,
      [houseId, newCode, rateNO],
    );
  }

  /** Latest `from → to` rate, or 1 / latest `to → from`. null when neither exists. */
  private async latestRateOrInverse(
    manager: EntityManager,
    houseId: string,
    from: string,
    to: string,
  ): Promise<number | null> {
    const direct = await manager.findOne(ExchangeRate, {
      where: { house: { id: houseId }, fromCurrency: from, toCurrency: to },
      order: { date: 'DESC' },
    });
    if (direct && Number(direct.rate) > 0) return Number(direct.rate);
    const inverse = await manager.findOne(ExchangeRate, {
      where: { house: { id: houseId }, fromCurrency: to, toCurrency: from },
      order: { date: 'DESC' },
    });
    if (inverse && Number(inverse.rate) > 0) return 1 / Number(inverse.rate);
    return null;
  }

  private async saveRateForDate(
    manager: EntityManager,
    houseId: string,
    from: string,
    to: string,
    rate: number,
    date: string,
  ): Promise<void> {
    const rounded = Math.max(Math.round(rate * 10000) / 10000, 0.0001);
    const existing = await manager.findOne(ExchangeRate, {
      where: { house: { id: houseId }, fromCurrency: from, toCurrency: to, date },
    });
    if (existing) {
      existing.rate = rounded;
      await manager.save(ExchangeRate, existing);
      return;
    }
    const row = manager.create(ExchangeRate, {
      fromCurrency: from,
      toCurrency: to,
      rate: rounded,
      date,
      house: { id: houseId },
    });
    await manager.save(ExchangeRate, row);
  }

  async remove(houseId: string, currencyId: string): Promise<void> {
    const c = await this.repo.findOne({
      where: { id: currencyId, house: { id: houseId } },
    });
    if (!c) throw new NotFoundException('Moneda no encontrada');
    if (c.isLocal)
      throw new BadRequestException('No se puede eliminar la moneda local');
    await this.repo.remove(c);
  }

  async getLocalCurrency(houseId: string): Promise<HouseCurrency | null> {
    return this.repo.findOne({
      where: { house: { id: houseId }, isLocal: true },
    });
  }

  /**
   * Returns a map of currencyCode → rate-in-terms-of-local-currency.
   * The local currency always has rate 1. A currency with no usable rate
   * (neither X→local nor the inverse local→X) maps to `null` — never a
   * fabricated 1 — so clients can show the original amount instead.
   */
  async getRates(houseId: string): Promise<Record<string, number | null>> {
    const currencies = await this.findByHouse(houseId);
    const local = currencies.find((c) => c.isLocal);
    if (!local) return {};

    const rates: Record<string, number | null> = { [local.currencyCode]: 1 };

    for (const c of currencies.filter((x) => !x.isLocal)) {
      const direct = await this.findLatestRate(houseId, c.currencyCode, local.currencyCode);
      if (direct) {
        rates[c.currencyCode] = Number(direct.rate);
        continue;
      }
      const inverse = await this.findLatestRate(houseId, local.currencyCode, c.currencyCode);
      rates[c.currencyCode] = inverse && Number(inverse.rate) > 0 ? 1 / Number(inverse.rate) : null;
    }
    return rates;
  }

  private findLatestRate(houseId: string, from: string, to: string): Promise<ExchangeRate | null> {
    return this.ratesRepo.findOne({
      where: { house: { id: houseId }, fromCurrency: from, toCurrency: to },
      order: { date: 'DESC' },
    });
  }

  /**
   * Resolves the rate to convert `code` → the house's local currency, valid
   * on `onDate`. Used only by the household-expenses write path (create and
   * update) to compute the persisted local-currency snapshot. Unlike
   * `getRates()` (display-only, null when a rate is missing), this
   * method hard-fails so no expense is ever persisted
   * with a fabricated rate.
   *
   * Precedence: newest `ExchangeRate` row with `date <= onDate` → newest
   * `ExchangeRate` row overall → the same two lookups on the opposite
   * direction (local → code), inverted → 400 BadRequestException.
   */
  async resolveRateToLocal(
    houseId: string,
    code: string,
    onDate: string,
  ): Promise<{ localCode: string; rate: number }> {
    const local = await this.getLocalCurrency(houseId);
    if (!local) {
      throw new BadRequestException('La casa no tiene una moneda local configurada');
    }

    if (code === local.currencyCode) {
      return { localCode: local.currencyCode, rate: 1 };
    }

    const currency = await this.repo.findOne({
      where: { house: { id: houseId }, currencyCode: code, isActive: true },
    });
    if (!currency) {
      throw new BadRequestException(
        `La moneda ${code} no está activa en esta casa`,
      );
    }

    const direct = await this.findRateOnOrBefore(houseId, code, local.currencyCode, onDate);
    if (direct) {
      return { localCode: local.currencyCode, rate: Number(direct.rate) };
    }

    // Only the opposite direction (local → code) exists, e.g. after the local
    // currency was switched: use its inverse.
    const inverse = await this.findRateOnOrBefore(houseId, local.currencyCode, code, onDate);
    if (inverse && Number(inverse.rate) > 0) {
      return { localCode: local.currencyCode, rate: 1 / Number(inverse.rate) };
    }

    throw new BadRequestException(
      `No hay tasa de cambio configurada para ${code} → ${local.currencyCode}`,
    );
  }

  /** Newest rate with date <= onDate, else the newest rate overall. */
  private async findRateOnOrBefore(
    houseId: string,
    from: string,
    to: string,
    onDate: string,
  ): Promise<ExchangeRate | null> {
    const dated = await this.ratesRepo
      .createQueryBuilder('er')
      .where('er.house_id = :houseId', { houseId })
      .andWhere('er.fromCurrency = :from', { from })
      .andWhere('er.toCurrency = :to', { to })
      .andWhere('er.date <= :onDate', { onDate })
      .orderBy('er.date', 'DESC')
      .getOne();
    return dated ?? this.findLatestRate(houseId, from, to);
  }

  async upsertRate(
    houseId: string,
    dto: {
      fromCurrency: string;
      toCurrency: string;
      rate: number;
      rateType?: string;
    },
  ): Promise<ExchangeRate> {
    const today = todayInAppTimezone();

    const existing = await this.ratesRepo.findOne({
      where: {
        house: { id: houseId },
        fromCurrency: dto.fromCurrency,
        toCurrency: dto.toCurrency,
        date: today,
      },
    });

    if (existing) {
      existing.rate = dto.rate;
      existing.rateType = dto.rateType ?? existing.rateType;
      return this.ratesRepo.save(existing);
    }

    const newRate = this.ratesRepo.create({
      ...dto,
      house: { id: houseId },
      date: today,
    });
    return this.ratesRepo.save(newRate);
  }
}
