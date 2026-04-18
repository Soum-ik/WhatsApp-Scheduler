import * as clientManager from "../infra/whatsapp/client-manager";
import * as sessionRepo from "../infra/repos/whatsapp-session.repo";

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
