# Deutsch Brücke — دويتش بروكه

**An Arabic-first AI German tutor built for Egyptian Arabic speakers learning A1–B1 German.**

Deutsch Brücke combines short role-play conversations, gentle inline corrections, grammar drills driven by the learner's own mistakes, a sentence builder, listening dictation, a pronunciation coach, a structured A1–B1 path, and a spaced-repetition vocabulary trainer. The interface is Arabic and RTL by default, German is always isolated LTR, and every grammar explanation is written in warm Egyptian colloquial Arabic.

The app runs as a guest out of the box with local-first progress. Supabase is optional and adds cross-device accounts and sync. The same build can be wrapped with Capacitor for Android and iOS, using native text-to-speech and speech recognition when installed as an app.

---

## Table of contents

- [What is included](#what-is-included)
- [Tech stack](#tech-stack)
- [Repository layout](#repository-layout)
- [Quick start](#quick-start)
- [Environment variables](#environment-variables)
- [AI modes and safeguards](#ai-modes-and-safeguards)
- [Supabase setup](#supabase-setup-optional)
- [Data and sync model](#data-and-sync-model)
- [API reference](#api-reference)
- [Architecture](#architecture)
- [Seed content](#seed-content)
- [Scripts](#scripts)
- [Testing and verification](#testing-and-verification)
- [PWA and offline behaviour](#pwa-and-offline-behaviour)
- [Deployment](#deployment)
- [Capacitor packaging guide](#capacitor-packaging-guide)
- [Phase 2](#phase-2)
- [Phase 3](#phase-3)
- [Phase 4](#phase-4)
- [Deploy for free](#deploy-for-free)
- [Deploy on Vercel (free)](#deploy-on-vercel-free)
- [Troubleshooting](#troubleshooting)
- [Credits](#credits)

---

## What is included

### Learning flow

- **Onboarding and placement** — name, daily goal, Arabic dialect preference, and a five-question adaptive placement check that recommends A1, A2, or B1. The placement can be retaken from the profile without losing progress.
- **AI role-play tutor** — five built-in scenarios: café, doctor, job interview, Bürgeramt, and clothes shopping. Each scenario has a fixed server-side persona, level, setting, goals, formality, and key vocabulary. Conversations can be resumed or restarted explicitly.
- **AI custom-conversation creator** — describe any everyday situation in Arabic, Egyptian dialect, German, or a mix. Choose an optional CEFR level, `du`/`Sie`, and a friendly or stricter tone. Every generated field is editable in the preview; regenerate, discard, or save and start chatting immediately. Saved scenarios carry an **AI-made** badge and can be edited, duplicated, or deleted. Guests keep them locally; signed-in learners sync them through Supabase.
- **Gentle corrections** — every learner turn receives a corrected German sentence, at most 2–3 focused mistakes, a specific Arabic praise line, and a natural follow-up question. Arabic explanations focus on *why*, with Arabic–German contrasts where useful.
- **Safe mode** — a per-session toggle that asks the tutor for shorter, slower, idiom-free German.
- **Speech support** — German text can be spoken with the Web Speech API (`de-DE`) or native device voices inside the Capacitor app, and supported browsers/devices can dictate learner turns.
- **Word help** — tap a German word for a local dictionary lookup first; when online, the AI can fill in article, plural, meaning, and an example.
- **Structured A1–B1 curriculum** — nine units and 36 short lessons that sequence existing scenarios, grammar drills, vocabulary, sentence building, listening, and pronunciation. Lessons unlock in order and each completed lesson opens the next; units unlock when the previous unit is complete. Progress is saved locally and synced for signed-in learners.
- **Listening dictation** — 24 short German sentences across A1, A2, and B1 with normal and slow playback, optional first-letter and translation hints, word-level diff highlighting, and a saved accuracy score.
- **Pronunciation coach** — 18 everyday phrases focused on tricky German sounds (`ch`, `sch`, `ü`, `ö`, `ä`, `r`, `w`, `v`, `z`, `ei`, `ie`, `eu`, initial `sp/st`, final `-er`). Record with the microphone or type what you said, then review per-sound feedback and Arabic tips.
- **AI grammar practice hub** — seven drill topics: articles, cases, prepositions, verb position, separable verbs, subordinate clauses, and plurals. Every session asks the API for ten level-aware questions shaped by the learner's recorded weak spots. Questions are validated before display, cached by normalized request, and explained in Egyptian Arabic. The saved article/case/preposition pools remain as an offline fallback.
- **Sentence builder** — 16 token-ordering exercises covering verb-second, verb-final, separable verbs, questions, and general word order.
- **SRS vocabulary** — 100 seeded A1 cards plus words added manually or captured from conversations. Reviews use an SM-2-inspired scheduler with Again / Hard / Good / Easy grades.
- **Progress dashboard** — XP, streak, daily goal, due cards, seven-day activity, 30-day heatmap, topic accuracy, weakest patterns, a concrete next-step plan, and recent drill results.
- **Profile and settings** — editable name, level, daily goal, dialect, interface language, theme, AI health, install prompt, sync status, retake onboarding, sign out, and local data reset.

### Experience and platform

- Full RTL Arabic UI with an English toggle.
- German rendered in LTR isolation everywhere, including mixed Arabic/German sentences.
- Cairo for Arabic and Inter for German/Latin text.
- Light, dark, and system themes with instant application.
- Mobile-first from 360 px; desktop sidebar and mobile bottom navigation.
- Installable PWA: web manifest, maskable icons, service worker, app shortcuts, and an offline shell.
- Calm, warm visual language; loading, empty, error, and offline states throughout.
- Grammar colour language: **der = blue**, **die = red/rose**, **das = green**, **verbs = amber**.
- Accessible focus states, labelled controls, `aria-pressed` toggles, and reduced reliance on colour alone.

---

## Tech stack

| Layer | Choices |
| --- | --- |
| Frontend | React 18, TypeScript, Vite 6, React Router 6, Tailwind CSS 3 |
| UI | Lucide icons, Fontsource variable fonts (Cairo + Inter), custom components |
| Validation | Zod on both client and server |
| PWA | `vite-plugin-pwa`, Workbox, generated PNG/SVG icons |
| Backend | Node.js, Express 4, TypeScript, `tsx` in development |
| AI | Anthropic Claude or Google Gemini, server-side only |
| Auth and sync | Supabase Auth + Postgres with Row Level Security (optional) |
| Native | Capacitor 8 (`@capacitor-community/text-to-speech`, `@capacitor-community/speech-recognition`) |
| Rate limiting | `express-rate-limit` with an optional shared Redis store and in-memory fallback |
| Observability | JSON-lines logs, request IDs, in-process counters/timings, `/api/metrics` |
| Testing | Vitest (unit and endpoint tests across API and web) |
| Tooling | npm workspaces, concurrently |

Requirements: **Node.js 20 or newer** and npm 10 or newer.

---

## Repository layout

```
.
├── apps
│   ├── api                       # Express AI proxy
│   │   └── src
│   │       ├── app.ts            # routes, CORS, helmet, rate limits
│   │       ├── config.ts         # env loading and AI mode
│   │       ├── index.ts          # server bootstrap and shutdown
│   │       ├── schemas.ts        # Zod request/response contracts
│   │       ├── data/scenarios.ts # built-in allow-list + custom scenario mapper
│   │       ├── data/drills.ts    # 70-question demo/fallback drill bank
│   │       ├── lib/              # JSON extraction, errors, HTTP helpers, logger, metrics, drill text normalisation
│   │       ├── middleware/       # rate limiter, resilient Redis store, request observability
│   │       ├── prompts/          # tutor, assist, word, scenario, and drill prompts
│   │       ├── services/ai.ts    # Anthropic, Gemini, and demo gateways
│   │       ├── services/drillCache.ts      # normalized cache + in-flight dedupe
│   │       ├── services/drillService.ts    # generation, repair, bank fill
│   │       ├── services/drillValidation.ts # sanity checks + public mapping
│   │       └── services/scenarioCache.ts   # normalized cache + in-flight dedupe
│   └── web                       # React PWA
│       ├── public/               # icons, favicon
│       ├── scripts/              # reproducible icon generation
│       └── src
│           ├── components/       # UI, layout, German, tutor, and drill components
│           ├── config/           # browser-safe env
│           ├── data/             # scenarios, vocab, drills, sentences, placement, curriculum, listening, pronunciation
│           ├── hooks/            # speech (web + Capacitor), online, install
│           ├── lib/              # SRS, adaptive, dates, German highlighting, i18n, curriculum, dictation, pronunciation
│           ├── pages/            # route screens including curriculum, listening, and pronunciation
│           ├── providers/        # settings/theme/language
│           ├── services/         # AI client, drill mapping, local store, Supabase, dictionary
│           ├── state/            # auth, progress, factories, merge, mutations
│           ├── styles/           # Tailwind layers and design tokens
│           └── types/            # canonical domain model
├── android                       # generated Capacitor Android project
├── ios                           # generated Capacitor iOS project
├── supabase
│   └── migrations
│       ├── 001_initial.sql
│       ├── 002_custom_scenarios.sql
│       └── 003_curriculum.sql
├── capacitor.config.ts           # native shell configuration
├── .env.example
└── package.json                  # npm workspaces and root scripts
```

---

## Quick start

### 1. Install

```bash
npm install
```

Run from the repository root. npm installs both workspaces.

### 2. Create the environment file

Copy the template and fill in what you need:

```bash
# macOS / Linux
cp .env.example .env

# Windows PowerShell
Copy-Item .env.example .env
```

For a first run, the only optional value is an AI key (`ANTHROPIC_API_KEY` or `GEMINI_API_KEY`). Without one, development automatically uses the labelled demo tutor. Everything else works as a guest without Supabase.

### 3. Start both apps

```bash
npm run dev
```

- Web: <http://localhost:5173>
- API: <http://localhost:8787>
- Health: <http://localhost:8787/api/health>
- Metrics: <http://localhost:8787/api/metrics>

Vite proxies `/api` to the API server, so the browser only talks to one origin in development.

### 4. Production-like preview

```bash
npm run build
npm run preview
```

- Web preview: <http://localhost:4173>
- API: <http://localhost:8787>

The preview server also proxies `/api` to port 8787.

---

## Environment variables

All values live in a single root `.env` file. The API loads it with `dotenv`; Vite reads it with `envDir: "../../"`. `VITE_*` values are embedded into the browser bundle at build time, so **never put an AI provider key in a `VITE_*` variable**.

| Variable | Default | Used by | Purpose |
| --- | --- | --- | --- |
| `VITE_API_BASE_URL` | `/api` | Web | API base URL. Keep relative when a reverse proxy serves `/api`. |
| `VITE_SUPABASE_URL` | empty | Web | Supabase project URL. Leave empty for guest-only mode. |
| `VITE_SUPABASE_ANON_KEY` | empty | Web | Supabase anon/publishable key. Safe to expose; RLS enforces access. |
| `NODE_ENV` | `development` | API, Web build | Enables production safeguards. Avoid storing it in the shared `.env`: Vite reads the same file, so `development` would downgrade builds (the web build script now forces `production`). Set it in the host environment instead. |
| `PORT` | `8787` | API | API listening port. |
| `CLIENT_ORIGIN` | `http://localhost:5173` | API | Allowed CORS origins, comma-separated. |
| `AI_PROVIDER` | auto | API | `anthropic`, `gemini`, or `demo`. Unset auto-selects from the available keys. |
| `ANTHROPIC_API_KEY` | empty | API | Server-only Claude credential. |
| `ANTHROPIC_MODEL` | `claude-sonnet-4-5-20250929` | API | Claude model ID. |
| `GEMINI_API_KEY` | empty | API | Server-only Google Gemini credential. |
| `GEMINI_MODEL` | `gemini-2.5-flash` | API | Gemini model ID. |
| `AI_DEMO_MODE` | `false` | API | Hard override to the demo gateway when `true`. Never use publicly in production. |
| `CHAT_RATE_WINDOW_MINUTES` | `15` | API | Chat rate-limit window. |
| `CHAT_RATE_MAX` | `30` | API | Chat requests per IP per window. |
| `ASSIST_RATE_WINDOW_MINUTES` | `15` | API | Assist rate-limit window. |
| `ASSIST_RATE_MAX` | `60` | API | Assist requests per IP per window. |
| `WORD_RATE_WINDOW_MINUTES` | `15` | API | Word-lookup rate-limit window. |
| `WORD_RATE_MAX` | `150` | API | Word lookups per IP per window. |
| `SCENARIO_RATE_WINDOW_MINUTES` | `15` | API | AI scenario-generation rate-limit window. |
| `SCENARIO_RATE_MAX` | `20` | API | Scenario generations per IP per window. Each cache miss can call the AI provider. |
| `DRILL_RATE_WINDOW_MINUTES` | `15` | API | AI drill-generation rate-limit window. |
| `DRILL_RATE_MAX` | `20` | API | Drill sessions per IP per window. Each cache miss can call the provider once or twice. |
| `TRUST_PROXY` | `0` | API | Set to `1` only behind a trusted reverse proxy so rate limits use the real client IP. |
| `REDIS_URL` | empty | API | Optional Redis connection for shared rate-limit counters across API instances. |
| `RATE_LIMIT_STORE` | auto | API | `redis` or `memory`. Defaults to `redis` when `REDIS_URL` is set, otherwise `memory`. |
| `LOG_REQUESTS` | `true` | API | JSON request logs with request IDs. Set to `false` to silence per-request lines; metrics remain available. |

Restart the dev server after changing `.env` or Vite values.

`npm run build` forces `NODE_ENV=production` for Vite, so a local `NODE_ENV=development` in `.env` cannot downgrade the production web bundle. Set `NODE_ENV=production` in the shell or host environment when running the API in production.

---

## AI providers, modes, and safeguards

Select the AI backend with `AI_PROVIDER=anthropic | gemini | demo`. When it is unset, the API prefers Anthropic, then Gemini, then falls back to the demo tutor in development. `AI_DEMO_MODE=true` always wins, so local UI work never calls a paid API by accident.

Both live gateways reuse the same system prompts, Zod schemas, history window, and one-shot JSON repair path. `/api/health` reports the active gateway plus runtime details:

```json
{
  "ok": true,
  "data": {
    "status": "ok",
    "ai": "live",
    "provider": "gemini",
    "environment": "production",
    "timestamp": "2026-01-01T00:00:00.000Z",
    "uptimeSeconds": 3600,
    "requestCount": 1420,
    "rateLimitStore": "connected",
    "cache": { "scenarioEntries": 12, "drillEntries": 34 }
  }
}
```

`rateLimitStore` is `disabled` when memory storage is used, `connected` when Redis is reachable, and `degraded` while the API is falling back to memory after a Redis failure.

The API has three explicit modes:

| Mode | When | Behaviour |
| --- | --- | --- |
| `live` | The selected provider has its API key and `AI_DEMO_MODE` is not `true` | Calls Claude or Gemini using the configured model. |
| `demo` | `AI_DEMO_MODE=true`, `AI_PROVIDER=demo`, or no usable key in development | Deterministic local replies, corrections, and word fallbacks. The UI labels these responses as demo. |
| `unavailable` | `NODE_ENV=production` and the selected provider has no key | AI routes return `503 ai_not_configured`; the rest of the app remains usable. |

The server never silently enables demo mode in production.

### Server-side protections

- AI provider keys (Anthropic, Gemini) are read only by the API and never sent to the browser.
- The browser sends a built-in scenario **ID**; the server owns the built-in personas and prompts. Custom scenarios are sent as a fully validated contract and are treated strictly as learning data, never as instructions.
- Scenario ideas are escaped inside an XML data block, length-limited, and validated before reaching the provider. The prompt refuses unsafe or off-topic ideas with a warm Arabic message (`422 scenario_refused`).
- Generated scenarios are cached by normalized idea + level + formality + tone. Identical in-flight requests share one provider call; `forceRegenerate` skips completed cache reads but still joins an in-flight identical call.
- Generated drills are cached by practice topic + CEFR level + normalized weak-spot patterns and counts. Identical in-flight requests share one provider call; `forceRegenerate` skips a completed cache entry.
- Every drill item is checked beyond Zod shape validation: four distinct options, exactly one correct answer that matches an option, and a non-empty unique question stem. Invalid items are discarded, one replacement request is made for the missing items, and the remaining gap is filled from the deterministic bank.
- Every request body is validated with Zod and capped at 32 kB.
- Responses are validated against Zod; Markdown fences are stripped and malformed output gets one repair attempt.
- `helmet` sets security headers; CORS is an explicit allow-list.
- JSON-aware rate limiters protect chat, assist, word, scenario-generation, and drill-generation routes per IP. They use the in-memory store by default and an optional shared Redis store when `REDIS_URL` is set.
- Errors are normalised into a stable envelope with a request ID; internal errors are logged, not leaked.
- Every response carries an `x-request-id`; `/api/metrics` exposes counters and timings for requests, AI calls, cache events, rate limits, and server errors.
- The tutor prompt treats learner text and history as untrusted data and refuses prompt-extraction and off-topic requests.
- Conversation history is limited to 12 items by the request schema and trimmed again before the Anthropic call.
- The tutor is instructed to cap German at the learner's CEFR level and to keep corrections focused.

> **Shared limits are optional.** Without `REDIS_URL`, rate limits are per process and reset on restart. Set `REDIS_URL` when running more than one API instance; if Redis becomes unreachable, the limiter opens a 15-second circuit breaker and falls back to its local memory store so requests keep working.

### AI response contract

`POST /api/chat` returns this validated shape:

```json
{
  "reply_de": "German role-play reply ending with one question",
  "translation_ar": "natural Egyptian Arabic translation",
  "correction": {
    "corrected": "the learner's full message in natural German",
    "mistakes": [
      {
        "type": "article",
        "original": "das Kaffee",
        "fix": "der Kaffee",
        "explanation_ar": "شرح قصير بالعامية المصرية"
      }
    ],
    "praise_ar": "مدح محدد ودافئ",
    "follow_up_question_de": "short German question"
  },
  "vocabulary": [
    {
      "word": "Kaffee",
      "article": "der",
      "plural": "die Kaffees",
      "translation_ar": "قهوة",
      "example_de": "Der Kaffee ist heiß."
    }
  ]
}
```

Mistakes are capped at three, vocabulary suggestions at three, and German reply length at 1,200 characters.

`POST /api/scenarios/generate` returns a validated, fully editable scenario:

```json
{
  "title_de": "Zimmer im Hotel buchen",
  "title_ar": "حجز غرفة في فندق",
  "emoji": "🏨",
  "setting_ar": "مكتب استقبال في فندق صغير في برلين.",
  "ai_role_de": "freundliche Rezeptionistin in einem kleinen Hotel",
  "learner_role_ar": "ضيف عايز يحجز غرفة",
  "goal_ar": "احجز غرفة واسأل عن السعر.",
  "level": "A2",
  "formality": "Sie",
  "tone": "friendly",
  "grammar_focus": ["Höflichkeitsform Sie", "Akkusativ"],
  "key_vocab": [
    { "de": "Zimmer", "article": "das", "plural": "die Zimmer", "ar": "غرفة" }
  ],
  "useful_phrases": [
    { "de": "Ich möchte ein Zimmer reservieren.", "ar": "عايز أحجز غرفة." }
  ],
  "opening_message_de": "Guten Tag! Möchten Sie ein Zimmer reservieren?",
  "opening_message_ar": "نهارك سعيد! تحب تحجز غرفة؟"
}
```

The response `meta` includes `mode` and `cached`. A safety refusal is `422` with `error.code = "scenario_refused"` and the Arabic refusal in `error.message`.

`POST /api/drills/generate` returns ten camelCase questions plus the number that came from the saved bank:

```json
{
  "questions": [
    {
      "id": "drill_9f4c…",
      "topic": "cases",
      "grammarTopic": "cases",
      "pattern": "dative-article-feminine",
      "level": "A2",
      "promptBefore": "Ich helfe",
      "promptAfter": "Frau.",
      "hintAr": "الفعل ده بياخد Dativ.",
      "hintEn": "This verb takes the dative.",
      "options": ["der", "die", "den", "dem"],
      "correctAnswer": "der",
      "translationAr": "أنا بساعد الست.",
      "translationEn": "I help the woman.",
      "explanationAr": "«helfen» بياخد Dativ، والمؤنّث بيبقى «der».",
      "explanationEn": "“helfen” takes the dative, so the feminine article becomes “der”.",
      "weakSpotAr": "أداة المؤنّث في Dativ",
      "weakSpotEn": "Feminine dative article"
    }
  ],
  "fallbackCount": 0
}
```

`topic` is the seven-value practice category; `grammarTopic` is the persisted analytics bucket. Word-order categories all persist as `word_order`, and `plurals` persists as `articles`, so no Supabase constraint changes are needed. If the provider fails completely, the endpoint returns `502 drill_generation_failed` with a friendly Arabic retry message; the UI can still start the saved offline bank.

---

## Supabase setup (optional)

Guest mode is the default and needs no backend account. To enable accounts and cross-device sync:

### 1. Create a project

Create a project at [supabase.com](https://supabase.com). Note the project URL and anon key from **Project Settings → API**.

### 2. Run the migration

Open the Supabase **SQL Editor**, paste the contents of [`supabase/migrations/001_initial.sql`](supabase/migrations/001_initial.sql), run it, then repeat with [`002_custom_scenarios.sql`](supabase/migrations/002_custom_scenarios.sql) and [`003_curriculum.sql`](supabase/migrations/003_curriculum.sql). Fresh projects run all three in order; existing projects only need the new migrations.

The migrations create:

| Table | Purpose |
| --- | --- |
| `profiles` | Learner preferences, level, daily goal, onboarding flag, XP |
| `weak_spots` | Aggregated mistake patterns |
| `vocab_cards` | Vocabulary cards and SRS scheduling fields |
| `drill_results` | Grammar drill attempts |
| `conversations` | Tutor conversations per scenario |
| `messages` | Conversation turns, translations, suggestions, live/demo mode |
| `corrections` | One correction bundle per learner message |
| `daily_activity` | XP and active seconds per local date |
| `streaks` | Current/longest streak and last practice date |
| `custom_scenarios` | Learner-generated scenarios stored as validated JSONB (`data`) plus timestamps |
| `curriculum_completions` | Completed curriculum lesson ids and XP per learner |

It also adds indexes, check constraints, foreign keys with cascade deletes, RLS policies scoped to `auth.uid()`, and revokes anonymous access.

> **No signup trigger creates a profile on purpose.** The client promotes guest progress on first sign-in and then upserts the profile. A trigger-created empty profile would make the app believe remote progress already exists and hide the learner's local guest data.

### 3. Configure auth providers

Under **Authentication**:

- **Email** — enable email/password. Email confirmation is optional; if enabled, users must confirm before signing in.
- **Google** — enable the provider, add your Google OAuth client ID/secret, and register the Supabase callback URL (`https://<project-ref>.supabase.co/auth/v1/callback`) in Google Cloud Console.
- **URL configuration** — set the Site URL to the web app origin and add redirect URLs:
  - `http://localhost:5173/auth`
  - `https://your-production-domain.com/auth`

The client redirects email confirmation and Google OAuth back to `/auth`.

### 4. Add the browser environment

```env
VITE_SUPABASE_URL=https://<project-ref>.supabase.co
VITE_SUPABASE_ANON_KEY=<anon-key>
```

Only the anon/publishable key belongs in the browser. Never expose the service-role key.

### 5. Restart

Restart `npm run dev`. The auth page now offers email and Google sign-in. Without these values, the auth page explains that accounts are unavailable and the app stays in guest mode.

### Sync semantics

- Guest progress is stored in `localStorage` under `deutsch-bruecke:progress:v1`.
- Guest custom scenarios are stored per owner under `deutsch-bruecke:custom-scenarios:v1:<ownerId>`.
- Preferences live under `deutsch-bruecke:preferences:v1`.
- Signing in with a guest state promotes that state into the account when no remote profile exists. Guest-created custom scenarios are promoted into `custom_scenarios` on first sign-in.
- When both local and remote state exist for the same account, they are merged; the browser then debounces writes to Supabase by two seconds. Custom scenarios merge by `id`, keeping the newest `updatedAt`. Curriculum completions merge as a union of completed lesson ids.
- Custom scenario edits, duplicates, and deletes update local storage first and then sync in the background; a failed sync keeps the local copy and shows a warning badge.
- Active practice time is recorded in one-minute increments while the tab is visible.
- Clearing site data while signed out removes guest progress permanently.
- Account deletion cascades through all tables via `auth.users(id)` foreign keys.

---

## API reference

Base URL in development: `http://localhost:8787`

### Response envelope

Success:

```json
{ "ok": true, "data": {}, "meta": { "mode": "live" } }
```

Error:

```json
{
  "ok": false,
  "error": {
    "code": "invalid_request",
    "message": "Some of the submitted data is invalid.",
    "requestId": "f47ac10b-58cc-4372-a567-0e02b2c3d479",
    "details": [{ "path": "learnerMessage", "message": "String must contain at most 500 character(s)" }]
  }
}
```

`/api/health` returns `{ "ok": true, "data": { ... } }` without `meta`. Every response includes an `x-request-id` header; a safe client-supplied `x-request-id` is reused.

### Endpoints

| Method | Path | Purpose | Rate limit |
| --- | --- | --- | --- |
| `GET` | `/api/health` | Status, AI mode, provider, uptime, request count, cache sizes, Redis status | None |
| `GET` | `/api/metrics` | JSON counters and timings for requests, AI calls, cache events, rate limits, and errors | None |
| `POST` | `/api/chat` | One tutor turn with correction and vocabulary | `CHAT_RATE_*` |
| `POST` | `/api/scenarios/generate` | Turn one learner idea into a validated, editable scenario | `SCENARIO_RATE_*` |
| `POST` | `/api/drills/generate` | Generate a ten-question, level-aware grammar drill session | `DRILL_RATE_*` |
| `POST` | `/api/assist` | Explain, simplify, or translate a German snippet | `ASSIST_RATE_*` |
| `POST` | `/api/word` | Dictionary details for a single word | `WORD_RATE_*` |

Metrics are in-process and reset when the API restarts. `GET /api/metrics` returns `counters`, `timings`, `startedAt`, `uptimeSeconds`, Redis status, and current cache sizes; scrape it from your host, or forward the JSON request logs to your log platform.

### `POST /api/chat`

```json
{
  "scenarioId": "cafe",
  "level": "A1",
  "dialect": "egyptian",
  "safeMode": false,
  "learnerMessage": "Ich möchte ein Kaffee, bitte.",
  "history": [
    { "role": "assistant", "content": "Guten Morgen! Was möchten Sie bestellen?" }
  ]
}
```

- `scenarioId` must be one of `cafe`, `doctor`, `interview`, `office`, `shopping`, or a saved `custom_*` id.
- Custom scenario turns also include `customScenario` in the exact snake_case generated-scenario shape. It must use the custom id that starts with `custom_`; the server rejects a missing or malformed payload.
- `level` must be `A1`, `A2`, or `B1`.
- `learnerMessage` is 1–500 characters.
- `history` is optional and limited to 12 messages.

### `POST /api/scenarios/generate`

```json
{
  "idea": "عايز أتدرب على حجز غرفة في فندق",
  "level": "A2",
  "formality": "Sie",
  "tone": "friendly",
  "forceRegenerate": false
}
```

- `idea` is 3–500 characters and must contain Arabic or Latin letters. Arabic, Egyptian dialect, German, English, and mixed text are all accepted.
- `level`, `formality`, and `tone` are optional; `tone` defaults to `friendly`.
- `forceRegenerate` skips a completed cache entry but still joins an identical in-flight request.
- Invalid input is `400 invalid_request`; a safety refusal is `422 scenario_refused`; rate limiting is `429 rate_limited`.
- The response is cached in memory for 30 minutes by normalized idea + level + formality + tone.

### `POST /api/drills/generate`

```json
{
  "topic": "cases",
  "level": "A2",
  "weakSpots": [
    { "pattern": "dative-article-feminine", "count": 4, "labelAr": "أداة المؤنّث في Dativ" }
  ],
  "forceRegenerate": false
}
```

- `topic` must be one of `articles`, `cases`, `prepositions`, `verb_position`, `separable_verbs`, `subordinate_clauses`, or `plurals`.
- `level` must be `A1`, `A2`, or `B1`.
- `weakSpots` is optional (maximum 20). Only `pattern` and `count` affect generation; labels are passed to the prompt as extra context.
- `forceRegenerate` skips a completed cache entry while still joining an identical in-flight request.
- The endpoint always returns ten validated questions when the provider responds. One replacement provider call is allowed for invalid or missing items, then the saved bank fills any remaining gap and reports it in `fallbackCount`.
- A complete provider failure is `502 drill_generation_failed`; rate limiting is `429 rate_limited`.
- Responses are cached in memory for 30 minutes by topic + level + normalized weak-spot patterns/counts.

### `POST /api/assist`

```json
{
  "action": "explain",
  "text": "Ich habe den Termin verpasst.",
  "level": "A2",
  "dialect": "egyptian"
}
```

`action` is `explain`, `simplify`, or `translate`, and `text` is 1–1,200 characters.

### `POST /api/word`

```json
{
  "word": "Termin",
  "context": "Ich habe morgen einen Termin.",
  "level": "A2"
}
```

Returns the word's article, plural, part of speech, Arabic and English meanings, and example sentences.

---

## Architecture

### Browser

- **`SettingsProvider`** owns UI language, theme, and instant application to `<html>`/`<body>`. Preferences are mirrored into the authenticated profile but local choices always win.
- **`AuthProvider`** wraps Supabase session handling and exposes email, Google, and sign-out actions. It remains fully functional without Supabase by reporting guest/anonymous mode.
- **`ProgressProvider`** is the single source of truth for learning data. It hydrates guest or account progress, exposes typed mutations, debounces remote saves, tracks active minutes, records chat mistakes as weak spots, stores curriculum completions, and merges local/remote state on sign-in.
- **`CustomScenariosProvider`** owns learner-generated scenarios. It merges per-owner local storage, promoted guest scenarios, and Supabase rows by `updatedAt`, then exposes save, delete, duplicate, and lookup helpers. Scenario generation itself happens in `CustomScenarioPage`.
- **Speech hooks** in `hooks/useSpeech.ts` expose one API for the browser and the native shell: Capacitor text-to-speech/speech-recognition on Android and iOS, with the Web Speech API as the web fallback. Microphone and speech usage descriptions are declared in the native projects.
- **Services** isolate side effects: `ai.ts` (typed Zod client), `customScenarioStore.ts` (validated local persistence and merging), `remoteCustomScenarios.ts` (Supabase sync), `customScenarioMapping.ts` (API/domain/chat mapping), `supabaseClient.ts`, `remoteProgress.ts`, `localStore.ts`, `dictionary.ts`, and `wordLookup.ts`.
- **Domain types** in `types/domain.ts` are shared by seed data, state, services, and UI.
- **Route gates** distinguish anonymous, guest, and authenticated users; guests can still open `/auth` to promote progress, while authenticated users are redirected away from it.

### API

- `config.ts` resolves the shared root `.env`, validates numeric settings, and decides the AI mode, Redis store, and logging flags.
- `app.ts` composes Express middleware, rate limiters, Zod validation, scenario lookup, custom scenario resolution, observability, and response envelopes.
- `middleware/observability.ts` attaches request IDs, records request counters/timings, and writes one structured JSON log line per request when `LOG_REQUESTS` allows it. `lib/metrics.ts` is a small in-process registry; `lib/logger.ts` writes JSON lines. `middleware/rateLimitStore.ts` adds the optional Redis store with an atomic increment script, a shared connection, a 15-second circuit breaker, and automatic memory fallback.
- `prompts/` contains the tutor, assist, word, and scenario prompts. The tutor prompt enforces the CEFR cap, correction contract, Egyptian Arabic voice, safety boundaries, formality, tone, grammar focus, key vocabulary, and JSON output. The scenario prompt isolates learner ideas as untrusted data and defines refusal rules.
- `services/ai.ts` defines an `AiGateway` interface with live and demo implementations. The live gateway retries once with a repair instruction when structured JSON is invalid. The demo gateway returns deterministic scenarios for the full creator flow.
- `services/scenarioCache.ts` normalizes ideas (case, punctuation, spacing, Arabic diacritics), caches completed scenarios for 30 minutes, and de-duplicates concurrent identical requests.
- `services/drillService.ts` runs the drill batch pipeline: one provider request, sanity filtering, at most one replacement request, then deterministic bank fill. `services/drillCache.ts` normalizes weak spots (slug, sorted pattern:count) and de-duplicates identical sessions. `services/drillValidation.ts` enforces four distinct options, exactly one correct answer, unique stems, and maps the raw snake_case model contract to the public camelCase one.
- `prompts/drill.ts` defines level and topic guidance, four-option rules, weak-spot prioritisation, Arabic/English explanation requirements, and the replacement instruction. The demo gateway returns the same deterministic bank for every topic.
- `lib/json.ts` extracts a JSON object even when a model wraps it in prose or code fences.
- `lib/http.ts` normalises Zod errors, payload errors, not-found routes, and unexpected failures.

### Data flow

```
Seed content + local progress
        │
        ▼
ProgressProvider ── debounced upsert ──► Supabase (optional)
        │
        ├── UI reads typed state
        ├── AI client ── POST /api/* ──► Express ──► Anthropic
        │                                     └──► Zod validate/retry
        └── Grammar hub ── POST /api/drills/generate ──► cache ──► provider
                                                   └── sanity filter + bank fill
```

The browser never sends free-form personas or prompts for built-in scenes. It sends structured learning data and the server chooses the matching scenario prompt. Custom scenarios are generated through `/api/scenarios/generate`, edited locally, and then sent back as validated scenario data on each chat turn.

```
CustomScenarioPage ── POST /api/scenarios/generate ──► Express ──► AI provider
        │                                                   │
        │ validated editable preview                        └── cache + repair
        ▼
CustomScenariosProvider ── local storage ──► Supabase custom_scenarios (optional)
        │
        └── custom_* id + validated payload ──► POST /api/chat
```

---

## Seed content

| Content | Count |
| --- | --- |
| Role-play scenarios | 5 built-in + unlimited AI-created custom scenarios |
| Seeded vocabulary cards | 100 A1 words |
| Grammar drill questions (offline fallback) | 40 |
| · Article questions | 12 |
| · Case questions | 18 |
| · Preposition questions | 10 |
| AI/demo drill bank | 70 (10 per practice topic) |
| Curriculum | 9 units · 36 lessons (12 per CEFR level) |
| Listening dictation clips | 24 (8 per CEFR level) |
| Pronunciation phrases | 18 (6 per CEFR level) |
| Sentence-building exercises | 16 |
| Placement questions | 5 |
| Local dictionary entries | 100 |

All seed files live in `apps/web/src/data/` and are typed against the domain model, so adding content is a compile-checked operation.

---

## Scripts

Run from the repository root:

| Command | Description |
| --- | --- |
| `npm run dev` | Start API and web concurrently with hot reload |
| `npm run build` | Typecheck and build the API, then the web app |
| `npm run preview` | Run the built API and Vite preview with `/api` proxying |
| `npm run typecheck` | Typecheck every workspace |
| `npm test` | Run all Vitest suites |
| `npm run native:build` | Build the web app for the native shell |
| `npm run cap:sync` | Build the web app, copy assets, and sync native plugins |
| `npm run cap:android` | Sync and open the Android project in Android Studio |
| `npm run cap:ios` | Sync and open the iOS project in Xcode (macOS only) |

Workspace-specific examples:

```bash
npm run dev --workspace @bruecke/web
npm run dev --workspace @bruecke/api
npm run build --workspace @bruecke/web
npm test --workspace @bruecke/web
```

---

## Testing and verification

The repository currently includes 195 unit and endpoint tests (111 API + 84 web):

- API JSON extraction and structured-response parsing.
- API request/model schemas, including drill topics, weak-spot caps, option counts, custom scenario limits, formality/article validation, and refusal shapes.
- Endpoint tests for scenario generation: validation, tone attachment, explicit level/formality override, cache hits, forced regeneration, refusal mapping, and custom-chat resolution.
- Endpoint tests for drill generation: all seven topics, ten unique validated questions, normalized cache hits, forced regeneration, invalid-item replacement and bank fill, provider failure mapping, and unknown-topic rejection.
- Observability tests: request IDs (generated, reused, unsafe values replaced), `/api/health`, `/api/metrics`, request counters/timings, AI and cache counters, and 429 `Retry-After` handling.
- Rate-limit store tests with a fake Redis client: atomic increments, reset/decrement, shared connection, memory fallback on connection or command failure, and the circuit breaker.
- Curriculum data and progression: 9 units, 36 lessons, level counts, unique ids, ordered unlocking, completion merging, next-lesson selection, and per-unit/per-level progress.
- Listening dictation: word alignment, punctuation/case handling, insertion/deletion/substitution diffing, pass thresholds, and the 24-clip bank.
- Pronunciation: grapheme-to-phoneme approximations for every target sound, phrase bank coverage, word accuracy, and per-sound status thresholds.
- Drill sanity validation: duplicate options, missing answer match, duplicate stems across batches, empty stems, English fallback, camelCase mapping.
- Drill cache normalization: weak-spot order/case/spacing, count merging and caps, stable empty key, TTL expiry, refresh, and concurrent de-duplication.
- Scenario cache normalization, TTL expiry, concurrent de-duplication, and refresh semantics.
- Frontend drill mapping: practice topic vs persisted grammar topic for all seven categories, plus static bank counts and question validity.
- Frontend custom-scenario mapping, API payload round-trips, validated storage parsing, and newest-wins merging.
- SRS scheduling: resets, ease changes, intervals, one-year cap, due filtering, queue limits.
- Adaptive question selection: empty banks, over-sized counts, weak-pattern bias, uniqueness, weak-spot sorting, topic accuracy.
- German segmentation and grammar colouring: articles, indefinite articles, verbs, hyphenated names, punctuation preservation.

```bash
npm test
npm run typecheck
npm run build
```

For a manual smoke test:

1. Complete onboarding and placement.
2. Open a tutor scenario, send a message with a deliberate article error, and confirm the correction card, praise, translation, and follow-up question.
3. Open **Create a scenario with AI**, enter an Arabic idea such as `عايز أتدرب على حجز غرفة في فندق`, generate, edit one field, regenerate, then save and start the chat. Confirm the AI-made badge, edit, duplicate, and delete flows on `/tutor`.
4. Try an unsafe or off-topic idea and confirm the Arabic refusal appears with a retry action.
5. Add a suggested word to vocabulary.
6. Review due vocabulary cards with all four grades.
7. Open **Grammar**, choose each of the seven topics, and confirm ten generated questions with four distinct options, immediate Egyptian Arabic explanations, and a result screen. With no AI key, the **Demo mode** badge should appear and every topic should still work.
8. Complete one AI drill session, start a second one, and confirm recorded weak-spot patterns appear as focus badges in the hub and are passed into the generated session.
9. Stop the API (or block network) and confirm the friendly Arabic error plus **Try generating again**. For articles, cases, and prepositions, also confirm **Use saved questions** starts the offline bank.
10. Build a sentence, check it, and reset it.
11. Open progress and follow a weak-spot deep link; it should open the matching topic drill.
12. Toggle Arabic/English and light/dark mode.
13. Install the PWA and reload while offline to verify the shell and local content.
14. Sign in with Supabase configured and confirm sync, guest-progress promotion, and custom scenario sync.
15. Open **Path**, complete the first lesson, and confirm the next lesson and unit unlock state update immediately. Reload to confirm the completion persisted.
16. Open **Listening**, play a sentence normally and slowly, submit a deliberately imperfect transcript, review the coloured word diff, and confirm the score is recorded.
17. Open **Speaking**, record a phrase or use the typed fallback, and confirm the per-sound scores and Arabic tips appear.
18. Visit `http://localhost:8787/api/health` and `/api/metrics`; confirm request IDs appear in response headers and counters increase after using the app.

---

## PWA and offline behaviour

- `vite-plugin-pwa` generates the manifest and service worker during `npm run build`.
- The service worker precaches the app shell, fonts, CSS, JS chunks, and icons.
- The generated manifest declares Arabic/RTL, standalone display, portrait orientation, theme colours, and two shortcuts (`/tutor`, `/vocabulary`).
- Icons are generated reproducibly with `apps/web/scripts/generate-icons.ps1` (192 px, 512 px, maskable 512 px, Apple touch icon).
- Core learning content, curriculum, listening dictation, pronunciation phrases, drills, vocabulary, and local progress remain available offline.
- Listening playback depends on installed German voices; pronunciation recording uses the browser/OS speech engine and may be limited offline.
- AI chat, AI word lookup, and Supabase sync require connectivity.
- Installing requires HTTPS (or localhost during development).

When deploying behind a CDN, serve `index.html` for unknown navigation routes so React Router can handle deep links such as `/tutor/cafe` and `/tutor/create`.

---

## Deployment

### Build

```bash
npm run build
```

Outputs:

- `apps/web/dist` — static web app
- `apps/api/dist` — compiled Express server

### Run the API

```bash
NODE_ENV=production npm run start --workspace @bruecke/api
```

On Windows PowerShell:

```powershell
$env:NODE_ENV = "production"
npm run start --workspace @bruecke/api
```

Set production values in the root `.env` or the host's environment:

- `AI_PROVIDER` (`anthropic` or `gemini`; leave `demo` out of production)
- `ANTHROPIC_API_KEY` or `GEMINI_API_KEY` for the selected provider
- `CLIENT_ORIGIN=https://your-web-origin`
- `PORT` as required by the host
- `TRUST_PROXY=1` when behind a trusted proxy
- `REDIS_URL` (optional) for shared rate-limit counters
- `LOG_REQUESTS=false` only if the host already captures request metadata another way

### Serve the web app

Serve `apps/web/dist` as static files with SPA fallback. Two common layouts:

1. **Same origin (recommended)** — reverse-proxy `/api/*` to the API server and everything else to the static build. Keep `VITE_API_BASE_URL=/api`; no CORS is involved.
2. **Separate origins** — set `VITE_API_BASE_URL=https://api.example.com/api` **before building**, and add the web origin to `CLIENT_ORIGIN` on the API.

Vite environment variables are baked in at build time. Rebuild the web app whenever they change.

### Production checklist

- [ ] The API key for the selected `AI_PROVIDER` is set on the server only.
- [ ] `AI_DEMO_MODE` is not `true`.
- [ ] `NODE_ENV=production`.
- [ ] `CLIENT_ORIGIN` lists every real web origin, including native app origins if applicable.
- [ ] HTTPS is enabled.
- [ ] Supabase migration applied and redirect URLs configured.
- [ ] `TRUST_PROXY=1` only if a trusted proxy terminates connections.
- [ ] `REDIS_URL` is set and reachable if you run multiple API instances.
- [ ] `/api/health` reports `rateLimitStore: "connected"` (or `disabled` for a single instance).
- [ ] Request logs and `/api/metrics` are wired into the host's logging/monitoring.
- [ ] SPA fallback and `/api` proxy are configured.
- [ ] The service worker and manifest load without console errors.

---

## Capacitor packaging guide

The repository now includes generated Android and iOS projects plus shared native speech plugins. The web build remains the source of truth; Capacitor copies it into `android/app/src/main/assets/public` and `ios/App/App/public`.

### What is configured

- `capacitor.config.ts` sets the app id `app.bruecke.deutsch`, the name **Deutsch Brücke**, and `webDir: apps/web/dist`.
- `@capacitor-community/text-to-speech` provides German device voices.
- `@capacitor-community/speech-recognition` provides microphone dictation for pronunciation practice.
- Android declares `INTERNET` and `RECORD_AUDIO` in `android/app/src/main/AndroidManifest.xml`.
- iOS declares `NSMicrophoneUsageDescription` and `NSSpeechRecognitionUsageDescription` in `ios/App/App/Info.plist`.

### Build and sync

```bash
# Rebuild the web app and copy it plus plugins into both native projects
npm run cap:sync

# Open the native IDE
npm run cap:android
npm run cap:ios
```

Inside Android Studio, build/run the `app` module on a device or emulator. In Xcode, select the `App` scheme and a simulator/device. The iOS build requires macOS and Xcode; Android requires the Android SDK and Java 21.

### Native considerations

- **API base URL** — a WebView cannot use the Vite dev proxy. Build with an absolute `VITE_API_BASE_URL=https://api.example.com/api`.
- **Allowed origins** — add `https://localhost` (Android) and `capacitor://localhost` (iOS) to the API's `CLIENT_ORIGIN` if the WebView calls the API directly.
- **Secrets** — never ship the Anthropic or Gemini key in the app. All AI calls stay behind your API.
- **Speech** — the app prefers native TTS and recognition when `Capacitor.isNativePlatform()` is true and falls back to the Web Speech API in a browser.
- **Permissions** — the first recording or dictation request prompts for microphone/speech access. If a user denies it, the pronunciation page offers the typed fallback.
- **Service worker** — native WebViews do not use the PWA service worker; bundled assets are already local. Keep the PWA target for browser installs.
- **Safe areas** — respect notches and gesture bars with `env(safe-area-inset-*)` in the shell.
- **Cleartext HTTP** — use HTTPS APIs in production; only allow cleartext in local Android debug builds.
- **Deep links** — map `/auth` and app routes to Android/iOS app links if email confirmation or OAuth should return to the app.

---

## Phase 2 — AI grammar drill sessions

Implemented in Phase 2:

- The grammar page is now a seven-topic practice hub (articles, cases, prepositions, verb position, separable verbs, subordinate clauses, plurals) with the existing quick guide kept as a second tab.
- Each topic generates ten questions through the server-side AI gateway, using the learner's CEFR level and recorded weak-spot patterns and counts.
- Every question is validated for four distinct options, exactly one correct option, a unique stem, and a non-empty explanation. Invalid items are discarded, one replacement request is attempted, then the deterministic 70-question bank fills any gap with a visible `fallbackCount` note.
- Generated sessions are cached by topic + level + normalized weak spots, and identical in-flight requests share one provider call.
- The demo provider returns ten deterministic questions for every topic, so the whole flow works without an API key. The saved article/case/preposition pools remain available as an explicit offline fallback.
- Arabic RTL layout, English toggle, German LTR isolation, and der/die/das colour coding are preserved in the new session UI, including loading skeletons, empty states, rate-limit/offline errors, and retry actions.
- API and frontend coverage was expanded for schemas, sanity checks, cache behaviour, endpoint orchestration, mapping, and static banks.

## Phase 3 — Path, listening, pronunciation, native shell, and observability

Implemented in Phase 3:

- **Structured A1–B1 path** — 9 units and 36 lessons sequence built-in scenarios, grammar drills, vocabulary, sentence building, listening, and pronunciation. Lessons unlock sequentially, units unlock after the previous unit, and the first unit is always open. A dedicated `curriculum_completions` table stores completions for signed-in learners; guest completions stay in local storage. Missing-table reads and saves degrade gracefully, so the app still works before the migration is applied.
- **Listening dictation** — a 24-clip bank across A1/A2/B1 with normal and slow TTS playback, first-letter and translation hints, shared word alignment, a word-level diff, and pass/fail scoring. Results feed analytics without creating grammar weak spots.
- **Pronunciation coach** — 18 phrases targeting difficult German sounds. The scorer approximates phonemes from grapheme rules and reports per-sound clarity, word accuracy, and Arabic tips. Native speech recognition is used inside Capacitor; the browser and typed fallback remain available.
- **Native packaging** — Capacitor 8 Android and iOS projects, native text-to-speech and speech recognition, and microphone/speech usage descriptions. Root scripts cover building, syncing, and opening each native project.
- **Shared rate limiting** — an optional Redis store with an atomic increment script, a shared client, a 15-second circuit breaker, and automatic per-process memory fallback. `REDIS_URL` and `RATE_LIMIT_STORE` control it.
- **Observability** — request IDs on every response, structured JSON request logs, enriched `/api/health`, and a JSON `/api/metrics` endpoint with request, timing, AI, cache, rate-limit, and server-error counters.
- Arabic RTL, the English toggle, German LTR isolation, and der/die/das colour coding are preserved across every new screen.

Automated coverage was expanded for curriculum progression, word alignment and dictation scoring, pronunciation scoring, metrics, request IDs, rate limiting, and Redis fallback. Native runtime builds still require Android Studio/Xcode and a device or emulator.

## Phase 4 — Free conversation and session recap
Implemented in Phase 4:

- **Free conversation** — a new card on the Tutor screen opens `/tutor/free`, a scenario-free chat at the learner's own level. The tutor still corrects gently and suggests vocabulary; the scenario is synthesized on both web and API so the existing chat pipeline is reused.
- **Session recap** — the "Finish & recap" button in any conversation opens a modal with the top three mistake patterns from that session, up to five review words added to the SRS deck in one tap, and one suggested next scenario matched to the learner's level.
- Mistake patterns continue to feed the weak-spots list on every turn, so drills and progress stay in sync.
- Arabic RTL, the English toggle, German LTR isolation, and der/die/das colour coding are preserved, with loading/empty/error states on the new surfaces.
- The demo provider returns deterministic free-chat replies, so the whole flow is testable without an API key.

Automated coverage includes the Modal focus-retention regression test and the existing web/API suites. Rate limiting, caching, Zod validation, retry-with-repair, and dual-provider parity are unchanged and apply to the free-chat path.

## Deploy for free

### API on Render (free web service)
- Root directory: repository root (or `apps/api` if deploying the workspace alone).
- Build command: `npm run build --workspace @bruecke/api`
- Start command: `npm run start --workspace @bruecke/api`
- The API reads `PORT` from the environment, binds to `0.0.0.0`, and exposes `GET /api/health` without auth.

### Web app on Cloudflare Pages
- Root directory: `apps/web`
- Build command: `npm run build`
- Build output directory: `dist`
- SPA fallback is provided by `apps/web/public/_redirects` (`/* /index.html 200`).

### Required environment variables
Render (API):
- `NODE_ENV=production`
- `CLIENT_ORIGIN` — your Cloudflare Pages URL (comma-separated for multiple origins)
- `ANTHROPIC_API_KEY` or `GEMINI_API_KEY` (secret) — at least one for live AI
- Optional: `AI_PROVIDER`, `AI_DEMO_MODE` (keep `false` in production), `REDIS_URL`, `TRUST_PROXY=1` behind a proxy, rate-limit overrides, `LOG_REQUESTS`

Cloudflare Pages (web):
- `VITE_API_BASE_URL` — your Render API URL (e.g. `https://your-api.onrender.com/api`)
- `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY` (optional, for accounts)

Secrets: all `*_API_KEY` values and Supabase keys. Never commit `.env`.

## Deploy on Vercel (free)

Deploy as one Vercel project (static web app + Express API as a serverless function):

- Root Directory: repository root
- Install Command: `npm install`
- Build Command: `npm run build`
- Output Directory: `apps/web/dist`
- Node.js Version: 20.x (set in the Vercel dashboard)

The Express app is exported from `api/index.ts` without calling `app.listen()`. `vercel.json` rewrites `/api/*` to the function and falls back all other routes to `/index.html`. `VITE_API_BASE_URL` defaults to `/api`, so the browser calls the same origin.

Notes:
- Hobby serverless functions support up to 300 seconds (`maxDuration`), so AI turns have room to complete. Keep prompts reasonable; upgrade for longer limits or higher concurrency.
- Rate limiting and caching are in-memory and per-instance in serverless; counters reset between invocations. The API still returns a clear 503 when no AI key is configured and never falls back to demo replies in production.
- `.env` is never committed; set all secrets in the Vercel dashboard.

Required environment variables on Vercel:
- `NODE_ENV=production`
- `CLIENT_ORIGIN` — your Vercel deployment URL (comma-separated for previews)
- `ANTHROPIC_API_KEY` or `GEMINI_API_KEY` (secret)
- Optional: `AI_PROVIDER`, `AI_DEMO_MODE=false`, `REDIS_URL`, `TRUST_PROXY=1`, rate-limit overrides, `LOG_REQUESTS`
- Web build needs `VITE_API_BASE_URL=/api` (default) plus optional Supabase keys.

---

## Troubleshooting

| Symptom | Fix |
| --- | --- |
| `npm` or `node` not found on Windows | Add Node.js to `PATH`, e.g. `$env:Path = "C:\Program Files\nodejs;$env:Path"`, then reopen the terminal. |
| Web loads but AI calls fail | Check `http://localhost:8787/api/health`. In development without a key, `ai` should report `demo` and `provider` should name the active gateway. |
| AI routes return `503 ai_not_configured` | A production server has no key for the selected provider. Set `ANTHROPIC_API_KEY` or `GEMINI_API_KEY` and restart. |
| CORS error | Add the exact web origin to `CLIENT_ORIGIN` (comma-separated) and restart the API. |
| Sign-in unavailable | `VITE_SUPABASE_URL` / `VITE_SUPABASE_ANON_KEY` are missing. The app deliberately stays in guest mode. |
| Sync status shows an error | Confirm the migration ran, RLS is enabled, and the signed-in user's `auth.uid()` matches `user_id`. Check the browser console for the Supabase error. |
| Custom scenario says “not found” | It may belong to another guest/account namespace. Open `/tutor`, confirm the card is listed, and avoid clearing site data while signed out. |
| Scenario generation is refused | The idea may be unsafe or unrelated to German conversation practice. Try an everyday situation such as a hotel, doctor, office, or shopping scene. |
| Drill generation shows the Arabic retry message | Check `http://localhost:8787/api/health` and the provider key/quota. If the failure persists, articles, cases, and prepositions can still run from the saved bank. |
| OAuth returns to the wrong place | Add `<web-origin>/auth` to Supabase redirect URLs and set the Site URL correctly. |
| PWA does not offer installation | Use HTTPS or localhost, confirm the manifest and service worker load, and clear old service workers during development. |
| Speech recognition does nothing | Use a browser/OS with Web Speech recognition (often Chrome/Edge/Android) or run the Capacitor app. The pronunciation page offers a typed fallback. |
| Microphone permission denied in the native app | Re-enable microphone/speech permissions in the OS settings. Android declares `RECORD_AUDIO`; iOS declares microphone and speech recognition usage strings. |
| Redis is configured but health says `degraded` | Check `REDIS_URL`, network access, and the Redis server. The limiter keeps serving requests from the in-memory fallback and retries after 15 seconds. |
| `/api/metrics` is empty after a restart | Metrics are in-process and intentionally reset with the process. Scrape after warm-up or forward the JSON request logs. |
| Native app shows a blank screen | Run `npm run cap:sync`, confirm `apps/web/dist` exists, and check that the WebView can reach the absolute `VITE_API_BASE_URL`. |
| `preview` shows API 404s | Run `npm run build`, then `npm run preview`; both apps must be running. The preview config proxies `/api` to port 8787. |
| Port already in use | Stop the conflicting process or change `PORT` and the Vite proxy target together. |

---

## Credits

- Arabic typeface: [Cairo](https://fonts.google.com/specimen/Cairo) via Fontsource.
- Latin/German typeface: [Inter](https://fonts.google.com/specimen/Inter) via Fontsource.
- Icons: [Lucide](https://lucide.dev).
- AI: [Anthropic Claude](https://www.anthropic.com) and [Google Gemini](https://ai.google.dev).
- Auth and database: [Supabase](https://supabase.com).
- Packaging path: [Capacitor](https://capacitorjs.com).

Deutsch Brücke is a private project; no redistribution licence has been granted.
