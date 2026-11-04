import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Gives every house that already has a budget with income the plan that follows from it:
 *  - an emergency fund synced with the budget, only when the house has no fund at all;
 *  - the "Independencia Financiera" goal (monthly income x multiplier, default 150), only when missing.
 * Existing funds and goals are never modified.
 */
export class BackfillDerivedPlan1792000000000 implements MigrationInterface {
  name = 'BackfillDerivedPlan1792000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      INSERT INTO "emergency_funds" ("id", "name", "targetMonths", "minimumMonths", "savingPeriodMonths", "currentBalance", "syncWithBudget", "house_id")
      SELECT uuid_generate_v4(), 'Fondo de Emergencia', 6, 3, 24, 0, true, b."house_id"
      FROM (
        SELECT DISTINCT ON ("house_id") "house_id", "id" FROM "budgets" ORDER BY "house_id", "createdAt" DESC
      ) b
      WHERE EXISTS (SELECT 1 FROM "income_sources" i WHERE i."budget_id" = b."id" AND i."amount" > 0)
        AND NOT EXISTS (SELECT 1 FROM "emergency_funds" f WHERE f."house_id" = b."house_id")`);

    await queryRunner.query(`
      INSERT INTO "savings_goals" ("id", "name", "goalAmount", "currentSavings", "months", "annualInterestRate", "emoji", "house_id")
      SELECT uuid_generate_v4(), 'Independencia Financiera',
             ROUND((SELECT SUM(i."amount") FROM "income_sources" i WHERE i."budget_id" = b."id") * COALESCE(b."fiMultiplier", 150), 2),
             0, 240, 7, '🏠', b."house_id"
      FROM (
        SELECT DISTINCT ON ("house_id") "house_id", "id", "fiMultiplier" FROM "budgets" ORDER BY "house_id", "createdAt" DESC
      ) b
      WHERE EXISTS (SELECT 1 FROM "income_sources" i WHERE i."budget_id" = b."id" AND i."amount" > 0)
        AND NOT EXISTS (SELECT 1 FROM "savings_goals" g WHERE g."house_id" = b."house_id" AND g."name" = 'Independencia Financiera')`);
  }

  // Data backfill: the created rows are indistinguishable from user-created ones, so nothing is undone.
  public async down(): Promise<void> {}
}
