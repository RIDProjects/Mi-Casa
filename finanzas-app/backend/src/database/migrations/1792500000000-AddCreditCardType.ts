import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Adds the card type (credit / debit) so debit cards can be recorded next to
 * credit cards. Existing cards become "credit".
 */
export class AddCreditCardType1792500000000 implements MigrationInterface {
  name = 'AddCreditCardType1792500000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DO $$ BEGIN
      CREATE TYPE "public"."credit_cards_cardtype_enum" AS ENUM('credit', 'debit');
    EXCEPTION WHEN duplicate_object THEN NULL; END $$`);
    await queryRunner.query(
      `ALTER TABLE "credit_cards" ADD COLUMN IF NOT EXISTS "cardType" "public"."credit_cards_cardtype_enum" NOT NULL DEFAULT 'credit'`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "credit_cards" DROP COLUMN IF EXISTS "cardType"`);
    await queryRunner.query(`DROP TYPE IF EXISTS "public"."credit_cards_cardtype_enum"`);
  }
}
