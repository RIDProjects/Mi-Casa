import { MigrationInterface, QueryRunner } from 'typeorm';

/** Adds the opt-in flag that derives an emergency fund's expenses live from the budget. */
export class EmergencyFundBudgetSync1791500000000 implements MigrationInterface {
  name = 'EmergencyFundBudgetSync1791500000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "emergency_funds" ADD "syncWithBudget" boolean NOT NULL DEFAULT false`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "emergency_funds" DROP COLUMN "syncWithBudget"`);
  }
}
