// Vercel serverless entry point. The Express app is exported (not listened to)
// so Vercel can invoke it as a function. Local development still uses
// apps/api/src/index.ts, which calls app.listen().
import { createApp } from "../apps/api/dist/app.js";

const app = createApp();

export default app;