import { MigrationInterface, QueryRunner } from "typeorm";

export class CreateCashBoxInitialBalances1722000000015
  implements MigrationInterface
{
  name = "CreateCashBoxInitialBalances1722000000015";

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE cash_box_initial_balances (
        collector_id UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
        amount NUMERIC(15, 2) NOT NULL CHECK (amount >= 0),
        notes VARCHAR(500),
        set_by UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
        created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
      )
    `);

    const adminRoleId = "00000000-0000-4000-8000-000000000001";
    const writePermissionId = "00000000-0000-4000-8000-000000000112";

    await queryRunner.query(`
      INSERT INTO role_permissions (role_id, permission_id)
      VALUES ('${adminRoleId}', '${writePermissionId}')
      ON CONFLICT (role_id, permission_id) DO NOTHING
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    const adminRoleId = "00000000-0000-4000-8000-000000000001";
    const writePermissionId = "00000000-0000-4000-8000-000000000112";

    await queryRunner.query(`
      DELETE FROM role_permissions
      WHERE role_id = '${adminRoleId}' AND permission_id = '${writePermissionId}'
    `);
    await queryRunner.query(`DROP TABLE IF EXISTS cash_box_initial_balances`);
  }
}
