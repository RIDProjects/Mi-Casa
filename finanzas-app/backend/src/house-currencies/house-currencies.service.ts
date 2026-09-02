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
      order: { isBase: 'DESC', currencyCode: 'ASC' },
    });
  }

  async add(
    houseId: string,
    dto: {
      currencyCode: string;
      currencyName: string;
      symbol: string;
      locale?: string;
      isBase?: boolean;
    },
  ): Promise<HouseCurrency> {
    if (dto.isBase) {
      await this.repo.update({ house: { id: houseId } }, { isBase: false });
    }
    const currency = this.repo.create({ ...dto, house: { id: houseId } });
    return this.repo.save(currency);
  }

  async setBase(houseId: string, currencyId: string): Promise<HouseCurrency> {
    const currency = await this.repo.findOne({
      where: { id: currencyId, house: { id: houseId } },
    });
    if (!currency) throw new NotFoundException('Moneda no encontrada');

    await this.repo.update({ house: { id: houseId } }, { isBase: false });
    await this.repo.update({ id: currencyId, house: { id: houseId } }, { isBase: true });
    return this.repo.findOneOrFail({ where: { id: currencyId, house: { id: houseId } } });
  }

  async remove(houseId: string, currencyId: string): Promise<void> {
    const c = await this.repo.findOne({
      where: { id: currencyId, house: { id: houseId } },
    });
    if (!c) throw new NotFoundException('Moneda no encontrada');
    if (c.isBase)
      throw new BadRequestException('No se puede eliminar la moneda base');
    await this.repo.remove(c);
  }

  async getBaseCurrency(houseId: string): Promise<HouseCurrency | null> {
    return this.repo.findOne({
      where: { house: { id: houseId }, isBase: true },
    });
  }

  /**
   * Returns a map of currencyCode → rate-in-terms-of-base-currency.
   * The base currency always has rate 1.
   */
  async getRates(houseId: string): Promise<Record<string, number>> {
    const currencies = await this.findByHouse(houseId);
    const base = currencies.find((c) => c.isBase);
    if (!base) return {};

    const rates: Record<string, number> = { [base.currencyCode]: 1 };

    for (const c of currencies.filter((x) => !x.isBase)) {
      const rate = await this.ratesRepo.findOne({
        where: {
          fromCurrency: c.currencyCode,
          toCurrency: base.currencyCode,
        },
        order: { date: 'DESC' },
      });
      rates[c.currencyCode] = rate ? Number(rate.rate) : 1;
    }
    return rates;
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
      date: today,
    });
    return this.ratesRepo.save(newRate);
  }
}
