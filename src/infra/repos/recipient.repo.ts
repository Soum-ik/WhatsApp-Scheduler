import { sql } from "../db/pool";
import type { ScheduleRecipient } from "../../types";

export const addRecipients = async (
  scheduleId: string,
  phones: string[],
): Promise<ScheduleRecipient[]> => {
  if (phones.length === 0) return [];
  const out: ScheduleRecipient[] = [];
  for (const phone of phones) {
    const rows = await sql`
      INSERT INTO schedule_recipients (schedule_id, phone_number)
      VALUES (${scheduleId}, ${phone})
      ON CONFLICT (schedule_id, phone_number) DO UPDATE SET phone_number = EXCLUDED.phone_number
      RETURNING id, schedule_id, phone_number
    ` as ScheduleRecipient[];
    out.push(rows[0]!);
  }
  return out;
};

export const listRecipients = async (scheduleId: string): Promise<ScheduleRecipient[]> => {
  return await sql`
    SELECT id, schedule_id, phone_number FROM schedule_recipients WHERE schedule_id = ${scheduleId}
  ` as ScheduleRecipient[];
};

export const replaceRecipients = async (
  scheduleId: string,
  phones: string[],
): Promise<ScheduleRecipient[]> => {
  return await sql.begin(async (tx) => {
    await tx`DELETE FROM schedule_recipients WHERE schedule_id = ${scheduleId}`;
    const out: ScheduleRecipient[] = [];
    for (const phone of phones) {
      const rows = await tx`
        INSERT INTO schedule_recipients (schedule_id, phone_number)
        VALUES (${scheduleId}, ${phone})
        RETURNING id, schedule_id, phone_number
      ` as ScheduleRecipient[];
      out.push(rows[0]!);
    }
    return out;
  });
};
