import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Budgets created before `isShoppingBudget` existed have no flagged expense, so the shopping list
 * budget reads 0. Flags, per budget without one, the "Presupuesto compra" expense of the "Comida"
 * category (falling back to the oldest expense of that category) and normalizes its name.
 */
export class BackfillShoppingBudget1791800000000 implements MigrationInterface {
  name = 'BackfillShoppingBudget1791800000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      UPDATE "budget_expenses" SET "isShoppingBudget" = true, "name" = 'Presupuesto compra'
      WHERE "id" IN (
        SELECT DISTINCT ON (c."budget_id") e."id"
        FROM "budget_expenses" e
        JOIN "budget_categories" c ON c."id" = e."category_id"
        WHERE lower(c."name") = 'comida'
          AND NOT EXISTS (
            SELECT 1 FROM "budget_expenses" f
            JOIN "budget_categories" fc ON fc."id" = f."category_id"
            WHERE fc."budget_id" = c."budget_id" AND f."isShoppingBudget" = true
          )
        ORDER BY c."budget_id", (lower(e."name") LIKE 'presupuesto compra%') DESC, e."createdAt" ASC
      )`);
  }

  // Data backfill: nothing to undo safely (the flag is harmless when the column is dropped).
  public async down(): Promise<void> {}
}
