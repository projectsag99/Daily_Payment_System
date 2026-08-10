import { MigrationInterface, QueryRunner } from "typeorm";

export class AddClientCountryDepartmentAndCodeSeq1722000000026
  implements MigrationInterface
{
  name = "AddClientCountryDepartmentAndCodeSeq1722000000026";

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE clients
        ADD COLUMN country VARCHAR(2) NULL,
        ADD COLUMN department VARCHAR(10) NULL
    `);
    await queryRunner.query(`
      CREATE INDEX idx_clients_country_department ON clients (country, department)
    `);
    await queryRunner.query(`
      CREATE SEQUENCE IF NOT EXISTS client_code_seq START WITH 1
    `);
    await queryRunner.query(`
      DO $$
      DECLARE
        max_code INTEGER;
      BEGIN
        SELECT MAX(CAST(SUBSTRING(code FROM 5) AS INTEGER))
        INTO max_code
        FROM clients
        WHERE code ~ '^CLI-[0-9]+$';

        IF max_code IS NOT NULL AND max_code > 0 THEN
          PERFORM setval('client_code_seq', max_code);
        END IF;
      END $$;
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP SEQUENCE IF EXISTS client_code_seq`);
    await queryRunner.query(`DROP INDEX IF EXISTS idx_clients_country_department`);
    await queryRunner.query(`
      ALTER TABLE clients
        DROP COLUMN IF EXISTS department,
        DROP COLUMN IF EXISTS country
    `);
  }
}
