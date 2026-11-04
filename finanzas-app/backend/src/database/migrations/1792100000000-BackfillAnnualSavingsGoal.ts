import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Creates the "Meta de ahorro" goal (monthly income x savings target % x 12, over 12 months) for
 * every house whose latest budget has income and a savings target and that does not have it yet.
 * Existing goals are never modified.
 */
export class BackfillAnnualSavingsGoal1792100000000 implements MigrationInterface {
  name = 'BackfillAnnualSavingsGoal1792100000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      INSERT INTO "savings_goals" ("id", "name", "goalAmount", "currentSavings", "months", "annualInterestRate", "emoji", "house_id")
      SELECT uuid_generate_v4(), 'Meta de ahorro',
             ROUND((SELECT SUM(i."amount") FROM "income_sources" i WHERE i."budget_id" = b."id") * b."savingsTargetPercent" / 100 * 12, 2),
             0, 12, 0, '💰', b."house_id"
      FROM (
        SELECT DISTINCT ON ("house_id") "house_id", "id", "savingsTargetPercent" FROM "budgets" ORDER BY "house_id", "createdAt" DESC
      ) b
      WHERE b."savingsTargetPercent" IS NOT NULL
        AND EXISTS (SELECT 1 FROM "income_sources" i WHERE i."budget_id" = b."id" AND i."amount" > 0)
        AND NOT EXISTS (SELECT 1 FROM "savings_goals" g WHERE g."house_id" = b."house_id" AND g."name" = 'Meta de ahorro')`);
  }

  // Data backfill: the created rows are indistinguishable from user-created ones, so nothing is undone.
  public async down(): Promise<void> {}
}
