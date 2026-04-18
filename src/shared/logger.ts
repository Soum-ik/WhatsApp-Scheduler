type Level = "info" | "warn" | "error" | "debug";

const write = (level: Level, scope: string, msg: string, meta?: unknown) => {
  const line = `[${new Date().toISOString()}] ${level.toUpperCase()} ${scope}: ${msg}`;
  if (meta !== undefined) console[level === "debug" ? "log" : level](line, meta);
  else console[level === "debug" ? "log" : level](line);
};

export const createLogger = (scope: string) => ({
  info: (msg: string, meta?: unknown) => write("info", scope, msg, meta),
  warn: (msg: string, meta?: unknown) => write("warn", scope, msg, meta),
  error: (msg: string, meta?: unknown) => write("error", scope, msg, meta),
  debug: (msg: string, meta?: unknown) => write("debug", scope, msg, meta),
});
