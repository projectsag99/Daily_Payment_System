import { MigrationInterface, QueryRunner } from "typeorm";

export class CreateRulesAndNotificationTables1722000000008
  implements MigrationInterface
{
  name = "CreateRulesAndNotificationTables1722000000008";

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE business_rules (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        name VARCHAR(100) NOT NULL,
        rule_type rule_type NOT NULL,
        config JSONB NOT NULL,
        is_active BOOLEAN NOT NULL DEFAULT true,
        notify_channel notification_channel NOT NULL DEFAULT 'push',
        cooldown_hours INT NOT NULL DEFAULT 24,
        created_by UUID NULL REFERENCES users(id) ON DELETE SET NULL,
        created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
      )
    `);

    await queryRunner.query(`
      CREATE TABLE notifications (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        title VARCHAR(200) NOT NULL,
        body TEXT NOT NULL,
        channel notification_channel NOT NULL,
        status notification_status NOT NULL DEFAULT 'pending',
        payload JSONB NULL,
        sent_at TIMESTAMPTZ NULL,
        read_at TIMESTAMPTZ NULL,
        failure_reason TEXT NULL,
        created_at TIMESTAMPTZ NOT NULL DEFAULT now()
      )
    `);
    await queryRunner.query(`
      CREATE INDEX idx_notifications_user_id ON notifications (user_id)
    `);
    await queryRunner.query(`
      CREATE INDEX idx_notifications_status ON notifications (status)
    `);

    await queryRunner.query(`
      CREATE TABLE rule_evaluation_logs (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        rule_id UUID NOT NULL REFERENCES business_rules(id) ON DELETE CASCADE,
        client_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
        collector_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        evaluated_at TIMESTAMPTZ NOT NULL,
        matched BOOLEAN NOT NULL,
        notification_id UUID NULL REFERENCES notifications(id) ON DELETE SET NULL
      )
    `);
    await queryRunner.query(`
      CREATE INDEX idx_rule_eval_rule_client
      ON rule_evaluation_logs (rule_id, client_id, evaluated_at DESC)
    `);

    await queryRunner.query(`
      CREATE TABLE notification_jobs (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        notification_id UUID NOT NULL REFERENCES notifications(id) ON DELETE CASCADE,
        bull_job_id VARCHAR(100) NULL,
        attempts INT NOT NULL DEFAULT 0,
        last_attempt_at TIMESTAMPTZ NULL,
        dlq_at TIMESTAMPTZ NULL
      )
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS notification_jobs`);
    await queryRunner.query(`DROP TABLE IF EXISTS rule_evaluation_logs`);
    await queryRunner.query(`DROP TABLE IF EXISTS notifications`);
    await queryRunner.query(`DROP TABLE IF EXISTS business_rules`);
  }
}
