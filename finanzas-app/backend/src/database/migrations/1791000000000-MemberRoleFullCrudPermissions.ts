import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * The seed gave the `user` (member) role only view + create on debts, purchases
 * and emergency_fund, while those controllers require edit/delete too, so members
 * got 403 on update/delete/mark-purchased/register-payment.
 *
 * up(): creates any missing permission rows (module, action) and links all four
 * actions on the three modules to the `user` role. Idempotent; no-op if the
 * `user` role does not exist.
 * down(): removes only the edit/delete links for the `user` role. Permission rows
 * are left in place (they may be shared with other roles / pre-exist).
 */
export class MemberRoleFullCrudPermissions1791000000000 implements MigrationInterface {
  name = 'MemberRoleFullCrudPermissions1791000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      INSERT INTO "permissions" ("module", "action", "description")
      SELECT m.module, a.action, a.action || ' ' || m.module
      FROM (VALUES ('debts'), ('purchases'), ('emergency_fund')) AS m(module)
      CROSS JOIN (VALUES ('view'), ('create'), ('edit'), ('delete')) AS a(action)
      WHERE NOT EXISTS (
        SELECT 1 FROM "permissions" p WHERE p."module" = m.module AND p."action" = a.action
      )
    `);
    await queryRunner.query(`
      INSERT INTO "role_permissions" ("rolesId", "permissionsId")
      SELECT r."id", p."id"
      FROM "roles" r
      JOIN "permissions" p
        ON p."module" IN ('debts', 'purchases', 'emergency_fund')
       AND p."action" IN ('view', 'create', 'edit', 'delete')
      WHERE r."name" = 'user'
      ON CONFLICT ("rolesId", "permissionsId") DO NOTHING
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DELETE FROM "role_permissions" rp
      USING "roles" r, "permissions" p
      WHERE rp."rolesId" = r."id"
        AND rp."permissionsId" = p."id"
        AND r."name" = 'user'
        AND p."module" IN ('debts', 'purchases', 'emergency_fund')
        AND p."action" IN ('edit', 'delete')
    `);
  }
}
