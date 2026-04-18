import { writeFile } from "node:fs/promises";
import { join } from "node:path";
import { $ } from "bun";

const name = process.argv[2];
if (!name) {
  console.error("Usage: bun run scripts/new-migration.ts <name>");
  process.exit(1);
}

const timestamp = new Date().toISOString().replace(/[-:.TZ]/g, "").slice(0, 14);
const filename = `${timestamp}_${name}.sql`;
const path = join(process.cwd(), "migrations", filename);
await writeFile(path, `-- Migration: ${name}\n-- Created: ${new Date().toISOString()}\n\n`);
console.log(`Created ${filename}`);
await $`npm run db:dump`;