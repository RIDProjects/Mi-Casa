import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Renames three "base currency" columns to their "local currency"
 * equivalents, aligning the DB schema with the app's user-facing vocabulary:
 *   - `house_currencies.isBase`           → `isLocal`
 *   - `purchase_lists.baseCurrencyCode`   → `localCurrencyCode`
 *   - `household_expenses.amountBase`     → `amountLocal`
 *
 * All three renames are metadata-only (`RENAME COLUMN`), so no data is
 * lost and no NOT NULL/default constraints are touched.
 *
 * Manual verification (no DB integration-test harness exists in this repo —
 * see design.md Testing Strategy, "Migration up/down on a copy of the
 * production DB — Manual run plus row-count and total-equality checks"):
 *   1. Run `up()` against a copy of the production DB.
 *   2. Assert row counts for `house_currencies`, `purchase_lists`, and
 *      `household_expenses` are unchanged.
 *   3. Assert per-house `SUM(amountLocal)` equals the pre-migration
 *      `SUM(amountBase)`.
 *   4. Assert exactly one `isLocal = true` row per house (same as the
 *      pre-migration `isBase = true` count).
 *   5. Run `down()` and assert `isBase`, `baseCurrencyCode`, and
 *      `amountBase` are all restored with the same values.
 */
export class LocalCurrencyTerminology1790600618731 implements MigrationInterface {
  name = 'LocalCurrencyTerminology1790600618731';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "house_currencies" RENAME COLUMN "isBase" TO "isLocal"`,
    );
    await queryRunner.query(
      `ALTER TABLE "purchase_lists" RENAME COLUMN "baseCurrencyCode" TO "localCurrencyCode"`,
    );
    await queryRunner.query(
      `ALTER TABLE "household_expenses" RENAME COLUMN "amountBase" TO "amountLocal"`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "household_expenses" RENAME COLUMN "amountLocal" TO "amountBase"`,
    );
    await queryRunner.query(
      `ALTER TABLE "purchase_lists" RENAME COLUMN "localCurrencyCode" TO "baseCurrencyCode"`,
    );
    await queryRunner.query(
      `ALTER TABLE "house_currencies" RENAME COLUMN "isLocal" TO "isBase"`,
    );
  }
}
