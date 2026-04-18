import { Worker } from "bullmq";
import { redis } from "./connection";
import { QUEUE_NAME, type ScheduleJobData } from "./scheduler";
import { runSchedule } from "../../services/run-schedule.service";
import { createLogger } from "../../shared/logger";

const log = createLogger("worker");

export const startWorker = (): Worker<ScheduleJobData> => {
  const worker = new Worker<ScheduleJobData>(
    QUEUE_NAME,
    async (job) => {
      await runSchedule(job.data.scheduleId);
    },
    {
      connection: redis,
      concurrency: 5,
      limiter: { max: 20, duration: 1000 },
    },
  );

  worker.on("completed", (job) => {
    log.info(`job ${job.id} completed (schedule=${job.data.scheduleId})`);
  });
  worker.on("failed", (job, err) => {
    log.error(`job ${job?.id} failed`, err.message);
  });
  worker.on("error", (err) => {
    log.error("worker error", err);
  });

  log.info("worker started");
  return worker;
};
