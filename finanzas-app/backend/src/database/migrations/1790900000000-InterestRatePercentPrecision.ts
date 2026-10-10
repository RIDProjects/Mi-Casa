import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Annual interest rates are stored as PERCENT (24.5 = 24.5%), the same unit the
 * web forms use. numeric(5,4) capped them at 9.9999, so widen to numeric(7,4)
 * (max 999.9999) on credit_cards."annualRate" and savings_goals."annualInterestRate".
 *
 * up(): widens both columns; existing values are already percents and are kept.
 * down(): clamps values above 9.9999 to 9.9999 BEFORE narrowing (otherwise the
 * ALTER fails with "numeric field overflow"). The clamped values are lost.
 */
export class InterestRatePercentPrecision1790900000000 implements MigrationInterface {
  name = 'InterestRatePercentPrecision1790900000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "credit_cards" ALTER COLUMN "annualRate" TYPE numeric(7,4)`);
    await queryRunner.query(`ALTER TABLE "savings_goals" ALTER COLUMN "annualInterestRate" TYPE numeric(7,4)`);
    // The auto-created FI goal stored 7% as the fraction 0.07; convert it to percent.
    await queryRunner.query(
      `UPDATE "savings_goals" SET "annualInterestRate" = 7 WHERE "name" = 'Independencia Financiera' AND "annualInterestRate" = 0.07`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `UPDATE "savings_goals" SET "annualInterestRate" = 0.07 WHERE "name" = 'Independencia Financiera' AND "annualInterestRate" = 7`,
    );
    await queryRunner.query(`UPDATE "credit_cards" SET "annualRate" = 9.9999 WHERE "annualRate" > 9.9999`);
    await queryRunner.query(`UPDATE "savings_goals" SET "annualInterestRate" = 9.9999 WHERE "annualInterestRate" > 9.9999`);
    await queryRunner.query(`ALTER TABLE "credit_cards" ALTER COLUMN "annualRate" TYPE numeric(5,4)`);
    await queryRunner.query(`ALTER TABLE "savings_goals" ALTER COLUMN "annualInterestRate" TYPE numeric(5,4)`);
  }
}
