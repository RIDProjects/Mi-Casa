import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Budget expenses and income sources get an optional currency. NULL means the
 * house local currency, so existing rows need no backfill.
 */
export class AddBudgetLineCurrency1792400000000 implements MigrationInterface {
  name = 'AddBudgetLineCurrency1792400000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "budget_expenses" ADD COLUMN IF NOT EXISTS "currencyCode" character varying(3)`);
    await queryRunner.query(`ALTER TABLE "income_sources" ADD COLUMN IF NOT EXISTS "currencyCode" character varying(3)`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "income_sources" DROP COLUMN IF EXISTS "currencyCode"`);
    await queryRunner.query(`ALTER TABLE "budget_expenses" DROP COLUMN IF EXISTS "currencyCode"`);
  }
}
