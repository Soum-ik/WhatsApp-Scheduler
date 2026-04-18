import { Router } from "express";
import { z } from "zod";
import rateLimit from "express-rate-limit";
import * as authService from "../../services/auth.service";

const authLimiter = rateLimit({
  windowMs: 60_000,
  limit: 10,
  standardHeaders: "draft-7",
  legacyHeaders: false,
});

const credsSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
});

export const authRoutes = Router();

authRoutes.post("/signup", authLimiter, async (req, res, next) => {
  try {
    const body = credsSchema.parse(req.body);
    const { token, userId } = await authService.signUp(body.email, body.password);
    res.status(201).json({ token, userId });
  } catch (e) {
    next(e);
  }
});

authRoutes.post("/signin", authLimiter, async (req, res, next) => {
  try {
    const body = credsSchema.parse(req.body);
    const { token, userId } = await authService.signIn(body.email, body.password);
    res.json({ token, userId });
  } catch (e) {
    next(e);
  }
});
