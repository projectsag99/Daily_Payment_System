import { MigrationInterface, QueryRunner } from "typeorm";

export class AddCashBoxExpenseCategory1722000000022
  implements MigrationInterface
{
  name = "AddCashBoxExpenseCategory1722000000022";

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DO $$ BEGIN
        CREATE TYPE cash_box_expense_category AS ENUM ('route', 'office');
      EXCEPTION
        WHEN duplicate_object THEN null;
      END $$;
    `);
    await queryRunner.query(`
      ALTER TABLE cash_box_expenses
      ADD COLUMN IF NOT EXISTS category cash_box_expense_category NOT NULL DEFAULT 'route'
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE cash_box_expenses DROP COLUMN IF EXISTS category
    `);
    await queryRunner.query(`
      DROP TYPE IF EXISTS cash_box_expense_category
    `);
  }
}
