type LogLevel = "info" | "warn" | "error";

/**
 * One JSON object per line. Hosting platforms can index these without a log
 * shipper, and request ids make it possible to follow a single failure.
 */
function write(level: LogLevel, message: string, fields: Record<string, unknown>): void {
  const entry = JSON.stringify({
    time: new Date().toISOString(),
    level,
    message,
    ...fields,
  });
  if (level === "error") {
    console.error(entry);
  } else if (level === "warn") {
    console.warn(entry);
  } else {
    console.info(entry);
  }
}

export const logger = {
  info: (message: string, fields: Record<string, unknown> = {}) =>
    write("info", message, fields),
  warn: (message: string, fields: Record<string, unknown> = {}) =>
    write("warn", message, fields),
  error: (message: string, fields: Record<string, unknown> = {}) =>
    write("error", message, fields),
};
