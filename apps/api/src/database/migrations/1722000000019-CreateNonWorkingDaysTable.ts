import { MigrationInterface, QueryRunner } from "typeorm";

export class CreateNonWorkingDaysTable1722000000019
  implements MigrationInterface
{
  name = "CreateNonWorkingDaysTable1722000000019";

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE non_working_days (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        day_date DATE NOT NULL UNIQUE,
        label VARCHAR(200) NOT NULL,
        created_by UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
        created_at TIMESTAMPTZ NOT NULL DEFAULT now()
      )
    `);

    await queryRunner.query(`
      CREATE INDEX idx_non_working_days_day_date
      ON non_working_days (day_date)
    `);

    await queryRunner.query(`
      INSERT INTO permissions (id, code, description) VALUES
        ('00000000-0000-4000-8000-000000000113', 'calendar:manage', 'Manage non-working days calendar')
      ON CONFLICT (code) DO NOTHING
    `);

    const adminRoleId = "00000000-0000-4000-8000-000000000001";
    const permissionId = "00000000-0000-4000-8000-000000000113";

    await queryRunner.query(`
      INSERT INTO role_permissions (role_id, permission_id)
      VALUES ('${adminRoleId}', '${permissionId}')
      ON CONFLICT (role_id, permission_id) DO NOTHING
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    const permissionId = "00000000-0000-4000-8000-000000000113";

    await queryRunner.query(`
      DELETE FROM role_permissions WHERE permission_id = '${permissionId}'
    `);
    await queryRunner.query(`
      DELETE FROM permissions WHERE id = '${permissionId}'
    `);
    await queryRunner.query(`DROP TABLE IF EXISTS non_working_days`);
  }
}
