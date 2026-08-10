import { MigrationInterface, QueryRunner } from "typeorm";

export class CreateCashBoxTables1722000000013 implements MigrationInterface {
  name = "CreateCashBoxTables1722000000013";

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE cash_box_expenses (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        collector_id UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
        expense_date DATE NOT NULL,
        amount NUMERIC(15, 2) NOT NULL CHECK (amount > 0),
        description VARCHAR(500) NOT NULL,
        created_by UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
        created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
      )
    `);

    await queryRunner.query(`
      CREATE INDEX idx_cash_box_expenses_collector_date
      ON cash_box_expenses (collector_id, expense_date DESC)
    `);

    await queryRunner.query(`
      INSERT INTO permissions (id, code, description) VALUES
        ('00000000-0000-4000-8000-000000000111', 'cashbox:read', 'View cash box summary'),
        ('00000000-0000-4000-8000-000000000112', 'cashbox:write', 'Register logistics expenses')
      ON CONFLICT (code) DO NOTHING
    `);

    const adminRoleId = "00000000-0000-4000-8000-000000000001";
    const collectorRoleId = "00000000-0000-4000-8000-000000000002";
    const readPermissionId = "00000000-0000-4000-8000-000000000111";
    const writePermissionId = "00000000-0000-4000-8000-000000000112";

    for (const roleId of [adminRoleId, collectorRoleId]) {
      await queryRunner.query(`
        INSERT INTO role_permissions (role_id, permission_id)
        VALUES ('${roleId}', '${readPermissionId}')
        ON CONFLICT (role_id, permission_id) DO NOTHING
      `);
    }

    await queryRunner.query(`
      INSERT INTO role_permissions (role_id, permission_id)
      VALUES ('${collectorRoleId}', '${writePermissionId}')
      ON CONFLICT (role_id, permission_id) DO NOTHING
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    const readPermissionId = "00000000-0000-4000-8000-000000000111";
    const writePermissionId = "00000000-0000-4000-8000-000000000112";

    await queryRunner.query(`
      DELETE FROM role_permissions
      WHERE permission_id IN ('${readPermissionId}', '${writePermissionId}')
    `);
    await queryRunner.query(`
      DELETE FROM permissions
      WHERE id IN ('${readPermissionId}', '${writePermissionId}')
    `);
    await queryRunner.query(`DROP TABLE IF EXISTS cash_box_expenses`);
  }
}
