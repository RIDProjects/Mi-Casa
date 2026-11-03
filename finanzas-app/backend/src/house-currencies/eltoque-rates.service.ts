import { Inject, Injectable, Logger, Optional } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Cron, CronExpression } from '@nestjs/schedule';
import { Repository } from 'typeorm';
import axios from 'axios';
import { House } from '../database/entities/house.entity';
import { HouseCurrenciesService } from './house-currencies.service';

const ELTOQUE_URL = 'https://tasas.eltoque.com/v1/trmi';
const LOCAL_CODE = 'CUP';
// elToque quotes the euro as "ECU"; every other key we use is already ISO.
const KEY_TO_ISO: Record<string, string> = { USD: 'USD', ECU: 'EUR', MLC: 'MLC' };

export const ELTOQUE_FETCHER = 'ELTOQUE_FETCHER';
export type ElToqueFetcher = () => Promise<unknown>;

/** Extracts `{ ISO code: CUP per 1 unit }` from the elToque payload, ignoring junk values. */
export function parseElToqueRates(payload: any): Record<string, number> {
  const tasas = payload?.tasas;
  const out: Record<string, number> = {};
  if (!tasas || typeof tasas !== 'object') return out;
  for (const [key, iso] of Object.entries(KEY_TO_ISO)) {
    const value = Number(tasas[key]);
    if (Number.isFinite(value) && value > 0) out[iso] = value;
  }
  return out;
}

const defaultFetcher: ElToqueFetcher = async () => {
  const { data } = await axios.get(ELTOQUE_URL, {
    headers: { Authorization: `Bearer ${process.env.ELTOQUE_API_KEY}` },
    timeout: 10_000,
  });
  return data;
};

/**
 * Keeps `<foreign> → CUP` rates in sync with elToque's informal market rate.
 * Uses the official API (needs `ELTOQUE_API_KEY`): the public website blocks
 * automated clients, so scraping it is not an option.
 */
@Injectable()
export class ElToqueRatesService {
  private readonly logger = new Logger(ElToqueRatesService.name);

  constructor(
    private readonly currencies: HouseCurrenciesService,
    @InjectRepository(House) private readonly houses: Repository<House>,
    @Optional() @Inject(ELTOQUE_FETCHER) private readonly fetchPayload: ElToqueFetcher = defaultFetcher,
  ) {
    this.fetchPayload ??= defaultFetcher;
  }

  private get available(): boolean {
    return !!process.env.ELTOQUE_API_KEY;
  }

  @Cron(CronExpression.EVERY_DAY_AT_6AM)
  async refreshAll(): Promise<void> {
    if (!this.available) return;
    const houses = await this.houses.find({ where: { autoExchangeRates: true }, select: ['id'] });
    for (const house of houses) {
      try {
        await this.refreshHouse(house.id);
      } catch (e) {
        this.logger.error(`No se pudieron actualizar las tasas de la casa ${house.id}: ${e.message}`);
      }
    }
  }

  async refreshHouse(houseId: string): Promise<{ updated: string[] }> {
    if (!this.available) return { updated: [] };
    const active = await this.currencies.findByHouse(houseId);
    const local = active.find((c) => c.isLocal);
    if (local?.currencyCode !== LOCAL_CODE) return { updated: [] };

    const rates = parseElToqueRates(await this.fetchPayload());
    const updated: string[] = [];
    for (const c of active.filter((x) => !x.isLocal && rates[x.currencyCode])) {
      await this.currencies.upsertRate(houseId, {
        fromCurrency: c.currencyCode,
        toCurrency: LOCAL_CODE,
        rate: rates[c.currencyCode],
        rateType: 'informal',
        source: 'eltoque',
      });
      updated.push(c.currencyCode);
    }
    return { updated };
  }

  async setAuto(houseId: string, enabled: boolean): Promise<void> {
    await this.houses.update({ id: houseId }, { autoExchangeRates: enabled });
  }

  /** Currencies whose `→ CUP` rate elToque keeps up to date (so manual edits are blocked). */
  private async managedCodes(houseId: string): Promise<{ enabled: boolean; codes: string[] }> {
    const house = await this.houses.findOne({ where: { id: houseId } });
    const enabled = house?.autoExchangeRates ?? true;
    return { enabled, codes: enabled && this.available ? Object.values(KEY_TO_ISO) : [] };
  }

  /** True while the daily sync owns `from → to`: auto on, token configured, CUP target, quoted currency. */
  async isManaged(houseId: string, from: string, to: string): Promise<boolean> {
    if (to !== LOCAL_CODE) return false;
    return (await this.managedCodes(houseId)).codes.includes(from);
  }

  async getStatus(
    houseId: string,
  ): Promise<{ enabled: boolean; available: boolean; managedCodes: string[] }> {
    const { enabled, codes } = await this.managedCodes(houseId);
    return { enabled, available: this.available, managedCodes: codes };
  }
}
