import { MigrationInterface, QueryRunner } from "typeorm";

export class CreateRouteTables1722000000004 implements MigrationInterface {
  name = "CreateRouteTables1722000000004";

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE routes (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        name VARCHAR(100) NOT NULL,
        shift shift_type NOT NULL,
        day_of_week SMALLINT NULL,
        is_active BOOLEAN NOT NULL DEFAULT true,
        description TEXT NULL,
        created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
        deleted_at TIMESTAMPTZ NULL
      )
    `);
    await queryRunner.query(`
      CREATE INDEX idx_routes_shift ON routes (shift)
    `);
    await queryRunner.query(`
      CREATE INDEX idx_routes_active ON routes (is_active)
    `);

    await queryRunner.query(`
      CREATE TABLE route_client_assignments (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        route_id UUID NOT NULL REFERENCES routes(id) ON DELETE CASCADE,
        client_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
        sequence_order INT NOT NULL,
        visit_status visit_status NOT NULL DEFAULT 'pending',
        created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
        UNIQUE (route_id, client_id)
      )
    `);
    await queryRunner.query(`
      CREATE INDEX idx_route_client_route_order
      ON route_client_assignments (route_id, sequence_order)
    `);

    await queryRunner.query(`
      CREATE TABLE route_collector_assignments (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        route_id UUID NOT NULL REFERENCES routes(id) ON DELETE CASCADE,
        collector_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        effective_from DATE NOT NULL,
        effective_to DATE NULL,
        created_at TIMESTAMPTZ NOT NULL DEFAULT now()
      )
    `);
    await queryRunner.query(`
      CREATE INDEX idx_route_collector_dates
      ON route_collector_assignments (collector_id, effective_from, effective_to)
    `);

    await queryRunner.query(`
      CREATE TABLE daily_visit_snapshots (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        route_id UUID NOT NULL REFERENCES routes(id) ON DELETE CASCADE,
        client_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
        visit_date DATE NOT NULL,
        visit_status visit_status NOT NULL,
        UNIQUE (route_id, client_id, visit_date)
      )
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS daily_visit_snapshots`);
    await queryRunner.query(`DROP TABLE IF EXISTS route_collector_assignments`);
    await queryRunner.query(`DROP TABLE IF EXISTS route_client_assignments`);
    await queryRunner.query(`DROP TABLE IF EXISTS routes`);
  }
}
