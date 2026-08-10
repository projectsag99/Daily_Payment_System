import { MigrationInterface, QueryRunner } from "typeorm";

export class CreateSyncAndAuditTables1722000000009
  implements MigrationInterface
{
  name = "CreateSyncAndAuditTables1722000000009";

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE sync_events (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        device_id VARCHAR(100) NOT NULL,
        client_event_id VARCHAR(100) NOT NULL,
        event_type VARCHAR(50) NOT NULL,
        payload_hash VARCHAR(64) NOT NULL,
        status sync_event_status NOT NULL,
        result_entity_id UUID NULL,
        error_code VARCHAR(100) NULL,
        processed_at TIMESTAMPTZ NOT NULL,
        UNIQUE (device_id, client_event_id)
      )
    `);
    await queryRunner.query(`
      CREATE INDEX idx_sync_events_device_id ON sync_events (device_id)
    `);

    await queryRunner.query(`
      CREATE TABLE audit_logs (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        actor_id UUID NULL REFERENCES users(id) ON DELETE SET NULL,
        action audit_action NOT NULL,
        entity_type VARCHAR(50) NOT NULL,
        entity_id UUID NOT NULL,
        before_state JSONB NULL,
        after_state JSONB NULL,
        metadata JSONB NULL,
        ip_address INET NULL,
        created_at TIMESTAMPTZ NOT NULL DEFAULT now()
      )
    `);
    await queryRunner.query(`
      CREATE INDEX idx_audit_entity ON audit_logs (entity_type, entity_id)
    `);
    await queryRunner.query(`
      CREATE INDEX idx_audit_actor ON audit_logs (actor_id)
    `);
    await queryRunner.query(`
      CREATE INDEX idx_audit_created_at ON audit_logs (created_at)
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS audit_logs`);
    await queryRunner.query(`DROP TABLE IF EXISTS sync_events`);
  }
}
