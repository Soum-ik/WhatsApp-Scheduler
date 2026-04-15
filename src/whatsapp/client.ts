import makeWASocket, {
  DisconnectReason,
  useMultiFileAuthState,
  fetchLatestBaileysVersion,
} from "@whiskeysockets/baileys";
import qrcode from "qrcode-terminal";
import type { WASocket } from "@whiskeysockets/baileys";

let sock: WASocket | null = null;
let isConnected = false;
let isConnecting = false;

export const connectToWhatsApp = async () => {
  if (isConnecting) return sock;
  isConnecting = true;

  if (sock) {
    try {
      sock.ev.removeAllListeners("connection.update");
      sock.ev.removeAllListeners("creds.update");
      sock.end(undefined);
    } catch {}
    sock = null;
  }

  const { state, saveCreds } = await useMultiFileAuthState("./sessions");
  const { version } = await fetchLatestBaileysVersion();

  const newSock = makeWASocket({
    version,
    auth: state,
    printQRInTerminal: false,
  });
  sock = newSock;

  newSock.ev.on("creds.update", saveCreds);

  newSock.ev.on("connection.update", async (update) => {
    if (newSock !== sock) return;

    const { connection, lastDisconnect, qr } = update;

    if (qr) {
      console.log("\n📱 Scan this QR code with WhatsApp:");
      qrcode.generate(qr, { small: true });
    }

    if (connection === "close") {
      const reason = (lastDisconnect?.error as any)?.output?.statusCode;
      const shouldReconnect = reason !== DisconnectReason.loggedOut;

      console.log(
        "❌ Connection closed. Reason:",
        reason,
        "Reconnecting:",
        shouldReconnect
      );

      isConnected = false;
      isConnecting = false;

      if (shouldReconnect) {
        await new Promise((r) => setTimeout(r, 3000));
        await connectToWhatsApp();
      }
    } else if (connection === "open") {
      console.log("✅ WhatsApp connected successfully!");
      isConnected = true;
      isConnecting = false;
    }
  });

  return newSock;
};

export const getSocket = () => {
  if (!sock) {
    throw new Error("WhatsApp socket not initialized. Call connectToWhatsApp first.");
  }
  return sock;
};

export const isWhatsAppConnected = () => isConnected;
