import "reflect-metadata";
import { config } from "dotenv";
import { resolve } from "path";
import * as bcrypt from "bcrypt";
import { DataSource } from "typeorm";
import { SnakeNamingStrategy } from "typeorm-naming-strategies";
import { UserRoleCode } from "../common/constants";

config({ path: resolve(__dirname, "../../../../.env") });

const ADMIN_EMAIL = process.env.BOOTSTRAP_ADMIN_EMAIL ?? "admin@daily-payment.local";
const ADMIN_PASSWORD = process.env.BOOTSTRAP_ADMIN_PASSWORD ?? "AdminPass123!";
const ADMIN_FIRST_NAME = process.env.BOOTSTRAP_ADMIN_FIRST_NAME ?? "Admin";
const ADMIN_LAST_NAME = process.env.BOOTSTRAP_ADMIN_LAST_NAME ?? "Sistema";

async function bootstrapAdmin(): Promise<void> {
  const dataSource = new DataSource({
    type: "postgres",
    url:
      process.env.DATABASE_URL ??
      "postgresql://dps:dps@localhost:5432/daily_payment",
    namingStrategy: new SnakeNamingStrategy(),
  });

  await dataSource.initialize();

  try {
    const existing = await dataSource.query(
      `SELECT id FROM users WHERE LOWER(email) = LOWER($1) AND deleted_at IS NULL`,
      [ADMIN_EMAIL],
    );

    if (existing.length > 0) {
      console.log(`Admin user already exists: ${ADMIN_EMAIL}`);
      return;
    }

    const passwordHash = await bcrypt.hash(ADMIN_PASSWORD, 12);
    const users = await dataSource.query(
      `INSERT INTO users (email, password_hash, first_name, last_name, is_active)
       VALUES ($1, $2, $3, $4, true)
       RETURNING id`,
      [ADMIN_EMAIL, passwordHash, ADMIN_FIRST_NAME, ADMIN_LAST_NAME],
    );
    const userId = users[0].id as string;

    const roles = await dataSource.query(
      `SELECT id FROM roles WHERE code = $1`,
      [UserRoleCode.ADMIN],
    );
    if (!roles.length) {
      throw new Error("Admin role not found — run migrations first");
    }

    await dataSource.query(
      `INSERT INTO user_roles (user_id, role_id) VALUES ($1, $2)`,
      [userId, roles[0].id],
    );

    console.log("Admin user created successfully");
    console.log(`  Email: ${ADMIN_EMAIL}`);
    console.log("  Password: (from BOOTSTRAP_ADMIN_PASSWORD or default)");
  } finally {
    await dataSource.destroy();
  }
}

void bootstrapAdmin().catch((error: unknown) => {
  console.error("Bootstrap failed:", error);
  process.exit(1);
});
