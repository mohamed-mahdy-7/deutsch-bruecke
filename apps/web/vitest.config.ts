import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

/**
 * Kept separate from vite.config.ts: Vitest bundles its own Vite copy, and
 * mixing plugin types from two Vite versions creates misleading type errors.
 * The PWA plugin is not needed when running unit tests.
 */
export default defineConfig({
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url)),
    },
  },
  test: {
    environment: "node",
    include: ["src/**/*.test.ts"],
  },
});
