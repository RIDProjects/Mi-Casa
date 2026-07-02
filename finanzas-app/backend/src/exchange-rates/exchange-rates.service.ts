import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ExchangeRate } from '../database/entities/exchange-rate.entity';

const DEFAULT_RATES: Record<string, number> = {
  USD: 1000,
  CUP: 0.04,
};

@Injectable()
export class ExchangeRatesService {
  constructor(
    @InjectRepository(ExchangeRate) private repo: Repository<ExchangeRate>,
  ) {}

  async findAll(): Promise<ExchangeRate[]> {
    // Return the latest entry per fromCurrency pair
    const pairs = ['USD', 'CUP'];
    const results: ExchangeRate[] = [];
    for (const from of pairs) {
      const latest = await this.repo.findOne({
        where: { fromCurrency: from, toCurrency: 'ARS' },
        order: { date: 'DESC', createdAt: 'DESC' },
      });
      if (latest) results.push(latest);
    }
    return results;
  }

  async create(dto: Partial<ExchangeRate>): Promise<ExchangeRate> {
    const entry = this.repo.create({
      ...dto,
      toCurrency: dto.toCurrency ?? 'ARS',
      source: dto.source ?? 'manual',
    });
    return this.repo.save(entry);
  }

  async getLatest(): Promise<Record<string, number>> {
    const pairs = ['USD', 'CUP'];
    const rates: Record<string, number> = {};
    for (const from of pairs) {
      const latest = await this.repo.findOne({
        where: { fromCurrency: from, toCurrency: 'ARS' },
        order: { date: 'DESC', createdAt: 'DESC' },
      });
      rates[from] = latest ? Number(latest.rate) : DEFAULT_RATES[from];
    }
    return rates;
  }
}
