import type { Request, Response, NextFunction } from "express";
import { verifyToken } from "../../infra/auth/jwt";
import { unauthorized } from "../../shared/errors";

declare global {
  namespace Express {
    interface Request {
      userId?: string;
    }
  }
}

export const requireAuth = (req: Request, _res: Response, next: NextFunction) => {
  const header = req.header("authorization");
  const headerToken = header?.startsWith("Bearer ") ? header.slice("Bearer ".length) : null;
  const queryToken = typeof req.query.token === "string" ? req.query.token : null;
  const token = headerToken ?? queryToken;
  if (!token) return next(unauthorized("Missing bearer token"));
  try {
    const { sub } = verifyToken(token);
    req.userId = sub;
    next();
  } catch {
    next(unauthorized("Invalid or expired token"));
  }
};
