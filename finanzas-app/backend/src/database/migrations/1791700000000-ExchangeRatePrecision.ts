import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Widens exchange-rate precision from numeric(15,4) to numeric(24,12) so small inverse rates
 * (1 CUP = 0.0010928961 USD) are not rounded to 4 decimals when the local currency changes.
 * Existing values are preserved exactly (widening only).
 */
export class ExchangeRatePrecision1791700000000 implements MigrationInterface {
  name = 'ExchangeRatePrecision1791700000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "exchange_rates" ALTER COLUMN "rate" TYPE numeric(24,12)`);
    await queryRunner.query(`ALTER TABLE "household_expenses" ALTER COLUMN "exchangeRate" TYPE numeric(24,12)`);
  }

  // Lossy by nature: rates are rounded back to 4 decimals.
  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "household_expenses" ALTER COLUMN "exchangeRate" TYPE numeric(15,4)`);
    await queryRunner.query(`ALTER TABLE "exchange_rates" ALTER COLUMN "rate" TYPE numeric(15,4)`);
  }
}
