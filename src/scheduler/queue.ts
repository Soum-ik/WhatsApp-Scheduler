import { Queue } from "bullmq";
import Redis from "ioredis";

// Redis connection configuration
const redisConnection = new Redis({
  host: process.env.REDIS_HOST || "localhost",
  port: parseInt(process.env.REDIS_PORT || "6379"),
  maxRetriesPerRequest: null,
});

// Create BullMQ queue for scheduled messages
export const messageQueue = new Queue("whatsapp-messages", {
  connection: redisConnection,
  defaultJobOptions: {
    attempts: 3,
    backoff: {
      type: "exponential",
      delay: 2000,
    },
    removeOnComplete: true,
    removeOnFail: false,
  },
});

export interface MessageJobData {
  messageId: number;
  phoneNumber: string;
  message: string;
}

/**
 * Schedule a message to be sent at a specific time
 * @param data - Message data including phone number and message text
 * @param scheduledTime - When to send the message
 * @returns Job ID
 */
export const scheduleMessage = async (
  data: MessageJobData,
  scheduledTime: Date
) => {
  const delay = scheduledTime.getTime() - Date.now();

  if (delay < 0) {
    throw new Error("Scheduled time must be in the future");
  }

  const job = await messageQueue.add(
    "send-message",
    data,
    {
      delay,
      jobId: `msg-${data.messageId}-${Date.now()}`,
    }
  );

  console.log(`📅 Message scheduled with job ID: ${job.id}`);
  return job.id;
};

/**
 * Cancel a scheduled message
 * @param jobId - The job ID to cancel
 */
export const cancelScheduledMessage = async (jobId: string) => {
  const job = await messageQueue.getJob(jobId);

  if (!job) {
    throw new Error("Job not found");
  }

  await job.remove();
  console.log(`❌ Cancelled job: ${jobId}`);
};

export default messageQueue;
