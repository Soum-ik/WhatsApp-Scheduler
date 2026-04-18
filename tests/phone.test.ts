import { test, expect } from "bun:test";
import { toE164, toJid } from "../src/shared/phone";

test("toE164 strips non-digits", () => {
  expect(toE164("+1 (415) 555-0100")).toBe("14155550100");
});

test("toE164 rejects too-short input", () => {
  expect(() => toE164("12345")).toThrow();
});

test("toJid appends WhatsApp suffix", () => {
  expect(toJid("14155550100")).toBe("14155550100@s.whatsapp.net");
});
