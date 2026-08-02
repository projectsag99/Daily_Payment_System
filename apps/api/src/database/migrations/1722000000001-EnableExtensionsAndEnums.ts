import { MigrationInterface, QueryRunner } from "typeorm";

export class EnableExtensionsAndEnums1722000000001
  implements MigrationInterface
{
  name = "EnableExtensionsAndEnums1722000000001";

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`CREATE EXTENSION IF NOT EXISTS "uuid-ossp"`);
    await queryRunner.query(`CREATE EXTENSION IF NOT EXISTS "postgis"`);
    await queryRunner.query(`CREATE EXTENSION IF NOT EXISTS "pgcrypto"`);

    await queryRunner.query(
      `CREATE TYPE user_role_code AS ENUM ('admin', 'collector')`,
    );
    await queryRunner.query(
      `CREATE TYPE collector_status AS ENUM ('pending', 'active', 'rejected', 'suspended', 'deactivated')`,
    );
    await queryRunner.query(
      `CREATE TYPE shift_type AS ENUM ('morning', 'afternoon', 'evening')`,
    );
    await queryRunner.query(
      `CREATE TYPE client_status AS ENUM ('active', 'inactive', 'archived')`,
    );
    await queryRunner.query(
      `CREATE TYPE document_type AS ENUM ('id_card', 'identity_document', 'other')`,
    );
    await queryRunner.query(
      `CREATE TYPE credit_status AS ENUM ('active', 'closed', 'defaulted', 'written_off')`,
    );
    await queryRunner.query(
      `CREATE TYPE installment_status AS ENUM ('pending', 'partial', 'paid', 'overdue', 'waived')`,
    );
    await queryRunner.query(
      `CREATE TYPE payment_status AS ENUM ('completed', 'reversed', 'adjustment')`,
    );
    await queryRunner.query(
      `CREATE TYPE payment_method AS ENUM ('cash', 'transfer', 'other')`,
    );
    await queryRunner.query(
      `CREATE TYPE visit_status AS ENUM ('pending', 'visited', 'paid', 'skipped', 'not_home')`,
    );
    await queryRunner.query(
      `CREATE TYPE receipt_link_status AS ENUM ('active', 'expired', 'revoked')`,
    );
    await queryRunner.query(
      `CREATE TYPE rule_type AS ENUM ('overdue_installments_threshold', 'accumulated_unpaid_quota_threshold')`,
    );
    await queryRunner.query(
      `CREATE TYPE notification_channel AS ENUM ('in_app', 'push', 'email')`,
    );
    await queryRunner.query(
      `CREATE TYPE notification_status AS ENUM ('pending', 'sent', 'failed', 'read')`,
    );
    await queryRunner.query(
      `CREATE TYPE sync_event_status AS ENUM ('success', 'conflict', 'error', 'already_applied')`,
    );
    await queryRunner.query(`
      CREATE TYPE audit_action AS ENUM (
        'CREATE', 'UPDATE', 'DELETE', 'SOFT_DELETE', 'LOGIN', 'LOGOUT',
        'APPROVE', 'REJECT', 'SUSPEND', 'REACTIVATE', 'DEACTIVATE',
        'PAYMENT_RECORD', 'RECEIPT_GENERATE', 'RECEIPT_LINK_REVOKE', 'RULE_TRIGGER'
      )
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TYPE IF EXISTS audit_action`);
    await queryRunner.query(`DROP TYPE IF EXISTS sync_event_status`);
    await queryRunner.query(`DROP TYPE IF EXISTS notification_status`);
    await queryRunner.query(`DROP TYPE IF EXISTS notification_channel`);
    await queryRunner.query(`DROP TYPE IF EXISTS rule_type`);
    await queryRunner.query(`DROP TYPE IF EXISTS receipt_link_status`);
    await queryRunner.query(`DROP TYPE IF EXISTS visit_status`);
    await queryRunner.query(`DROP TYPE IF EXISTS payment_method`);
    await queryRunner.query(`DROP TYPE IF EXISTS payment_status`);
    await queryRunner.query(`DROP TYPE IF EXISTS installment_status`);
    await queryRunner.query(`DROP TYPE IF EXISTS credit_status`);
    await queryRunner.query(`DROP TYPE IF EXISTS document_type`);
    await queryRunner.query(`DROP TYPE IF EXISTS client_status`);
    await queryRunner.query(`DROP TYPE IF EXISTS shift_type`);
    await queryRunner.query(`DROP TYPE IF EXISTS collector_status`);
    await queryRunner.query(`DROP TYPE IF EXISTS user_role_code`);
  }
}
