import { sql } from "../db/pool";
import type { SessionStatus } from "../../types";

export interface SessionRow {
  user_id: string;
  creds: unknown | null;
  status: SessionStatus;
  connected_at: string | null;
}

export const getSession = async (userId: string): Promise<SessionRow | null> => {
  const rows = await sql`
    SELECT user_id, creds, status, connected_at
    FROM whatsapp_sessions WHERE user_id = ${userId}
  ` as SessionRow[];
  return rows[0] ?? null;
};

export const upsertCreds = async (userId: string, creds: unknown): Promise<void> => {
  await sql`
    INSERT INTO whatsapp_sessions (user_id, creds, updated_at)
    VALUES (${userId}, ${JSON.stringify(creds)}::jsonb, NOW())
    ON CONFLICT (user_id) DO UPDATE
      SET creds = EXCLUDED.creds, updated_at = NOW()
  `;
};

export const updateStatus = async (
  userId: string,
  status: SessionStatus,
): Promise<void> => {
  if (status === "connected") {
    await sql`
      INSERT INTO whatsapp_sessions (user_id, status, connected_at, updated_at)
      VALUES (${userId}, ${status}, NOW(), NOW())
      ON CONFLICT (user_id) DO UPDATE
        SET status = EXCLUDED.status, connected_at = NOW(), updated_at = NOW()
    `;
  } else {
    await sql`
      INSERT INTO whatsapp_sessions (user_id, status, updated_at)
      VALUES (${userId}, ${status}, NOW())
      ON CONFLICT (user_id) DO UPDATE
        SET status = EXCLUDED.status, updated_at = NOW()
    `;
  }
};

export const clearSession = async (userId: string): Promise<void> => {
  await sql.begin(async (tx) => {
    await tx`DELETE FROM whatsapp_signal_keys WHERE user_id = ${userId}`;
    await tx`DELETE FROM whatsapp_sessions WHERE user_id = ${userId}`;
  });
};

export const getSignalKeys = async (
  userId: string,
  type: string,
  ids: string[],
): Promise<Record<string, unknown>> => {
  if (ids.length === 0) return {};
  const rows = await sql`
    SELECT key_id, value FROM whatsapp_signal_keys
    WHERE user_id = ${userId} AND type = ${type} AND key_id = ANY(${ids}::text[])
  ` as { key_id: string; value: unknown }[];
  const out: Record<string, unknown> = {};
  for (const r of rows) out[r.key_id] = r.value;
  return out;
};

export const setSignalKeys = async (
  userId: string,
  type: string,
  entries: Array<{ key_id: string; value: unknown | null }>,
): Promise<void> => {
  if (entries.length === 0) return;
  await sql.begin(async (tx) => {
    for (const e of entries) {
      if (e.value === null) {
        await tx`
          DELETE FROM whatsapp_signal_keys
          WHERE user_id = ${userId} AND type = ${type} AND key_id = ${e.key_id}
        `;
      } else {
        await tx`
          INSERT INTO whatsapp_signal_keys (user_id, type, key_id, value)
          VALUES (${userId}, ${type}, ${e.key_id}, ${JSON.stringify(e.value)}::jsonb)
          ON CONFLICT (user_id, type, key_id) DO UPDATE
            SET value = EXCLUDED.value
        `;
      }
    }
  });
};
