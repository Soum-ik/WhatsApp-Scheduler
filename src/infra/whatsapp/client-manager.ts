import makeWASocket, {
  DisconnectReason,
  fetchLatestBaileysVersion,
} from "@whiskeysockets/baileys";
import type { WASocket } from "@whiskeysockets/baileys";
import { EventEmitter } from "node:events";
import { createDbAuthState } from "./db-auth-state";
import * as sessionRepo from "../repos/whatsapp-session.repo";
import { createLogger } from "../../shared/logger";

const log = createLogger("client-manager");

type Entry = {
  socket: WASocket;
  events: EventEmitter;      // emits 'qr' (string), 'connected', 'closed'
  lastQr: string | null;
  status: "qr" | "connecting" | "connected" | "closed";
};

const clients = new Map<string, Entry>();
const connecting = new Set<string>();

export const getClient = (userId: string): Entry | undefined => clients.get(userId);

export const isConnected = (userId: string): boolean =>
  clients.get(userId)?.status === "connected";

const buildSocket = async (userId: string): Promise<Entry> => {
  const events = new EventEmitter();
  const { state, saveCreds } = await createDbAuthState(userId);
  const { version } = await fetchLatestBaileysVersion();

  const socket = makeWASocket({ version, auth: state });

  const entry: Entry = { socket, events, lastQr: null, status: "connecting" };

  socket.ev.on("creds.update", saveCreds);

  socket.ev.on("connection.update", async (update) => {
    const { connection, lastDisconnect, qr } = update;

    if (qr) {
      entry.lastQr = qr;
      entry.status = "qr";
      await sessionRepo.updateStatus(userId, "qr");
      events.emit("qr", qr);
    }

    if (connection === "open") {
      entry.lastQr = null;
      entry.status = "connected";
      await sessionRepo.updateStatus(userId, "connected");
      events.emit("connected");
      log.info(`user=${userId} connected`);
    }

    if (connection === "close") {
      const reason = (lastDisconnect?.error as { output?: { statusCode?: number } } | undefined)?.output?.statusCode;
      const loggedOut = reason === DisconnectReason.loggedOut;
      entry.status = "closed";
      events.emit("closed", { loggedOut });
      clients.delete(userId);
      log.warn(`user=${userId} closed (reason=${reason}, loggedOut=${loggedOut})`);

      if (loggedOut) {
        await sessionRepo.clearSession(userId);
      } else {
        await sessionRepo.updateStatus(userId, "disconnected");
      }
    }
  });

  return entry;
};

export const startConnect = async (userId: string): Promise<Entry> => {
  const existing = clients.get(userId);
  if (existing && existing.status !== "closed") return existing;
  if (connecting.has(userId)) {
    while (connecting.has(userId)) await new Promise((r) => setTimeout(r, 50));
    return clients.get(userId)!;
  }

  connecting.add(userId);
  try {
    const entry = await buildSocket(userId);
    clients.set(userId, entry);
    return entry;
  } finally {
    connecting.delete(userId);
  }
};

export const ensureConnected = async (userId: string): Promise<WASocket | null> => {
  const row = await sessionRepo.getSession(userId);
  if (!row?.creds) return null;

  const existing = clients.get(userId);
  if (existing?.status === "connected") return existing.socket;

  const entry = await startConnect(userId);
  const ok = await new Promise<boolean>((resolve) => {
    const t = setTimeout(() => resolve(false), 20_000);
    entry.events.once("connected", () => { clearTimeout(t); resolve(true); });
    entry.events.once("closed", () => { clearTimeout(t); resolve(false); });
    if (entry.status === "connected") { clearTimeout(t); resolve(true); }
  });
  return ok ? entry.socket : null;
};

export const disconnect = async (userId: string): Promise<void> => {
  const entry = clients.get(userId);
  if (!entry) return;
  try {
    await entry.socket.logout();
  } catch {}
  try {
    entry.socket.end(undefined);
  } catch {}
  clients.delete(userId);
};

export const shutdown = async (): Promise<void> => {
  for (const [userId, entry] of clients) {
    try {
      entry.socket.end(undefined);
    } catch {}
    clients.delete(userId);
  }
};
