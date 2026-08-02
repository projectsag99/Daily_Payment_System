import { MigrationInterface, QueryRunner } from "typeorm";

export class CreateClientTables1722000000003 implements MigrationInterface {
  name = "CreateClientTables1722000000003";

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE clients (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        code VARCHAR(50) NOT NULL,
        first_name VARCHAR(100) NOT NULL,
        last_name VARCHAR(100) NOT NULL,
        national_id VARCHAR(50) NULL,
        phone VARCHAR(30) NULL,
        email VARCHAR(255) NULL,
        address_line TEXT NULL,
        city VARCHAR(100) NULL,
        current_location GEOGRAPHY(POINT, 4326) NULL,
        status client_status NOT NULL DEFAULT 'active',
        notes TEXT NULL,
        created_by UUID NULL REFERENCES users(id) ON DELETE SET NULL,
        created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
        deleted_at TIMESTAMPTZ NULL
      )
    `);
    await queryRunner.query(`
      CREATE INDEX idx_clients_name ON clients (last_name, first_name)
    `);
    await queryRunner.query(`
      CREATE INDEX idx_clients_status ON clients (status)
    `);
    await queryRunner.query(`
      CREATE INDEX idx_clients_location ON clients USING GIST (current_location)
    `);
    await queryRunner.query(`
      CREATE UNIQUE INDEX idx_clients_code_active ON clients (code)
      WHERE deleted_at IS NULL
    `);

    await queryRunner.query(`
      CREATE TABLE client_documents (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        client_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
        document_type document_type NOT NULL,
        storage_key VARCHAR(500) NOT NULL,
        mime_type VARCHAR(100) NOT NULL,
        file_size_bytes BIGINT NOT NULL,
        uploaded_by UUID NULL REFERENCES users(id) ON DELETE SET NULL,
        created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
        deleted_at TIMESTAMPTZ NULL
      )
    `);
    await queryRunner.query(`
      CREATE INDEX idx_client_documents_client_id ON client_documents (client_id)
    `);

    await queryRunner.query(`
      CREATE TABLE client_location_history (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        client_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
        location GEOGRAPHY(POINT, 4326) NOT NULL,
        accuracy_m DECIMAL(10, 2) NULL,
        source VARCHAR(50) NOT NULL,
        recorded_by UUID NULL REFERENCES users(id) ON DELETE SET NULL,
        device_id VARCHAR(100) NULL,
        recorded_at TIMESTAMPTZ NOT NULL DEFAULT now()
      )
    `);
    await queryRunner.query(`
      CREATE INDEX idx_client_location_history_client_id
      ON client_location_history (client_id)
    `);
    await queryRunner.query(`
      CREATE INDEX idx_client_location_history_recorded_at
      ON client_location_history (recorded_at)
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS client_location_history`);
    await queryRunner.query(`DROP TABLE IF EXISTS client_documents`);
    await queryRunner.query(`DROP TABLE IF EXISTS clients`);
  }
}
