import { MigrationInterface, QueryRunner } from 'typeorm';

/** Adds `houses.autoExchangeRates` (boolean, default true) for the elToque daily rate sync. */
export class HouseAutoExchangeRates1791300000000 implements MigrationInterface {
  name = 'HouseAutoExchangeRates1791300000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "houses" ADD "autoExchangeRates" boolean NOT NULL DEFAULT true`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "houses" DROP COLUMN "autoExchangeRates"`);
  }
}
