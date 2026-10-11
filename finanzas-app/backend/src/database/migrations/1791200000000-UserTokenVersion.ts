import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Adds `users.token_version` (int, default 0). JWTs carry it as `tv`; bumping it
 * revokes every previously issued token (password reset, "log out everywhere").
 */
export class UserTokenVersion1791200000000 implements MigrationInterface {
  name = 'UserTokenVersion1791200000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "users" ADD "token_version" integer NOT NULL DEFAULT '0'`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "users" DROP COLUMN "token_version"`);
  }
}
