import { sql } from "../db/pool";
import type { ScheduledMessageRun, RunStatus } from "../../types";

export const recordRun = async (
  scheduleId: string,
  recipientId: string,
  status: RunStatus,
  error: string | null = null,
): Promise<ScheduledMessageRun> => {
  const sentAt = status === "sent" ? new Date().toISOString() : null;
  const rows = await sql`
    INSERT INTO scheduled_message_runs (schedule_id, recipient_id, status, error, sent_at)
    VALUES (${scheduleId}, ${recipientId}, ${status}, ${error}, ${sentAt})
    RETURNING *
  ` as ScheduledMessageRun[];
  return rows[0]!;
};

export const listRunsForSchedule = async (scheduleId: string): Promise<ScheduledMessageRun[]> => {
  return await sql`
    SELECT * FROM scheduled_message_runs
    WHERE schedule_id = ${scheduleId}
    ORDER BY created_at DESC
    LIMIT 200
  ` as ScheduledMessageRun[];
};
