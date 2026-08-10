import { MigrationInterface, QueryRunner } from "typeorm";

export class AddRouteDepartment1722000000025 implements MigrationInterface {
  name = "AddRouteDepartment1722000000025";

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE routes
        ADD COLUMN department VARCHAR(10) NULL
    `);
    await queryRunner.query(`
      CREATE INDEX idx_routes_country_department ON routes (country, department)
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX IF EXISTS idx_routes_country_department`);
    await queryRunner.query(`
      ALTER TABLE routes
        DROP COLUMN IF EXISTS department
    `);
  }
}
