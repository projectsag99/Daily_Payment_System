import { MigrationInterface, QueryRunner } from "typeorm";

export class AddCreditCurrencyAndRoute1722000000027 implements MigrationInterface {
  name = "AddCreditCurrencyAndRoute1722000000027";

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE credits
        ADD COLUMN currency CHAR(3) NOT NULL DEFAULT 'COP',
        ADD COLUMN route_id UUID NULL REFERENCES routes(id) ON DELETE SET NULL
    `);

    await queryRunner.query(`
      UPDATE credits c
      SET
        route_id = picked.route_id,
        currency = picked.currency
      FROM (
        SELECT DISTINCT ON (rca.client_id)
          rca.client_id,
          r.id AS route_id,
          CASE r.country
            WHEN 'CO' THEN 'COP'
            WHEN 'UY' THEN 'UYU'
            WHEN 'AR' THEN 'ARS'
            WHEN 'EC' THEN 'USD'
            WHEN 'PE' THEN 'PEN'
            WHEN 'MX' THEN 'MXN'
            WHEN 'CL' THEN 'CLP'
            WHEN 'VE' THEN 'VES'
            WHEN 'PA' THEN 'USD'
            WHEN 'CR' THEN 'CRC'
            WHEN 'BO' THEN 'BOB'
            WHEN 'PY' THEN 'PYG'
            ELSE 'COP'
          END AS currency
        FROM route_client_assignments rca
        INNER JOIN routes r ON r.id = rca.route_id
        WHERE r.deleted_at IS NULL
          AND r.country IS NOT NULL
        ORDER BY rca.client_id, rca.sequence_order ASC, r.name ASC
      ) picked
      WHERE c.client_id = picked.client_id
    `);

    await queryRunner.query(`
      UPDATE credits c
      SET currency = CASE cl.country
        WHEN 'CO' THEN 'COP'
        WHEN 'UY' THEN 'UYU'
        WHEN 'AR' THEN 'ARS'
        WHEN 'EC' THEN 'USD'
        WHEN 'PE' THEN 'PEN'
        WHEN 'MX' THEN 'MXN'
        WHEN 'CL' THEN 'CLP'
        WHEN 'VE' THEN 'VES'
        WHEN 'PA' THEN 'USD'
        WHEN 'CR' THEN 'CRC'
        WHEN 'BO' THEN 'BOB'
        WHEN 'PY' THEN 'PYG'
        ELSE c.currency
      END
      FROM clients cl
      WHERE c.client_id = cl.id
        AND c.route_id IS NULL
        AND cl.country IS NOT NULL
    `);

    await queryRunner.query(`
      ALTER TABLE credits ALTER COLUMN currency DROP DEFAULT
    `);

    await queryRunner.query(`
      CREATE INDEX idx_credits_route_id ON credits (route_id)
    `);

    await queryRunner.query(`
      CREATE INDEX idx_credits_currency ON credits (currency)
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX IF EXISTS idx_credits_currency`);
    await queryRunner.query(`DROP INDEX IF EXISTS idx_credits_route_id`);
    await queryRunner.query(`
      ALTER TABLE credits
        DROP COLUMN IF EXISTS route_id,
        DROP COLUMN IF EXISTS currency
    `);
  }
}
