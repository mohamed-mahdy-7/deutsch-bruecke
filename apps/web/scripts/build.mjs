/**
 * `vite build` normally defaults to production mode, but Vite also reads the
 * shared root `.env`. A `NODE_ENV=development` entry there (useful for local
 * API runs) silently produces a development bundle instead. Force production
 * here so a developer's `.env` can never change what `npm run build` emits.
 */
process.env.NODE_ENV = "production";

const { build } = await import("vite");

await build();
