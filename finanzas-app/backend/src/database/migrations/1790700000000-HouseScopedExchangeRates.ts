import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Makes `exchange_rates` house-scoped. Rates were global, so one household's
 * edit changed every other household's conversions.
 *
 * up():
 *   1. add nullable `house_id`;
 *   2. copy every existing (global) row to every existing house, so each house
 *      keeps the rate history it was effectively using;
 *   3. delete the original global rows (house_id IS NULL);
 *   4. set NOT NULL, add FK (ON DELETE CASCADE) and the lookup index.
 *
 * down(): collapses back to global rows. Rows from different houses are
 * merged, keeping one row per (fromCurrency, toCurrency, date) — the most
 * recently created one — before dropping the column.
 */
export class HouseScopedExchangeRates1790700000000 implements MigrationInterface {
  name = 'HouseScopedExchangeRates1790700000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "exchange_rates" ADD "house_id" uuid`);
    await queryRunner.query(
      `INSERT INTO "exchange_rates" ("id", "fromCurrency", "toCurrency", "rate", "date", "source", "rateType", "createdAt", "house_id")
       SELECT uuid_generate_v4(), er."fromCurrency", er."toCurrency", er."rate", er."date", er."source", er."rateType", er."createdAt", h."id"
       FROM "exchange_rates" er
       CROSS JOIN "houses" h
       WHERE er."house_id" IS NULL`,
    );
    await queryRunner.query(`DELETE FROM "exchange_rates" WHERE "house_id" IS NULL`);
    await queryRunner.query(`ALTER TABLE "exchange_rates" ALTER COLUMN "house_id" SET NOT NULL`);
    await queryRunner.query(
      `ALTER TABLE "exchange_rates" ADD CONSTRAINT "FK_exchange_rates_house" FOREIGN KEY ("house_id") REFERENCES "houses"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_exchange_rates_house_pair_date" ON "exchange_rates" ("house_id", "fromCurrency", "toCurrency", "date")`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX "IDX_exchange_rates_house_pair_date"`);
    await queryRunner.query(`ALTER TABLE "exchange_rates" DROP CONSTRAINT "FK_exchange_rates_house"`);
    await queryRunner.query(
      `DELETE FROM "exchange_rates" WHERE "id" NOT IN (
         SELECT DISTINCT ON ("fromCurrency", "toCurrency", "date") "id"
         FROM "exchange_rates"
         ORDER BY "fromCurrency", "toCurrency", "date", "createdAt" DESC
       )`,
    );
    await queryRunner.query(`ALTER TABLE "exchange_rates" DROP COLUMN "house_id"`);
  }
}
