import { MigrationInterface, QueryRunner } from "typeorm";

export class AddRulesSoftDeleteAndDeviceTokens1722000000011
  implements MigrationInterface
{
  name = "AddRulesSoftDeleteAndDeviceTokens1722000000011";

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE business_rules
      ADD COLUMN deleted_at TIMESTAMPTZ NULL
    `);
    await queryRunner.query(`
      CREATE INDEX idx_business_rules_deleted_at
      ON business_rules (deleted_at)
      WHERE deleted_at IS NULL
    `);

    await queryRunner.query(`
      CREATE TABLE device_push_tokens (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        device_id VARCHAR(100) NOT NULL,
        fcm_token VARCHAR(500) NOT NULL,
        platform VARCHAR(20) NULL,
        created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
        last_used_at TIMESTAMPTZ NULL,
        UNIQUE (user_id, device_id)
      )
    `);
    await queryRunner.query(`
      CREATE INDEX idx_device_push_tokens_user_id
      ON device_push_tokens (user_id)
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS device_push_tokens`);
    await queryRunner.query(`DROP INDEX IF EXISTS idx_business_rules_deleted_at`);
    await queryRunner.query(`
      ALTER TABLE business_rules DROP COLUMN IF EXISTS deleted_at
    `);
  }
}
