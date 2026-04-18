import express from "express";
import cors from "cors";
import helmet from "helmet";
import path from "node:path";
import { authRoutes } from "./routes/auth.routes";
import { whatsappRoutes } from "./routes/whatsapp.routes";
import { scheduleRoutes } from "./routes/schedule.routes";
import { errorHandler } from "./middleware/error";

export interface AppDeps {
  isReady: () => boolean;
}

export const createServer = ({ isReady }: AppDeps) => {
  const app = express();

  app.use(helmet({
    contentSecurityPolicy: {
      useDefaults: true,
      directives: {
        "script-src": ["'self'", "'unsafe-inline'", "https://cdn.jsdelivr.net"],
        "connect-src": ["'self'"],
      },
    },
  }));
  app.use(cors());
  app.use(express.json({ limit: "1mb" }));

  app.get("/health", (_req, res) => {
    if (!isReady()) {
      res.status(503).json({ status: "starting" });
      return;
    }
    res.json({ status: "ok" });
  });

  app.get("/qr", (_req, res) => {
    res.sendFile(path.resolve(process.cwd(), "qr.html"));
  });

  app.use("/auth", authRoutes);
  app.use("/whatsapp", whatsappRoutes);
  app.use("/schedules", scheduleRoutes);

  app.use(errorHandler);
  return app;
};
