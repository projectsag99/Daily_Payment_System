import "reflect-metadata";
import { config } from "dotenv";
import { resolve } from "path";
import * as bcrypt from "bcrypt";
import { DataSource } from "typeorm";
import { SnakeNamingStrategy } from "typeorm-naming-strategies";
import { CollectorStatus, UserRoleCode } from "../common/constants";

config({ path: resolve(__dirname, "../../../../.env") });

const COLLECTOR_EMAIL =
  process.env.BOOTSTRAP_COLLECTOR_EMAIL ?? "cobrador@daily-payment.local";
const COLLECTOR_PASSWORD =
  process.env.BOOTSTRAP_COLLECTOR_PASSWORD ?? "CollectorPass123!";
const COLLECTOR_FIRST_NAME =
  process.env.BOOTSTRAP_COLLECTOR_FIRST_NAME ?? "Carlos";
const COLLECTOR_LAST_NAME =
  process.env.BOOTSTRAP_COLLECTOR_LAST_NAME ?? "Cobrador";
const COLLECTOR_STATUS = (process.env.BOOTSTRAP_COLLECTOR_STATUS ??
  "active") as CollectorStatus;

const VALID_STATUSES = new Set<string>(Object.values(CollectorStatus));

async function bootstrapCollector(): Promise<void> {
  if (!VALID_STATUSES.has(COLLECTOR_STATUS)) {
    throw new Error(
      `Invalid BOOTSTRAP_COLLECTOR_STATUS: ${COLLECTOR_STATUS}`,
    );
  }

  const dataSource = new DataSource({
    type: "postgres",
    url:
      process.env.DATABASE_URL ??
      "postgresql://dps:dps@localhost:5432/daily_payment",
    namingStrategy: new SnakeNamingStrategy(),
  });

  await dataSource.initialize();

  try {
    const roles = await dataSource.query(
      `SELECT id FROM roles WHERE code = $1`,
      [UserRoleCode.COLLECTOR],
    );
    if (!roles.length) {
      throw new Error("Collector role not found — run migrations first");
    }
    const collectorRoleId = roles[0].id as string;

    const existingUsers = await dataSource.query(
      `SELECT id FROM users WHERE LOWER(email) = LOWER($1) AND deleted_at IS NULL`,
      [COLLECTOR_EMAIL],
    );

    let userId: string;

    if (existingUsers.length > 0) {
      userId = existingUsers[0].id as string;
      console.log(`Collector user already exists: ${COLLECTOR_EMAIL}`);
    } else {
      const passwordHash = await bcrypt.hash(COLLECTOR_PASSWORD, 12);
      const inserted = await dataSource.query(
        `INSERT INTO users (email, password_hash, first_name, last_name, is_active)
         VALUES ($1, $2, $3, $4, true)
         RETURNING id`,
        [
          COLLECTOR_EMAIL,
          passwordHash,
          COLLECTOR_FIRST_NAME,
          COLLECTOR_LAST_NAME,
        ],
      );
      userId = inserted[0].id as string;
      console.log("Collector user created");
    }

    const roleLink = await dataSource.query(
      `SELECT 1 FROM user_roles ur
       INNER JOIN roles r ON r.id = ur.role_id
       WHERE ur.user_id = $1 AND r.code = $2`,
      [userId, UserRoleCode.COLLECTOR],
    );
    if (roleLink.length === 0) {
      await dataSource.query(
        `INSERT INTO user_roles (user_id, role_id) VALUES ($1, $2)`,
        [userId, collectorRoleId],
      );
      console.log("Collector role assigned");
    }

    const profiles = await dataSource.query(
      `SELECT id, status FROM collector_profiles WHERE user_id = $1`,
      [userId],
    );
    if (profiles.length === 0) {
      await dataSource.query(
        `INSERT INTO collector_profiles (user_id, status, status_changed_at)
         VALUES ($1, $2, now())`,
        [userId, COLLECTOR_STATUS],
      );
      console.log(`Collector profile created (${COLLECTOR_STATUS})`);
    } else if (profiles[0].status !== COLLECTOR_STATUS) {
      await dataSource.query(
        `UPDATE collector_profiles
         SET status = $2, status_changed_at = now()
         WHERE user_id = $1`,
        [userId, COLLECTOR_STATUS],
      );
      console.log(`Collector profile updated to ${COLLECTOR_STATUS}`);
    } else {
      console.log(`Collector profile already ${COLLECTOR_STATUS}`);
    }

    console.log("Bootstrap collector complete");
    console.log(`  Email: ${COLLECTOR_EMAIL}`);
    console.log("  Password: (from BOOTSTRAP_COLLECTOR_PASSWORD or default)");
    console.log(`  Status: ${COLLECTOR_STATUS}`);
  } finally {
    await dataSource.destroy();
  }
}

void bootstrapCollector().catch((error: unknown) => {
  console.error("Bootstrap collector failed:", error);
  process.exit(1);
});
