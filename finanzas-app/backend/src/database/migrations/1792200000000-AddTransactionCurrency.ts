import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Keeps the original amount, currency and exchange rate of foreign-currency
 * transactions. "amount" stays the local-currency value, so existing rows
 * (all local) need no backfill: the new columns are simply NULL for them.
 */
export class AddTransactionCurrency1792200000000 implements MigrationInterface {
  name = 'AddTransactionCurrency1792200000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "transactions" ADD COLUMN IF NOT EXISTS "originalAmount" numeric(12,2)`);
    await queryRunner.query(`ALTER TABLE "transactions" ADD COLUMN IF NOT EXISTS "currencyCode" character varying(3)`);
    await queryRunner.query(`ALTER TABLE "transactions" ADD COLUMN IF NOT EXISTS "exchangeRate" numeric(24,12)`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "transactions" DROP COLUMN IF EXISTS "exchangeRate"`);
    await queryRunner.query(`ALTER TABLE "transactions" DROP COLUMN IF EXISTS "currencyCode"`);
    await queryRunner.query(`ALTER TABLE "transactions" DROP COLUMN IF EXISTS "originalAmount"`);
  }
}
