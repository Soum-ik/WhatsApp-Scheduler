import { Router } from "express";
import rateLimit from "express-rate-limit";
import * as whatsapp from "../../services/whatsapp.service";
import { requireAuth } from "../middleware/auth";

const qrLimiter = rateLimit({
  windowMs: 60_000,
  limit: 5,
  standardHeaders: "draft-7",
  legacyHeaders: false,
});

export const whatsappRoutes = Router();

whatsappRoutes.get("/qr", requireAuth, qrLimiter, async (req, res, next) => {
  try {
    const userId = req.userId!;
    res.setHeader("Content-Type", "text/event-stream");
    res.setHeader("Cache-Control", "no-cache, no-transform");
    res.setHeader("Connection", "keep-alive");
    res.flushHeaders?.();

    const send = (event: string, data: unknown) => {
      res.write(`event: ${event}\n`);
      res.write(`data: ${JSON.stringify(data)}\n\n`);
    };

    const entry = await whatsapp.startConnect(userId);
    if (entry.lastQr) send("qr", { qr: entry.lastQr });
    if (entry.status === "connected") {
      send("connected", { status: "connected" });
      res.end();
      return;
    }

    const onQr = (qr: string) => send("qr", { qr });
    const onConnected = () => {
      send("connected", { status: "connected" });
      cleanup();
      res.end();
    };
    const onClosed = (info: { loggedOut: boolean }) => {
      send("closed", info);
      cleanup();
      res.end();
    };
    const cleanup = () => {
      entry.events.off("qr", onQr);
      entry.events.off("connected", onConnected);
      entry.events.off("closed", onClosed);
    };

    entry.events.on("qr", onQr);
    entry.events.on("connected", onConnected);
    entry.events.on("closed", onClosed);
    req.on("close", cleanup);
  } catch (e) {
    next(e);
  }
});

whatsappRoutes.get("/status", requireAuth, async (req, res, next) => {
  try {
    res.json(await whatsapp.getStatus(req.userId!));
  } catch (e) {
    next(e);
  }
});

whatsappRoutes.post("/disconnect", requireAuth, async (req, res, next) => {
  try {
    await whatsapp.disconnect(req.userId!);
    res.json({ ok: true });
  } catch (e) {
    next(e);
  }
});
