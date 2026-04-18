import { toJid } from "../../shared/phone";
import { ensureConnected, getClient } from "./client-manager";

export const sendTextToUser = async (
  userId: string,
  e164: string,
  text: string,
): Promise<void> => {
  const socket = await ensureConnected(userId);
  if (!socket) throw new Error("WhatsApp not connected");
  await socket.sendMessage(toJid(e164), { text });
};

export const validateRecipient = async (
  userId: string,
  e164: string,
): Promise<boolean> => {
  const entry = getClient(userId);
  if (!entry || entry.status !== "connected") {
    const socket = await ensureConnected(userId);
    if (!socket) throw new Error("WhatsApp not connected");
    const results = await socket.onWhatsApp(e164);
    return Boolean(results?.[0]?.exists);
  }
  const results = await entry.socket.onWhatsApp(e164);
  return Boolean(results?.[0]?.exists);
};
