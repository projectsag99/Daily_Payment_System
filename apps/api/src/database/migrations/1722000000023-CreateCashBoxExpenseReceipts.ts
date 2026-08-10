import { MigrationInterface, QueryRunner } from "typeorm";

export class CreateCashBoxExpenseReceipts1722000000023
  implements MigrationInterface
{
  name = "CreateCashBoxExpenseReceipts1722000000023";

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE cash_box_expense_receipts (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        expense_id UUID NOT NULL REFERENCES cash_box_expenses(id) ON DELETE CASCADE,
        storage_key VARCHAR(500) NOT NULL,
        mime_type VARCHAR(100) NOT NULL,
        original_file_name VARCHAR(255),
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `);
    await queryRunner.query(`
      CREATE INDEX idx_cash_box_expense_receipts_expense
      ON cash_box_expense_receipts (expense_id)
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS cash_box_expense_receipts`);
  }
}
