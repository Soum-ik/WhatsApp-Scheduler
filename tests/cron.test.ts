import { test, expect } from "bun:test";

process.env.DATABASE_URL ??= "postgres://test:test@localhost:5432/test";
process.env.JWT_SECRET ??= "test-secret";

const { cronFor } = await import("../src/services/schedule.service");

test("cronFor once returns null", () => {
  expect(cronFor({ recurrence: "once" })).toBeNull();
});

test("cronFor daily", () => {
  expect(cronFor({ recurrence: "daily", time: "09:30" })).toBe("30 9 * * *");
});

test("cronFor weekly on Monday", () => {
  expect(cronFor({ recurrence: "weekly", time: "09:30", dayOfWeek: 1 })).toBe("30 9 * * 1");
});

test("cronFor monthly on the 15th", () => {
  expect(cronFor({ recurrence: "monthly", time: "09:30", dayOfMonth: 15 })).toBe("30 9 15 * *");
});

test("cronFor daily without time throws", () => {
  expect(() => cronFor({ recurrence: "daily" })).toThrow();
});

test("cronFor weekly without dayOfWeek throws", () => {
  expect(() => cronFor({ recurrence: "weekly", time: "09:30" })).toThrow();
});
