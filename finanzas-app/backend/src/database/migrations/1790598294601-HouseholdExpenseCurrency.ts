import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Renames `household_expenses.amountCUP` to `amount` and adds
 * `currencyCode` / `exchangeRate` / `amountBase` (base-currency snapshot).
 *
 * Manual verification (no DB integration-test harness exists in this repo —
 * see design.md Testing Strategy, "Migration up/down on a copy of the
 * production DB — Manual run plus row-count and total-equality checks"):
 *   1. Run `up()` against a copy of the production DB.
 *   2. Assert `SELECT COUNT(*) FROM household_expenses` is unchanged.
 *   3. Assert per-house `SUM(amountBase)` equals the pre-migration
 *      `SUM(amountCUP)` (all legacy rows are CUP, so `amountBase` should
 *      equal `amount` exactly — see rate-1 fallback below).
 *   4. Run `down()` and assert `amountCUP` again equals the pre-migration
 *      value for every row (lossy only for rows whose `currencyCode` was
 *      changed to a non-CUP value after this migration ran, which cannot
 *      exist on the copy used for this check).
 *
 * The rate-resolution precedence used in the backfill UPDATE below (dated
 * rate on/before the row's date → newest rate → 1) mirrors
 * `HouseCurrenciesService.resolveRateToBase()`, whose unit tests
 * (house-currencies.service.spec.ts) exercise this exact precedence and
 * therefore double as documentation of this migration's intent.
 */
export class HouseholdExpenseCurrency1790598294601 implements MigrationInterface {
  name = 'HouseholdExpenseCurrency1790598294601';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "household_expenses" RENAME COLUMN "amountCUP" TO "amount"`,
    );
    await queryRunner.query(
      `ALTER TABLE "household_expenses" ADD "currencyCode" varchar(3) NOT NULL DEFAULT 'CUP', ADD "exchangeRate" numeric(15,4), ADD "amountBase" numeric(12,2)`,
    );
    await queryRunner.query(`
      UPDATE "household_expenses" he SET "exchangeRate" = COALESCE(
        (SELECT CASE WHEN hc."currencyCode" = 'CUP' THEN 1 ELSE COALESCE(
           (SELECT er."rate" FROM "exchange_rates" er WHERE er."fromCurrency" = 'CUP'
              AND er."toCurrency" = hc."currencyCode" AND er."date" <= he."date" ORDER BY er."date" DESC LIMIT 1),
           (SELECT er."rate" FROM "exchange_rates" er WHERE er."fromCurrency" = 'CUP'
              AND er."toCurrency" = hc."currencyCode" ORDER BY er."date" DESC LIMIT 1), 1) END
         FROM "house_currencies" hc WHERE hc."house_id" = he."house_id" AND hc."isBase" = true LIMIT 1), 1)
    `);
    await queryRunner.query(
      `UPDATE "household_expenses" SET "amountBase" = ROUND("amount" * "exchangeRate", 2)`,
    );
    await queryRunner.query(
      `ALTER TABLE "household_expenses" ALTER "exchangeRate" SET NOT NULL, ALTER "amountBase" SET NOT NULL, ALTER "currencyCode" DROP DEFAULT`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `UPDATE "household_expenses" SET "amount" = "amountBase" WHERE "currencyCode" <> 'CUP'`,
    );
    await queryRunner.query(
      `ALTER TABLE "household_expenses" DROP COLUMN "amountBase"`,
    );
    await queryRunner.query(
      `ALTER TABLE "household_expenses" DROP COLUMN "exchangeRate"`,
    );
    await queryRunner.query(
      `ALTER TABLE "household_expenses" DROP COLUMN "currencyCode"`,
    );
    await queryRunner.query(
      `ALTER TABLE "household_expenses" RENAME COLUMN "amount" TO "amountCUP"`,
    );
  }
}
