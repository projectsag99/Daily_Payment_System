import { MigrationInterface, QueryRunner } from "typeorm";

export class AddRouteCountryAndCity1722000000024 implements MigrationInterface {
  name = "AddRouteCountryAndCity1722000000024";

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE routes
        ADD COLUMN country VARCHAR(2) NULL,
        ADD COLUMN city VARCHAR(100) NULL
    `);
    await queryRunner.query(`
      CREATE INDEX idx_routes_country_city ON routes (country, city)
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX IF EXISTS idx_routes_country_city`);
    await queryRunner.query(`
      ALTER TABLE routes
        DROP COLUMN IF EXISTS city,
        DROP COLUMN IF EXISTS country
    `);
  }
}
