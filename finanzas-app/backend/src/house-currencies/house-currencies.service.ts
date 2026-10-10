import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { HouseCurrency } from '../database/entities/house-currency.entity';
import { ExchangeRate } from '../database/entities/exchange-rate.entity';

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
    if (dto.isLocal) {
      await this.repo.update({ house: { id: houseId } }, { isLocal: false });
    }
    const currency = this.repo.create({ ...dto, house: { id: houseId } });
    return this.repo.save(currency);
  }

  async setLocal(houseId: string, currencyId: string): Promise<HouseCurrency> {
    const currency = await this.repo.findOne({
      where: { id: currencyId, house: { id: houseId } },
    });
    if (!currency) throw new NotFoundException('Moneda no encontrada');

    await this.repo.update({ house: { id: houseId } }, { isLocal: false });
    await this.repo.update({ id: currencyId, house: { id: houseId } }, { isLocal: true });
    return this.repo.findOneOrFail({ where: { id: currencyId, house: { id: houseId } } });
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
   * The local currency always has rate 1.
   */
  async getRates(houseId: string): Promise<Record<string, number>> {
    const currencies = await this.findByHouse(houseId);
    const local = currencies.find((c) => c.isLocal);
    if (!local) return {};

    const rates: Record<string, number> = { [local.currencyCode]: 1 };

    for (const c of currencies.filter((x) => !x.isLocal)) {
      const rate = await this.ratesRepo.findOne({
        where: {
          house: { id: houseId },
          fromCurrency: c.currencyCode,
          toCurrency: local.currencyCode,
        },
        order: { date: 'DESC' },
      });
      rates[c.currencyCode] = rate ? Number(rate.rate) : 1;
    }
    return rates;
  }

  /**
   * Resolves the rate to convert `code` → the house's local currency, valid
   * on `onDate`. Used only by the household-expenses write path (create and
   * update) to compute the persisted local-currency snapshot. Unlike
   * `getRates()` (display-only, silently falls back to rate 1 when a rate
   * is missing), this method hard-fails so no expense is ever persisted
   * with a fabricated rate.
   *
   * Precedence: newest `ExchangeRate` row with `date <= onDate` → newest
   * `ExchangeRate` row overall → 400 BadRequestException.
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

    const dated = await this.ratesRepo
      .createQueryBuilder('er')
      .where('er.house_id = :houseId', { houseId })
      .andWhere('er.fromCurrency = :from', { from: code })
      .andWhere('er.toCurrency = :to', { to: local.currencyCode })
      .andWhere('er.date <= :onDate', { onDate })
      .orderBy('er.date', 'DESC')
      .getOne();

    const rateRow =
      dated ??
      (await this.ratesRepo.findOne({
        where: {
          house: { id: houseId },
          fromCurrency: code,
          toCurrency: local.currencyCode,
        },
        order: { date: 'DESC' },
      }));

    if (!rateRow) {
      throw new BadRequestException(
        `No hay tasa de cambio configurada para ${code} → ${local.currencyCode}`,
      );
    }

    return { localCode: local.currencyCode, rate: Number(rateRow.rate) };
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
    const today = new Date().toISOString().split('T')[0];

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
