import { Router } from "express";
import { z } from "zod";
import * as scheduleService from "../../services/schedule.service";
import { requireAuth } from "../middleware/auth";

const createSchema = z.object({
  name: z.string().max(200).optional(),
  message: z.string().min(1).max(4096),
  recipients: z.array(z.string()).min(1).max(100),
  recurrence: z.enum(["once", "daily", "weekly", "monthly"]),
  time: z.string().optional(),
  dayOfWeek: z.number().int().min(0).max(6).optional(),
  dayOfMonth: z.number().int().min(1).max(31).optional(),
  runAt: z.string().datetime().optional(),
  timezone: z.string().optional(),
});

const updateSchema = createSchema.partial().extend({
  isActive: z.boolean().optional(),
});

export const scheduleRoutes = Router();

scheduleRoutes.use(requireAuth);

scheduleRoutes.post("/", async (req, res, next) => {
  try {
    const body = createSchema.parse(req.body);
    res.status(201).json(await scheduleService.createSchedule(req.userId!, body));
  } catch (e) {
    next(e);
  }
});

scheduleRoutes.get("/", async (req, res, next) => {
  try {
    res.json(await scheduleService.listSchedules(req.userId!));
  } catch (e) {
    next(e);
  }
});

scheduleRoutes.get("/:id", async (req, res, next) => {
  try {
    res.json(await scheduleService.getSchedule(req.userId!, req.params.id));
  } catch (e) {
    next(e);
  }
});

scheduleRoutes.patch("/:id", async (req, res, next) => {
  try {
    const body = updateSchema.parse(req.body);
    res.json(await scheduleService.updateSchedule(req.userId!, req.params.id, body));
  } catch (e) {
    next(e);
  }
});

scheduleRoutes.delete("/:id", async (req, res, next) => {
  try {
    await scheduleService.deleteSchedule(req.userId!, req.params.id);
    res.status(204).end();
  } catch (e) {
    next(e);
  }
});

scheduleRoutes.get("/:id/runs", async (req, res, next) => {
  try {
    res.json(await scheduleService.listRuns(req.userId!, req.params.id));
  } catch (e) {
    next(e);
  }
});
