import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Adds the debt priority (alta / media / baja) used to order how what is owed
 * to the house is applied against its debts. Existing debts become "media".
 */
export class AddDebtPriority1792300000000 implements MigrationInterface {
  name = 'AddDebtPriority1792300000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DO $$ BEGIN
      CREATE TYPE "public"."debts_priority_enum" AS ENUM('alta', 'media', 'baja');
    EXCEPTION WHEN duplicate_object THEN NULL; END $$`);
    await queryRunner.query(
      `ALTER TABLE "debts" ADD COLUMN IF NOT EXISTS "priority" "public"."debts_priority_enum" NOT NULL DEFAULT 'media'`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "debts" DROP COLUMN IF EXISTS "priority"`);
    await queryRunner.query(`DROP TYPE IF EXISTS "public"."debts_priority_enum"`);
  }
}
