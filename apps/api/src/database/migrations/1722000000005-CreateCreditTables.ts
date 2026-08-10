import { MigrationInterface, QueryRunner } from "typeorm";

export class CreateCreditTables1722000000005 implements MigrationInterface {
  name = "CreateCreditTables1722000000005";

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE credits (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        client_id UUID NOT NULL REFERENCES clients(id) ON DELETE RESTRICT,
        principal_amount DECIMAL(15, 2) NOT NULL,
        interest_rate DECIMAL(8, 4) NULL,
        total_installments INT NOT NULL,
        installment_amount DECIMAL(15, 2) NOT NULL,
        start_date DATE NOT NULL,
        status credit_status NOT NULL DEFAULT 'active',
        notes TEXT NULL,
        created_by UUID NULL REFERENCES users(id) ON DELETE SET NULL,
        created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
        closed_at TIMESTAMPTZ NULL
      )
    `);
    await queryRunner.query(`
      CREATE INDEX idx_credits_client_id ON credits (client_id)
    `);
    await queryRunner.query(`
      CREATE INDEX idx_credits_status ON credits (status)
    `);

    await queryRunner.query(`
      CREATE TABLE installments (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        credit_id UUID NOT NULL REFERENCES credits(id) ON DELETE CASCADE,
        installment_number INT NOT NULL,
        due_date DATE NOT NULL,
        amount_due DECIMAL(15, 2) NOT NULL,
        amount_paid DECIMAL(15, 2) NOT NULL DEFAULT 0,
        status installment_status NOT NULL DEFAULT 'pending',
        overdue_at TIMESTAMPTZ NULL,
        created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
        UNIQUE (credit_id, installment_number)
      )
    `);
    await queryRunner.query(`
      CREATE INDEX idx_installments_credit_id ON installments (credit_id)
    `);
    await queryRunner.query(`
      CREATE INDEX idx_installments_due_date ON installments (due_date)
    `);
    await queryRunner.query(`
      CREATE INDEX idx_installments_status ON installments (status)
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS installments`);
    await queryRunner.query(`DROP TABLE IF EXISTS credits`);
  }
}
