import type { Request, Response, NextFunction } from "express";
import { ZodError } from "zod";
import { HttpError } from "../../shared/errors";
import { createLogger } from "../../shared/logger";

const log = createLogger("http");

export const errorHandler = (
  err: unknown,
  _req: Request,
  res: Response,
  _next: NextFunction,
) => {
  if (err instanceof ZodError) {
    res.status(400).json({ error: "validation_error", issues: err.issues });
    return;
  }
  if (err instanceof HttpError) {
    res.status(err.status).json({ error: err.message, code: err.code });
    return;
  }
  log.error("unhandled", err);
  res.status(500).json({ error: "Internal server error" });
};
