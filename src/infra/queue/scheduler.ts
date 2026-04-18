import { Queue } from "bullmq";
import { redis } from "./connection";
import type { Schedule } from "../../types";

export const QUEUE_NAME = "schedule-run";
export const JOB_NAME = "run";

export interface ScheduleJobData {
  scheduleId: string;
}

export const queue = new Queue<ScheduleJobData>(QUEUE_NAME, {
  connection: redis,
  defaultJobOptions: {
    removeOnComplete: { age: 3600, count: 1000 },
    removeOnFail: { age: 24 * 3600 },
  },
});

export const upsertScheduleJob = async (schedule: Schedule): Promise<void> => {
  await removeScheduleJob(schedule.id);

  if (schedule.recurrence === "once") {
    if (!schedule.run_at) throw new Error("run_at required for once schedule");
    const delay = new Date(schedule.run_at).getTime() - Date.now();
    if (delay < 0) return;
    await queue.add(
      JOB_NAME,
      { scheduleId: schedule.id },
      { jobId: schedule.id, delay },
    );
    return;
  }

  if (!schedule.cron_expr) throw new Error("cron_expr required for recurring schedule");
  await queue.upsertJobScheduler(
    schedule.id,
    { pattern: schedule.cron_expr, tz: schedule.timezone },
    { name: JOB_NAME, data: { scheduleId: schedule.id } },
  );
};

export const removeScheduleJob = async (scheduleId: string): Promise<void> => {
  try {
    await queue.removeJobScheduler(scheduleId);
  } catch {}
  try {
    const job = await queue.getJob(scheduleId);
    if (job) await job.remove();
  } catch {}
};
