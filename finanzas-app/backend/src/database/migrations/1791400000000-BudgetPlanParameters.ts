import { MigrationInterface, QueryRunner } from 'typeorm';

/** Adds nullable plan override columns to `budgets` (NULL = use the built-in default). */
export class BudgetPlanParameters1791400000000 implements MigrationInterface {
  name = 'BudgetPlanParameters1791400000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "budgets" ADD "fiMultiplier" numeric(7,2)`);
    await queryRunner.query(`ALTER TABLE "budgets" ADD "minInvestmentPercent" numeric(5,2)`);
    await queryRunner.query(`ALTER TABLE "budgets" ADD "emergencyFundMonths" numeric(5,2)`);
    await queryRunner.query(`ALTER TABLE "budgets" ADD "entertainmentPercent" numeric(5,2)`);
    await queryRunner.query(`ALTER TABLE "budgets" ADD "fixedExpensesCapPercent" numeric(5,2)`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    for (const col of ['fixedExpensesCapPercent', 'entertainmentPercent', 'emergencyFundMonths', 'minInvestmentPercent', 'fiMultiplier']) {
      await queryRunner.query(`ALTER TABLE "budgets" DROP COLUMN "${col}"`);
    }
  }
}
