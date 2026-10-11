import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Investments used the fixed Postgres enum `investments_currency_enum`
 * (ARS/USD/CUP, default 'ARS'). They now accept any currency configured in the
 * house (`house_currencies`), validated by the service.
 *
 * up(): `currency` becomes varchar(3) keeping existing values; the 'ARS'
 * default is dropped and the enum type is removed.
 * down(): recreates the enum (ARS, USD, CUP) and restores the 'ARS' default.
 * Codes that do not exist in the enum cannot be represented, so they are
 * mapped to 'USD' (lossy) before the cast; the original code is not recoverable.
 */
export class InvestmentCurrencyVarchar1791100000000 implements MigrationInterface {
  name = 'InvestmentCurrencyVarchar1791100000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "investments" ALTER COLUMN "currency" DROP DEFAULT`);
    await queryRunner.query(
      `ALTER TABLE "investments" ALTER COLUMN "currency" TYPE character varying(3) USING "currency"::text`,
    );
    await queryRunner.query(`DROP TYPE "public"."investments_currency_enum"`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`CREATE TYPE "public"."investments_currency_enum" AS ENUM('ARS', 'USD', 'CUP')`);
    await queryRunner.query(
      `UPDATE "investments" SET "currency" = 'USD' WHERE "currency" NOT IN ('ARS', 'USD', 'CUP')`,
    );
    await queryRunner.query(
      `ALTER TABLE "investments" ALTER COLUMN "currency" TYPE "public"."investments_currency_enum" USING "currency"::"public"."investments_currency_enum"`,
    );
    await queryRunner.query(`ALTER TABLE "investments" ALTER COLUMN "currency" SET DEFAULT 'ARS'`);
  }
}
