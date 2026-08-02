import { MigrationInterface, QueryRunner } from "typeorm";

export class CreateReceiptTables1722000000007 implements MigrationInterface {
  name = "CreateReceiptTables1722000000007";

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE receipts (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        payment_id UUID NOT NULL UNIQUE REFERENCES payments(id) ON DELETE RESTRICT,
        receipt_number VARCHAR(50) NOT NULL UNIQUE,
        storage_key VARCHAR(500) NOT NULL,
        generated_at TIMESTAMPTZ NOT NULL,
        created_at TIMESTAMPTZ NOT NULL DEFAULT now()
      )
    `);

    await queryRunner.query(`
      CREATE TABLE receipt_links (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        receipt_id UUID NOT NULL REFERENCES receipts(id) ON DELETE CASCADE,
        public_token VARCHAR(128) NOT NULL UNIQUE,
        expires_at TIMESTAMPTZ NOT NULL,
        is_revoked BOOLEAN NOT NULL DEFAULT false,
        revoked_at TIMESTAMPTZ NULL,
        revoked_by UUID NULL REFERENCES users(id) ON DELETE SET NULL,
        access_count INT NOT NULL DEFAULT 0,
        last_accessed_at TIMESTAMPTZ NULL,
        created_by UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
        created_at TIMESTAMPTZ NOT NULL DEFAULT now()
      )
    `);
    await queryRunner.query(`
      CREATE INDEX idx_receipt_links_token ON receipt_links (public_token)
    `);
    await queryRunner.query(`
      CREATE INDEX idx_receipt_links_expires_at ON receipt_links (expires_at)
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS receipt_links`);
    await queryRunner.query(`DROP TABLE IF EXISTS receipts`);
  }
}
