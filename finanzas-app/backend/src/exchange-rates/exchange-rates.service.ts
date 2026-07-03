import { Injectable, Optional } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ExchangeRate } from '../database/entities/exchange-rate.entity';
import { HouseCurrenciesService } from '../house-currencies/house-currencies.service';

@Injectable()
export class ExchangeRatesService {
  constructor(
    @InjectRepository(ExchangeRate) private repo: Repository<ExchangeRate>,
    @Optional() private readonly houseCurrenciesService?: HouseCurrenciesService,
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

  /**
   * Returns exchange rates as a map of currencyCode → rate.
   *
   * When `houseId` is provided, delegates to the per-house currency service,
   * which returns rates scoped to that household's configured currencies.
   *
   * When `houseId` is omitted, returns an empty map — global hardcoded defaults
   * have been removed in favour of per-house configuration.
   */
  async getLatest(houseId?: string): Promise<Record<string, number>> {
    if (houseId && this.houseCurrenciesService) {
      return this.houseCurrenciesService.getRates(houseId);
    }
    return {};
  }
}
