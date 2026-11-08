import { createApp } from "./app.js";
import { config } from "./config.js";

const app = createApp();

const server = app.listen(config.port, "0.0.0.0", () => {
  console.info(
    `[deutsch-bruecke] API listening on http://localhost:${config.port} (AI: ${config.aiMode})`,
  );
});

function shutdown(signal: string): void {
  console.info(`[deutsch-bruecke] ${signal} received, shutting down...`);
  server.close((error) => {
    if (error) {
      console.error("[deutsch-bruecke] Error closing server:", error);
      process.exit(1);
    }
    process.exit(0);
  });

  // Do not hang forever on a stuck connection.
  setTimeout(() => process.exit(1), 10_000).unref();
}

process.on("SIGTERM", () => shutdown("SIGTERM"));
process.on("SIGINT", () => shutdown("SIGINT"));
