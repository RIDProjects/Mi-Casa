import { MigrationInterface, QueryRunner } from "typeorm";

export class HouseInvitations1788451162637 implements MigrationInterface {
    name = 'HouseInvitations1788451162637'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TABLE "house_invitations" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "email" character varying NOT NULL, "role" character varying NOT NULL DEFAULT 'user', "token" character varying NOT NULL, "status" character varying NOT NULL DEFAULT 'pending', "expires_at" TIMESTAMP NOT NULL, "house_id" uuid NOT NULL, "invited_by_id" uuid, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "UQ_house_invitations_token" UNIQUE ("token"), CONSTRAINT "PK_house_invitations_id" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE INDEX "IDX_house_invitations_house_id" ON "house_invitations" ("house_id") `);
        await queryRunner.query(`CREATE INDEX "IDX_house_invitations_email_house_status" ON "house_invitations" ("email", "house_id", "status") `);
        await queryRunner.query(`ALTER TABLE "house_invitations" ADD CONSTRAINT "FK_house_invitations_house_id" FOREIGN KEY ("house_id") REFERENCES "houses"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "house_invitations" ADD CONSTRAINT "FK_house_invitations_invited_by_id" FOREIGN KEY ("invited_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "house_invitations" DROP CONSTRAINT "FK_house_invitations_invited_by_id"`);
        await queryRunner.query(`ALTER TABLE "house_invitations" DROP CONSTRAINT "FK_house_invitations_house_id"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_house_invitations_email_house_status"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_house_invitations_house_id"`);
        await queryRunner.query(`DROP TABLE "house_invitations"`);
    }
}
