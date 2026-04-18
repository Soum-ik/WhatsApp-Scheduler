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
  if (!header?.startsWith("Bearer ")) return next(unauthorized("Missing bearer token"));
  try {
    const { sub } = verifyToken(header.slice("Bearer ".length));
    req.userId = sub;
    next();
  } catch {
    next(unauthorized("Invalid or expired token"));
  }
};
