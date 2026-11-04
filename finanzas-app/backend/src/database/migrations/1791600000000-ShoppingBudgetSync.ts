import { MigrationInterface, QueryRunner } from 'typeorm';

/** Flags the budget expense that feeds the shopping list budget. */
export class ShoppingBudgetSync1791600000000 implements MigrationInterface {
  name = 'ShoppingBudgetSync1791600000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "budget_expenses" ADD "isShoppingBudget" boolean NOT NULL DEFAULT false`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "budget_expenses" DROP COLUMN "isShoppingBudget"`);
  }
}
