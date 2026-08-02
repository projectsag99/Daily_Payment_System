import { MigrationInterface, QueryRunner } from "typeorm";

export class CreateAuthAndRbacTables1722000000002
  implements MigrationInterface
{
  name = "CreateAuthAndRbacTables1722000000002";

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE users (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        email VARCHAR(255) NOT NULL,
        password_hash VARCHAR(255) NOT NULL,
        first_name VARCHAR(100) NOT NULL,
        last_name VARCHAR(100) NOT NULL,
        phone VARCHAR(30) NULL,
        is_active BOOLEAN NOT NULL DEFAULT true,
        email_verified_at TIMESTAMPTZ NULL,
        last_login_at TIMESTAMPTZ NULL,
        created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
        deleted_at TIMESTAMPTZ NULL
      )
    `);
    await queryRunner.query(`
      CREATE UNIQUE INDEX idx_users_email_active ON users (email)
      WHERE deleted_at IS NULL
    `);
    await queryRunner.query(`
      CREATE INDEX idx_users_created_at ON users (created_at)
    `);

    await queryRunner.query(`
      CREATE TABLE roles (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        code user_role_code NOT NULL UNIQUE,
        name VARCHAR(50) NOT NULL,
        description TEXT NULL
      )
    `);

    await queryRunner.query(`
      CREATE TABLE permissions (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        code VARCHAR(100) NOT NULL UNIQUE,
        description TEXT NULL
      )
    `);

    await queryRunner.query(`
      CREATE TABLE user_roles (
        user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        role_id UUID NOT NULL REFERENCES roles(id) ON DELETE CASCADE,
        PRIMARY KEY (user_id, role_id)
      )
    `);

    await queryRunner.query(`
      CREATE TABLE role_permissions (
        role_id UUID NOT NULL REFERENCES roles(id) ON DELETE CASCADE,
        permission_id UUID NOT NULL REFERENCES permissions(id) ON DELETE CASCADE,
        PRIMARY KEY (role_id, permission_id)
      )
    `);

    await queryRunner.query(`
      CREATE TABLE collector_profiles (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        user_id UUID NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
        status collector_status NOT NULL DEFAULT 'pending',
        employee_code VARCHAR(50) NULL UNIQUE,
        status_changed_at TIMESTAMPTZ NULL,
        status_changed_by UUID NULL REFERENCES users(id) ON DELETE SET NULL,
        rejection_reason TEXT NULL,
        notes TEXT NULL,
        created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
      )
    `);
    await queryRunner.query(`
      CREATE INDEX idx_collector_profiles_status ON collector_profiles (status)
    `);
    await queryRunner.query(`
      CREATE INDEX idx_collector_profiles_user_id ON collector_profiles (user_id)
    `);

    await queryRunner.query(`
      CREATE TABLE refresh_tokens (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        token_hash VARCHAR(255) NOT NULL,
        family_id UUID NOT NULL,
        expires_at TIMESTAMPTZ NOT NULL,
        revoked_at TIMESTAMPTZ NULL,
        created_at TIMESTAMPTZ NOT NULL DEFAULT now()
      )
    `);
    await queryRunner.query(`
      CREATE INDEX idx_refresh_tokens_user_id ON refresh_tokens (user_id)
    `);
    await queryRunner.query(`
      CREATE INDEX idx_refresh_tokens_family_id ON refresh_tokens (family_id)
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS refresh_tokens`);
    await queryRunner.query(`DROP TABLE IF EXISTS collector_profiles`);
    await queryRunner.query(`DROP TABLE IF EXISTS role_permissions`);
    await queryRunner.query(`DROP TABLE IF EXISTS user_roles`);
    await queryRunner.query(`DROP TABLE IF EXISTS permissions`);
    await queryRunner.query(`DROP TABLE IF EXISTS roles`);
    await queryRunner.query(`DROP TABLE IF EXISTS users`);
  }
}
