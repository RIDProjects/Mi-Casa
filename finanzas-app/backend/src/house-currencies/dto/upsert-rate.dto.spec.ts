import 'reflect-metadata';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { UpsertRateDto } from './upsert-rate.dto';

describe('UpsertRateDto', () => {
  const build = (rate: number) =>
    plainToInstance(UpsertRateDto, { fromCurrency: 'USD', toCurrency: 'CUP', rate });

  it('rejects rate 0', async () => {
    const errors = await validate(build(0));
    expect(errors.map((e) => e.property)).toContain('rate');
  });

  it('rejects negative rates', async () => {
    const errors = await validate(build(-1));
    expect(errors.map((e) => e.property)).toContain('rate');
  });

  it('accepts a positive rate', async () => {
    expect(await validate(build(380))).toHaveLength(0);
  });
});
