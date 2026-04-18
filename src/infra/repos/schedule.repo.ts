import { sql } from "../db/pool";
import type { Schedule, Recurrence } from "../../types";

export interface CreateScheduleInput {
  user_id: string;
  name: string | null;
  message: string;
  recurrence: Recurrence;
  cron_expr: string | null;
  run_at: string | null;
  timezone: string;
}

export const createSchedule = async (input: CreateScheduleInput): Promise<Schedule> => {
  const rows = await sql`
    INSERT INTO schedules (user_id, name, message, recurrence, cron_expr, run_at, timezone)
    VALUES (${input.user_id}, ${input.name}, ${input.message}, ${input.recurrence},
            ${input.cron_expr}, ${input.run_at}, ${input.timezone})
    RETURNING *
  ` as Schedule[];
  return rows[0]!;
};

export const listSchedules = async (userId: string): Promise<Schedule[]> => {
  return await sql`
    SELECT * FROM schedules WHERE user_id = ${userId} ORDER BY created_at DESC
  ` as Schedule[];
};

export const getSchedule = async (id: string, userId: string): Promise<Schedule | null> => {
  const rows = await sql`
    SELECT * FROM schedules WHERE id = ${id} AND user_id = ${userId}
  ` as Schedule[];
  return rows[0] ?? null;
};

export const getScheduleById = async (id: string): Promise<Schedule | null> => {
  const rows = await sql`
    SELECT * FROM schedules WHERE id = ${id}
  ` as Schedule[];
  return rows[0] ?? null;
};

export interface UpdateScheduleInput {
  name?: string | null;
  message?: string;
  recurrence?: Recurrence;
  cron_expr?: string | null;
  run_at?: string | null;
  timezone?: string;
  is_active?: boolean;
}

export const updateSchedule = async (
  id: string,
  userId: string,
  patch: UpdateScheduleInput,
): Promise<Schedule | null> => {
  const rows = await sql`
    UPDATE schedules SET
      name        = COALESCE(${patch.name        ?? null}, name),
      message     = COALESCE(${patch.message     ?? null}, message),
      recurrence  = COALESCE(${patch.recurrence  ?? null}, recurrence),
      cron_expr   = CASE WHEN ${patch.cron_expr !== undefined} THEN ${patch.cron_expr ?? null} ELSE cron_expr END,
      run_at      = CASE WHEN ${patch.run_at !== undefined} THEN ${patch.run_at ?? null} ELSE run_at END,
      timezone    = COALESCE(${patch.timezone    ?? null}, timezone),
      is_active   = COALESCE(${patch.is_active   ?? null}, is_active),
      updated_at  = NOW()
    WHERE id = ${id} AND user_id = ${userId}
    RETURNING *
  ` as Schedule[];
  return rows[0] ?? null;
};

export const deleteSchedule = async (id: string, userId: string): Promise<boolean> => {
  const rows = await sql`
    DELETE FROM schedules WHERE id = ${id} AND user_id = ${userId} RETURNING id
  ` as { id: string }[];
  return rows.length > 0;
};
