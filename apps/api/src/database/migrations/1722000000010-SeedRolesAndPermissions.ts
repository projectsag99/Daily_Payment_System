import { MigrationInterface, QueryRunner } from "typeorm";

export class SeedRolesAndPermissions1722000000010
  implements MigrationInterface
{
  name = "SeedRolesAndPermissions1722000000010";

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      INSERT INTO roles (id, code, name, description) VALUES
        ('00000000-0000-4000-8000-000000000001', 'admin', 'Administrador', 'Full system access'),
        ('00000000-0000-4000-8000-000000000002', 'collector', 'Cobrador', 'Field collector access')
      ON CONFLICT (code) DO NOTHING
    `);

    await queryRunner.query(`
      INSERT INTO permissions (id, code, description) VALUES
        ('00000000-0000-4000-8000-000000000101', 'clients:read', 'View clients'),
        ('00000000-0000-4000-8000-000000000102', 'clients:write', 'Create and update clients'),
        ('00000000-0000-4000-8000-000000000103', 'clients:delete', 'Soft-delete clients'),
        ('00000000-0000-4000-8000-000000000104', 'collectors:read', 'View collectors'),
        ('00000000-0000-4000-8000-000000000105', 'collectors:approve', 'Approve or reject collectors'),
        ('00000000-0000-4000-8000-000000000106', 'collectors:manage', 'Suspend or deactivate collectors'),
        ('00000000-0000-4000-8000-000000000107', 'routes:read', 'View routes'),
        ('00000000-0000-4000-8000-000000000108', 'routes:write', 'Manage routes and assignments'),
        ('00000000-0000-4000-8000-000000000109', 'credits:read', 'View credits and installments'),
        ('00000000-0000-4000-8000-00000000010a', 'credits:write', 'Create and manage credits'),
        ('00000000-0000-4000-8000-00000000010b', 'payments:create', 'Register payments'),
        ('00000000-0000-4000-8000-00000000010c', 'payments:read', 'View payment history'),
        ('00000000-0000-4000-8000-00000000010d', 'receipts:read', 'View and manage receipts'),
        ('00000000-0000-4000-8000-00000000010e', 'rules:manage', 'Configure business rules'),
        ('00000000-0000-4000-8000-00000000010f', 'audit:read', 'View audit logs'),
        ('00000000-0000-4000-8000-000000000110', 'users:manage', 'Manage admin users')
      ON CONFLICT (code) DO NOTHING
    `);

    const adminRoleId = "00000000-0000-4000-8000-000000000001";
    const collectorRoleId = "00000000-0000-4000-8000-000000000002";

    const adminPermissions = [
      "00000000-0000-4000-8000-000000000101",
      "00000000-0000-4000-8000-000000000102",
      "00000000-0000-4000-8000-000000000103",
      "00000000-0000-4000-8000-000000000104",
      "00000000-0000-4000-8000-000000000105",
      "00000000-0000-4000-8000-000000000106",
      "00000000-0000-4000-8000-000000000107",
      "00000000-0000-4000-8000-000000000108",
      "00000000-0000-4000-8000-000000000109",
      "00000000-0000-4000-8000-00000000010a",
      "00000000-0000-4000-8000-00000000010c",
      "00000000-0000-4000-8000-00000000010d",
      "00000000-0000-4000-8000-00000000010e",
      "00000000-0000-4000-8000-00000000010f",
      "00000000-0000-4000-8000-000000000110",
    ];

    const collectorPermissions = [
      "00000000-0000-4000-8000-000000000101",
      "00000000-0000-4000-8000-000000000102",
      "00000000-0000-4000-8000-000000000107",
      "00000000-0000-4000-8000-000000000109",
      "00000000-0000-4000-8000-00000000010b",
      "00000000-0000-4000-8000-00000000010c",
      "00000000-0000-4000-8000-00000000010d",
    ];

    for (const permissionId of adminPermissions) {
      await queryRunner.query(`
        INSERT INTO role_permissions (role_id, permission_id)
        VALUES ('${adminRoleId}', '${permissionId}')
        ON CONFLICT (role_id, permission_id) DO NOTHING
      `);
    }

    for (const permissionId of collectorPermissions) {
      await queryRunner.query(`
        INSERT INTO role_permissions (role_id, permission_id)
        VALUES ('${collectorRoleId}', '${permissionId}')
        ON CONFLICT (role_id, permission_id) DO NOTHING
      `);
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    const permissionIds = [
      "00000000-0000-4000-8000-000000000101",
      "00000000-0000-4000-8000-000000000102",
      "00000000-0000-4000-8000-000000000103",
      "00000000-0000-4000-8000-000000000104",
      "00000000-0000-4000-8000-000000000105",
      "00000000-0000-4000-8000-000000000106",
      "00000000-0000-4000-8000-000000000107",
      "00000000-0000-4000-8000-000000000108",
      "00000000-0000-4000-8000-000000000109",
      "00000000-0000-4000-8000-00000000010a",
      "00000000-0000-4000-8000-00000000010b",
      "00000000-0000-4000-8000-00000000010c",
      "00000000-0000-4000-8000-00000000010d",
      "00000000-0000-4000-8000-00000000010e",
      "00000000-0000-4000-8000-00000000010f",
      "00000000-0000-4000-8000-000000000110",
    ];

    await queryRunner.query(`
      DELETE FROM role_permissions
      WHERE role_id IN (
        '00000000-0000-4000-8000-000000000001',
        '00000000-0000-4000-8000-000000000002'
      )
    `);
    await queryRunner.query(`
      DELETE FROM permissions
      WHERE id = ANY($1::uuid[])
    `, [permissionIds]);
    await queryRunner.query(`
      DELETE FROM roles
      WHERE id IN (
        '00000000-0000-4000-8000-000000000001',
        '00000000-0000-4000-8000-000000000002'
      )
    `);
  }
}
