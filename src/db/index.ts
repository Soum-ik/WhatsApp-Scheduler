import { sql } from "bun";

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL is not set");
}

await sql`
  CREATE TABLE IF NOT EXISTS scheduled_messages (
    id BIGSERIAL PRIMARY KEY,
    phone_number TEXT NOT NULL,
    message TEXT NOT NULL,
    scheduled_time TIMESTAMPTZ NOT NULL,
    status TEXT DEFAULT 'pending',
    job_id TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    sent_at TIMESTAMPTZ
  )
`;

export interface ScheduledMessage {
  id?: number;
  phone_number: string;
  message: string;
  scheduled_time: string;
  status?: string;
  job_id?: string | null;
  created_at?: string;
  sent_at?: string | null;
}

export const insertScheduledMessage = async (
  data: Omit<ScheduledMessage, "id" | "created_at" | "sent_at">
): Promise<{ id: number }> => {
  const rows = await sql`
    INSERT INTO scheduled_messages (phone_number, message, scheduled_time, job_id, status)
    VALUES (
      ${data.phone_number},
      ${data.message},
      ${data.scheduled_time},
      ${data.job_id ?? null},
      ${data.status ?? "pending"}
    )
    RETURNING id
  `;
  return { id: Number(rows[0].id) };
};

export const updateMessageStatus = async (
  id: number,
  status: string,
  sentAt?: string
) => {
  await sql`
    UPDATE scheduled_messages
    SET status = ${status}, sent_at = ${sentAt ?? null}
    WHERE id = ${id}
  `;
};

export const updateMessageJobId = async (id: number, jobId: string) => {
  await sql`
    UPDATE scheduled_messages
    SET job_id = ${jobId}
    WHERE id = ${id}
  `;
};

export const getScheduledMessages = async (
  status?: string
): Promise<ScheduledMessage[]> => {
  if (status) {
    return (await sql`
      SELECT * FROM scheduled_messages
      WHERE status = ${status}
      ORDER BY scheduled_time ASC
    `) as ScheduledMessage[];
  }
  return (await sql`
    SELECT * FROM scheduled_messages
    ORDER BY scheduled_time ASC
  `) as ScheduledMessage[];
};

export const getMessageById = async (
  id: number
): Promise<ScheduledMessage | null> => {
  const rows = (await sql`
    SELECT * FROM scheduled_messages WHERE id = ${id}
  `) as ScheduledMessage[];
  return rows[0] ?? null;
};

export const deleteMessage = async (id: number) => {
  await sql`DELETE FROM scheduled_messages WHERE id = ${id}`;
};

export default sql;
