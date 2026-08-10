import "reflect-metadata";
import { config } from "dotenv";
import { resolve } from "path";
import { DataSource } from "typeorm";
import { SnakeNamingStrategy } from "typeorm-naming-strategies";

config({ path: resolve(__dirname, "../../../../.env") });

/**
 * Resets business data to a clean post-migration state (admin user only).
 * Does NOT drop schema or re-run migrations.
 */
async function resetDatabase(): Promise<void> {
  if (process.env.RESET_DB_CONFIRM !== "1") {
    console.error(
      "Blocked. This deletes ALL clients, routes, credits, payments, etc.\n" +
        "Run: RESET_DB_CONFIRM=1 pnpm --filter @dps/api reset:db",
    );
    process.exit(1);
  }

  const dataSource = new DataSource({
    type: "postgres",
    url:
      process.env.DATABASE_URL ??
      "postgresql://dps:dps@localhost:5432/daily_payment",
    namingStrategy: new SnakeNamingStrategy(),
  });

  await dataSource.initialize();

  const tables = [
    "payment_allocations",
    "payments",
    "installments",
    "credits",
    "receipt_links",
    "receipts",
    "cash_box_expense_receipts",
    "cash_box_expenses",
    "cash_box_initial_balances",
    "cash_box_period_starts",
    "client_documents",
    "client_location_history",
    "route_client_assignments",
    "route_collector_assignments",
    "daily_visit_snapshots",
    "rule_evaluation_logs",
    "notification_jobs",
    "notifications",
    "sync_events",
    "idempotency_keys",
    "clients",
    "routes",
    "business_rules",
    "non_working_days",
    "audit_logs",
    "device_push_tokens",
    "refresh_tokens",
  ];

  try {
    await dataSource.query("BEGIN");

    for (const table of tables) {
      await dataSource.query(`DELETE FROM ${table}`);
    }

    await dataSource.query(`
      DELETE FROM collector_profiles
      WHERE user_id IN (
        SELECT u.id FROM users u
        INNER JOIN user_roles ur ON ur.user_id = u.id
        INNER JOIN roles r ON r.id = ur.role_id
        WHERE r.code = 'collector'
      )
    `);

    await dataSource.query(`
      DELETE FROM user_roles
      WHERE user_id IN (
        SELECT u.id FROM users u
        INNER JOIN user_roles ur2 ON ur2.user_id = u.id
        INNER JOIN roles r ON r.id = ur2.role_id
        WHERE r.code = 'collector'
      )
    `);

    await dataSource.query(`
      DELETE FROM users
      WHERE id IN (
        SELECT u.id FROM users u
        INNER JOIN user_roles ur ON ur.user_id = u.id
        INNER JOIN roles r ON r.id = ur.role_id
        WHERE r.code = 'collector'
      )
    `);

    await dataSource.query("COMMIT");
    console.log("Business data cleared. Run pnpm bootstrap:admin if admin is missing.");
  } catch (error) {
    await dataSource.query("ROLLBACK");
    throw error;
  } finally {
    await dataSource.destroy();
  }
}

void resetDatabase().catch((error: unknown) => {
  console.error("Database reset failed:", error);
  process.exit(1);
});
