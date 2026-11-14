// Vercel serverless entry point. The Express app is exported (not listened to)
// so Vercel can invoke it as a function. Local development still uses
// apps/api/src/index.ts, which calls app.listen().
//
// This file is ESM (see api/package.json "type": "module") so the built API
// module (also ESM) can be imported with a static import. Static imports let
// Vercel's bundler trace and ship apps/api/dist and its dependencies.
import { createApp } from "../apps/api/dist/app.js";

const app = createApp();

export default app;