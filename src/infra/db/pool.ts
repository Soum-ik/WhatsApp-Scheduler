import { SQL } from "bun";
import { env } from "../../config/env";

export const sql = new SQL(env.DATABASE_URL, {
  max: 20,              // max connections in pool
  idleTimeout: 30,      // seconds before idle connection closes
  connectionTimeout: 10 // seconds to wait for a connection
});

// Graceful shutdown
export async function closePool() {
  await sql.end();
}