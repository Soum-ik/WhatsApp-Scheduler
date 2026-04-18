import * as scheduleRepo from "../infra/repos/schedule.repo";
import * as recipientRepo from "../infra/repos/recipient.repo";
import * as runRepo from "../infra/repos/run.repo";
import { ensureConnected } from "../infra/whatsapp/client-manager";
import { sendTextToUser } from "../infra/whatsapp/sender";
import { createLogger } from "../shared/logger";

const log = createLogger("run-schedule");

const jitter = () => new Promise((r) => setTimeout(r, 500 + Math.random() * 1500));

export const runSchedule = async (scheduleId: string): Promise<void> => {
  const schedule = await scheduleRepo.getScheduleById(scheduleId);
  if (!schedule || !schedule.is_active) {
    log.warn(`schedule ${scheduleId} missing or inactive, skipping`);
    return;
  }
  const recipients = await recipientRepo.listRecipients(scheduleId);
  if (recipients.length === 0) return;

  const socket = await ensureConnected(schedule.user_id);
  if (!socket) {
    for (const r of recipients) {
      await runRepo.recordRun(scheduleId, r.id, "skipped_offline", "user socket offline");
    }
    log.warn(`schedule ${scheduleId} skipped: user ${schedule.user_id} offline`);
    return;
  }

  for (const r of recipients) {
    try {
      await sendTextToUser(schedule.user_id, r.phone_number, schedule.message);
      await runRepo.recordRun(scheduleId, r.id, "sent");
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      await runRepo.recordRun(scheduleId, r.id, "failed", msg);
      log.error(`send failed schedule=${scheduleId} recipient=${r.id}`, msg);
    }
    await jitter();
  }
};
