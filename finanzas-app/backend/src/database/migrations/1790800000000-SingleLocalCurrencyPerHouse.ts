import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Enforces at most one local currency per house.
 *
 * up():
 *   1. for houses with several `isLocal = true` rows, keep the earliest
 *      created one (ties broken by id) and unset the others;
 *   2. create a partial unique index on `house_id` where `isLocal = true`.
 *
 * down(): drops the index. The unset duplicates are not restored.
 */
export class SingleLocalCurrencyPerHouse1790800000000 implements MigrationInterface {
  name = 'SingleLocalCurrencyPerHouse1790800000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `UPDATE "house_currencies" SET "isLocal" = false
       WHERE "isLocal" = true
         AND "id" NOT IN (
           SELECT DISTINCT ON ("house_id") "id"
           FROM "house_currencies"
           WHERE "isLocal" = true
           ORDER BY "house_id", "createdAt" ASC, "id" ASC
         )`,
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX "UQ_house_currencies_one_local_per_house" ON "house_currencies" ("house_id") WHERE "isLocal" = true`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX "UQ_house_currencies_one_local_per_house"`);
  }
}
