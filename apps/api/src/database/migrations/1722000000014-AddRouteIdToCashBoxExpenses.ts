import { MigrationInterface, QueryRunner } from "typeorm";

export class AddRouteIdToCashBoxExpenses1722000000014
  implements MigrationInterface
{
  name = "AddRouteIdToCashBoxExpenses1722000000014";

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE cash_box_expenses
      ADD COLUMN route_id UUID NULL REFERENCES routes(id) ON DELETE RESTRICT
    `);

    await queryRunner.query(`
      CREATE INDEX idx_cash_box_expenses_route_date
      ON cash_box_expenses (route_id, expense_date DESC)
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DROP INDEX IF EXISTS idx_cash_box_expenses_route_date
    `);
    await queryRunner.query(`
      ALTER TABLE cash_box_expenses DROP COLUMN IF EXISTS route_id
    `);
  }
}
