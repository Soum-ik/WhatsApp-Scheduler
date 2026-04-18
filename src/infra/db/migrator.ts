import { sql } from "./pool";
import { readdir, readFile } from "node:fs/promises";
import { join } from "node:path";
import { $ } from "bun";
const MIGRATIONS_DIR = join(process.cwd(), "migrations");

async function ensureMigrationsTable() {
  await sql`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      version TEXT PRIMARY KEY,
      applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `;
}

async function getAppliedMigrations(): Promise<Set<string>> {
  const rows = await sql`SELECT version FROM schema_migrations`;
  return new Set(rows.map((r: { version: string }) => r.version));
}

async function getMigrationFiles(): Promise<string[]> {
  const files = await readdir(MIGRATIONS_DIR);
  return files.filter(f => f.endsWith(".sql")).sort();
}

export async function migrate() {
  await ensureMigrationsTable();
  const applied = await getAppliedMigrations();
  const files = await getMigrationFiles();

  const pending = files.filter(f => !applied.has(f));

  if (pending.length === 0) {
    console.log("No pending migrations");
    return;
  }

  for (const file of pending) {
    console.log(`Applying ${file}...`);
    const content = await readFile(join(MIGRATIONS_DIR, file), "utf-8");

    await sql.begin(async (tx) => {
      await tx.unsafe(content);
      await tx`INSERT INTO schema_migrations (version) VALUES (${file})`;
    });

    console.log(`✓ Applied ${file}`);
  }

  console.log(`Applied ${pending.length} migration(s)`);
  await $`npm run db:dump`;
}

// Run directly: bun run src/infra/db/migrator.ts
if (import.meta.main) {
  migrate()
    .then(() => process.exit(0))
    .catch(err => {
      console.error("Migration failed:", err);
      process.exit(1);
    });
}