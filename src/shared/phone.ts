export const toE164 = (raw: string): string => {
  const digits = raw.replace(/\D/g, "");
  if (digits.length < 8 || digits.length > 15) {
    throw new Error(`Invalid phone number: ${raw}`);
  }
  return digits;
};

export const toJid = (e164: string): string => `${e164}@s.whatsapp.net`;
