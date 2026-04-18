import * as clientManager from "../infra/whatsapp/client-manager";
import * as sessionRepo from "../infra/repos/whatsapp-session.repo";
import { sendTextToUser } from "../infra/whatsapp/sender";
import { toE164 } from "../shared/phone";
import { conflict } from "../shared/errors";

export const startConnect = async (userId: string) => {
  const entry = await clientManager.startConnect(userId);
  return entry;
};

export const getStatus = async (userId: string) => {
  const row = await sessionRepo.getSession(userId);
  const live = clientManager.getClient(userId);
  return {
    status: live?.status ?? row?.status ?? "disconnected",
    hasCreds: Boolean(row?.creds),
    connectedAt: row?.connected_at ?? null,
  };
};

export const disconnect = async (userId: string) => {
  await clientManager.disconnect(userId);
  await sessionRepo.updateStatus(userId, "disconnected");
};

export interface SendResult {
  phone: string;
  status: "sent" | "failed";
  error?: string;
}

const jitter = () => new Promise((r) => setTimeout(r, 500 + Math.random() * 1500));

export const sendNow = async (
  userId: string,
  recipients: string[],
  message: string,
): Promise<SendResult[]> => {
  const socket = await clientManager.ensureConnected(userId);
  if (!socket) throw conflict("WhatsApp not connected");

  const results: SendResult[] = [];
  for (let i = 0; i < recipients.length; i++) {
    console.log(`Sending message to ${recipients[i]} for user ${userId} (index ${i + 1}/${recipients.length})`);
    const phone = recipients[i]!.trim();
    if (!phone) {
      results.push({ phone, status: "failed", error: "Invalid phone number" });
      continue;
    }
    try {
      const e164 = toE164(phone);
      await sendTextToUser(userId, e164, message);
      results.push({ phone, status: "sent" });
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      results.push({ phone, status: "failed", error: msg });
    }
    if (i < recipients.length - 1) await jitter();
  }
  return results;
};
