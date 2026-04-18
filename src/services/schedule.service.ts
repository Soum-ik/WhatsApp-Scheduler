import * as scheduleRepo from "../infra/repos/schedule.repo";
import * as recipientRepo from "../infra/repos/recipient.repo";
import * as runRepo from "../infra/repos/run.repo";
import { upsertScheduleJob, removeScheduleJob } from "../infra/queue/scheduler";
import { validateRecipient } from "../infra/whatsapp/sender";
import { toE164 } from "../shared/phone";
import { badRequest, notFound } from "../shared/errors";
import type { Recurrence } from "../types";

export interface CreateInput {
  name?: string;
  message: string;
  recipients: string[];
  recurrence: Recurrence;
  time?: string;            // 'HH:mm' for recurring
  dayOfWeek?: number;       // 0-6 for weekly
  dayOfMonth?: number;      // 1-31 for monthly
  runAt?: string;           // ISO for once
  timezone?: string;
}

const parseHHmm = (value: string): { hh: number; mm: number } => {
  const match = /^(\d{1,2}):(\d{2})$/.exec(value);
  if (!match) throw badRequest("time must be HH:mm");
  const hh = Number(match[1]);
  const mm = Number(match[2]);
  if (hh < 0 || hh > 23 || mm < 0 || mm > 59) throw badRequest("time out of range");
  return { hh, mm };
};

export const cronFor = (input: {
  recurrence: Recurrence;
  time?: string;
  dayOfWeek?: number;
  dayOfMonth?: number;
}): string | null => {
  switch (input.recurrence) {
    case "once":
      return null;
    case "daily": {
      if (!input.time) throw badRequest("time required for daily");
      const { hh, mm } = parseHHmm(input.time);
      return `${mm} ${hh} * * *`;
    }
    case "weekly": {
      if (!input.time) throw badRequest("time required for weekly");
      if (input.dayOfWeek === undefined || input.dayOfWeek < 0 || input.dayOfWeek > 6) {
        throw badRequest("dayOfWeek required (0-6) for weekly");
      }
      const { hh, mm } = parseHHmm(input.time);
      return `${mm} ${hh} * * ${input.dayOfWeek}`;
    }
    case "monthly": {
      if (!input.time) throw badRequest("time required for monthly");
      if (input.dayOfMonth === undefined || input.dayOfMonth < 1 || input.dayOfMonth > 31) {
        throw badRequest("dayOfMonth required (1-31) for monthly");
      }
      const { hh, mm } = parseHHmm(input.time);
      return `${mm} ${hh} ${input.dayOfMonth} * *`;
    }
  }
};

const normalizeRecipients = (raw: string[]): string[] => {
  if (!Array.isArray(raw) || raw.length === 0) {
    throw badRequest("recipients must be a non-empty array");
  }
  const e164s = raw.map(toE164);
  return Array.from(new Set(e164s));
};

export const createSchedule = async (userId: string, input: CreateInput) => {
  const cron = cronFor(input);
  const runAt = input.recurrence === "once"
    ? (input.runAt ? new Date(input.runAt).toISOString() : null)
    : null;

  if (input.recurrence === "once") {
    if (!runAt) throw badRequest("runAt required for once");
    if (new Date(runAt).getTime() <= Date.now()) throw badRequest("runAt must be in the future");
  }

  const phones = normalizeRecipients(input.recipients);

  for (const phone of phones) {
    const ok = await validateRecipient(userId, phone).catch(() => false);
    if (!ok) throw badRequest(`recipient not on WhatsApp: ${phone}`);
  }

  const schedule = await scheduleRepo.createSchedule({
    user_id: userId,
    name: input.name ?? null,
    message: input.message,
    recurrence: input.recurrence,
    cron_expr: cron,
    run_at: runAt,
    timezone: input.timezone ?? "UTC",
  });
  const recipients = await recipientRepo.addRecipients(schedule.id, phones);
  await upsertScheduleJob(schedule);
  return { ...schedule, recipients };
};

export const listSchedules = async (userId: string) => {
  const schedules = await scheduleRepo.listSchedules(userId);
  const withRecipients = await Promise.all(
    schedules.map(async (s) => ({
      ...s,
      recipients: await recipientRepo.listRecipients(s.id),
    })),
  );
  return withRecipients;
};

export const getSchedule = async (userId: string, id: string) => {
  const schedule = await scheduleRepo.getSchedule(id, userId);
  if (!schedule) throw notFound("Schedule not found");
  const recipients = await recipientRepo.listRecipients(id);
  return { ...schedule, recipients };
};

export interface UpdateInput extends Partial<CreateInput> {
  isActive?: boolean;
}

export const updateSchedule = async (userId: string, id: string, patch: UpdateInput) => {
  const existing = await scheduleRepo.getSchedule(id, userId);
  if (!existing) throw notFound("Schedule not found");

  const recurrence = patch.recurrence ?? existing.recurrence;
  const merged = {
    recurrence,
    time: patch.time,
    dayOfWeek: patch.dayOfWeek,
    dayOfMonth: patch.dayOfMonth,
  };

  let cronExpr: string | null | undefined = undefined;
  let runAt: string | null | undefined = undefined;

  if (patch.recurrence || patch.time || patch.dayOfWeek !== undefined || patch.dayOfMonth !== undefined) {
    cronExpr = cronFor(merged);
  }
  if (patch.runAt !== undefined || (patch.recurrence && patch.recurrence === "once")) {
    runAt = patch.runAt ? new Date(patch.runAt).toISOString() : null;
  }

  const updated = await scheduleRepo.updateSchedule(id, userId, {
    name: patch.name,
    message: patch.message,
    recurrence: patch.recurrence,
    cron_expr: cronExpr,
    run_at: runAt,
    timezone: patch.timezone,
    is_active: patch.isActive,
  });
  if (!updated) throw notFound("Schedule not found");

  if (patch.recipients) {
    const phones = normalizeRecipients(patch.recipients);
    for (const phone of phones) {
      const ok = await validateRecipient(userId, phone).catch(() => false);
      if (!ok) throw badRequest(`recipient not on WhatsApp: ${phone}`);
    }
    await recipientRepo.replaceRecipients(id, phones);
  }

  if (updated.is_active) {
    await upsertScheduleJob(updated);
  } else {
    await removeScheduleJob(id);
  }

  const recipients = await recipientRepo.listRecipients(id);
  return { ...updated, recipients };
};

export const deleteSchedule = async (userId: string, id: string) => {
  const existing = await scheduleRepo.getSchedule(id, userId);
  if (!existing) throw notFound("Schedule not found");
  await removeScheduleJob(id);
  await scheduleRepo.deleteSchedule(id, userId);
};

export const listRuns = async (userId: string, scheduleId: string) => {
  const existing = await scheduleRepo.getSchedule(scheduleId, userId);
  if (!existing) throw notFound("Schedule not found");
  return runRepo.listRunsForSchedule(scheduleId);
};
