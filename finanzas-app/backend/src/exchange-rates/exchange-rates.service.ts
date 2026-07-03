import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ExchangeRate } from '../database/entities/exchange-rate.entity';

// CUP is the base currency. These are CUP per unit of each foreign currency.
const DEFAULT_RATES: Record<string, number> = {
  MLC: 120,
  USD: 125,
};

@Injectable()
export class ExchangeRatesService {
  constructor(
    @InjectRepository(ExchangeRate) private repo: Repository<ExchangeRate>,
  ) {}

  async findAll(): Promise<ExchangeRate[]> {
    // Return the latest entry per fromCurrency pair (base: CUP)
    const pairs = ['MLC', 'USD'];
    const results: ExchangeRate[] = [];
    for (const from of pairs) {
      const latest = await this.repo.findOne({
        where: { fromCurrency: from, toCurrency: 'CUP' },
        order: { date: 'DESC', createdAt: 'DESC' },
      });
      if (latest) results.push(latest);
    }
    return results;
  }

  async create(dto: Partial<ExchangeRate>): Promise<ExchangeRate> {
    const entry = this.repo.create({
      ...dto,
      toCurrency: dto.toCurrency ?? 'CUP',
      source: dto.source ?? 'manual',
    });
    return this.repo.save(entry);
  }

  async getLatest(): Promise<Record<string, number>> {
    const pairs = ['MLC', 'USD'];
    const rates: Record<string, number> = {};
    for (const from of pairs) {
      const latest = await this.repo.findOne({
        where: { fromCurrency: from, toCurrency: 'CUP' },
        order: { date: 'DESC', createdAt: 'DESC' },
      });
      rates[from] = latest ? Number(latest.rate) : DEFAULT_RATES[from];
    }
    return rates;
  }
}
