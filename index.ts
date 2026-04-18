import { env } from "./src/config/env";
import { migrate } from "./src/infra/db/migrator";
import { createServer } from "./src/http/server";
import { startWorker } from "./src/infra/queue/worker";
import { queue } from "./src/infra/queue/scheduler";
import { redis } from "./src/infra/queue/connection";
import * as clientManager from "./src/infra/whatsapp/client-manager";
import { createLogger } from "./src/shared/logger";

const log = createLogger("boot");

let ready = false;
const app = createServer({ isReady: () => ready });
const server = app.listen(env.PORT, () => log.info(`listening on :${env.PORT}`));

let worker: Awaited<ReturnType<typeof startWorker>> | null = null;

(async () => {
  await migrate();
  worker = startWorker();
  ready = true;
  log.info("ready");
})().catch((err) => {
  log.error("boot failed", err);
  process.exit(1);
});

const shutdown = async (signal: string) => {
  log.info(`received ${signal}, shutting down`);
  server.close();
  try { await worker?.close(); } catch (e) { log.warn("worker close", e); }
  try { await queue.close(); } catch (e) { log.warn("queue close", e); }
  try { await clientManager.shutdown(); } catch (e) { log.warn("wa shutdown", e); }
  try { redis.disconnect(); } catch (e) { log.warn("redis disconnect", e); }
  process.exit(0);
};

process.on("SIGTERM", () => void shutdown("SIGTERM"));
process.on("SIGINT", () => void shutdown("SIGINT"));
