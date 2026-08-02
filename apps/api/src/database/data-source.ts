import { config } from "dotenv";
import { resolve } from "path";
import { DataSource } from "typeorm";

config({ path: resolve(__dirname, "../../../../.env") });

export default new DataSource({
  type: "postgres",
  url:
    process.env.DATABASE_URL ??
    "postgresql://dps:dps@localhost:5432/daily_payment",
  migrations: [resolve(__dirname, "migrations", "*.{ts,js}")],
  migrationsTableName: "typeorm_migrations",
  logging: process.env.NODE_ENV !== "production",
});
