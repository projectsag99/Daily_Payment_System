import { MigrationInterface, QueryRunner } from "typeorm";

export class CreateCashBoxPeriodStarts1722000000021
  implements MigrationInterface
{
  name = "CreateCashBoxPeriodStarts1722000000021";

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE cash_box_period_starts (
        collector_id UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
        effective_from DATE NOT NULL,
        notes VARCHAR(500),
        set_by UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
        created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
      )
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS cash_box_period_starts`);
  }
}
