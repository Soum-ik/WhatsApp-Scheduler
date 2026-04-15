import { Worker, Job } from "bullmq";
import Redis from "ioredis";
import { sendMessage } from "../whatsapp/sender";
import { updateMessageStatus } from "../db";
import type { MessageJobData } from "./queue";

// Redis connection for worker
const redisConnection = new Redis({
  host: process.env.REDIS_HOST || "localhost",
  port: parseInt(process.env.REDIS_PORT || "6379"),
  maxRetriesPerRequest: null,
});

// Process jobs from the queue
const processMessage = async (job: Job<MessageJobData>) => {
  const { messageId, phoneNumber, message } = job.data;

  console.log(`\n🔄 Processing job ${job.id} for message ${messageId}`);

  try {
    await sendMessage({ phoneNumber, message });

    await updateMessageStatus(messageId, "sent", new Date().toISOString());

    console.log(`✅ Message ${messageId} sent successfully`);
    return { success: true, messageId };
  } catch (error) {
    console.error(`❌ Failed to send message ${messageId}:`, error);

    await updateMessageStatus(messageId, "failed");

    throw error;
  }
};

// Create worker instance
export const messageWorker = new Worker<MessageJobData>(
  "whatsapp-messages",
  processMessage,
  {
    connection: redisConnection,
    concurrency: 5, // Process up to 5 messages concurrently
  }
);

// Worker event listeners
messageWorker.on("completed", (job) => {
  console.log(`✅ Job ${job.id} completed`);
});

messageWorker.on("failed", (job, err) => {
  console.error(`❌ Job ${job?.id} failed:`, err.message);
});

messageWorker.on("error", (err) => {
  console.error("⚠️  Worker error:", err);
});

console.log("👷 Message worker started and waiting for jobs...");

export default messageWorker;
