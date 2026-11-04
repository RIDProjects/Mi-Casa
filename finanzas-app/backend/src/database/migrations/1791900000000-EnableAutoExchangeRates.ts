import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * The elToque daily sync is now always on (the toggle card was removed from the UI), but houses
 * that switched it off earlier would stay stuck with stale manual rates and no way to re-enable it.
 */
export class EnableAutoExchangeRates1791900000000 implements MigrationInterface {
  name = 'EnableAutoExchangeRates1791900000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`UPDATE "houses" SET "autoExchangeRates" = true WHERE "autoExchangeRates" = false`);
  }

  // Which houses had it off is not recoverable; nothing to undo.
  public async down(): Promise<void> {}
}
