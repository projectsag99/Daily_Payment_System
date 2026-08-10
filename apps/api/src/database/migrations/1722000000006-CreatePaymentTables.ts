import { MigrationInterface, QueryRunner } from "typeorm";

export class CreatePaymentTables1722000000006 implements MigrationInterface {
  name = "CreatePaymentTables1722000000006";

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE payments (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        client_id UUID NOT NULL REFERENCES clients(id) ON DELETE RESTRICT,
        collector_id UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
        amount DECIMAL(15, 2) NOT NULL,
        payment_method payment_method NOT NULL,
        status payment_status NOT NULL DEFAULT 'completed',
        idempotency_key VARCHAR(100) NOT NULL,
        notes TEXT NULL,
        captured_at TIMESTAMPTZ NOT NULL,
        recorded_at TIMESTAMPTZ NOT NULL DEFAULT now(),
        device_id VARCHAR(100) NULL,
        geo_location GEOGRAPHY(POINT, 4326) NULL,
        reversed_at TIMESTAMPTZ NULL,
        reversed_by UUID NULL REFERENCES users(id) ON DELETE SET NULL,
        reversal_reason TEXT NULL,
        UNIQUE (collector_id, idempotency_key)
      )
    `);
    await queryRunner.query(`
      CREATE INDEX idx_payments_client_id ON payments (client_id)
    `);
    await queryRunner.query(`
      CREATE INDEX idx_payments_collector_id ON payments (collector_id)
    `);
    await queryRunner.query(`
      CREATE INDEX idx_payments_recorded_at ON payments (recorded_at)
    `);

    await queryRunner.query(`
      CREATE TABLE payment_allocations (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        payment_id UUID NOT NULL REFERENCES payments(id) ON DELETE RESTRICT,
        installment_id UUID NOT NULL REFERENCES installments(id) ON DELETE RESTRICT,
        amount DECIMAL(15, 2) NOT NULL,
        created_at TIMESTAMPTZ NOT NULL DEFAULT now()
      )
    `);
    await queryRunner.query(`
      CREATE INDEX idx_payment_allocations_payment_id
      ON payment_allocations (payment_id)
    `);
    await queryRunner.query(`
      CREATE INDEX idx_payment_allocations_installment_id
      ON payment_allocations (installment_id)
    `);

    await queryRunner.query(`
      CREATE TABLE idempotency_keys (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        key VARCHAR(100) NOT NULL,
        scope VARCHAR(50) NOT NULL,
        actor_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        request_hash VARCHAR(64) NOT NULL,
        response_status INT NOT NULL,
        response_body JSONB NOT NULL,
        created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
        expires_at TIMESTAMPTZ NOT NULL,
        UNIQUE (scope, actor_id, key)
      )
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS idempotency_keys`);
    await queryRunner.query(`DROP TABLE IF EXISTS payment_allocations`);
    await queryRunner.query(`DROP TABLE IF EXISTS payments`);
  }
}
