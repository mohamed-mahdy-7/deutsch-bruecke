# Deutsch Brücke — دويتش بروكه

**An Arabic-first AI German tutor built for Egyptian Arabic speakers learning A1–B1 German.**

Deutsch Brücke combines short role-play conversations, gentle inline corrections, grammar drills driven by the learner's own mistakes, a sentence builder, and a spaced-repetition vocabulary trainer. The interface is Arabic and RTL by default, German is always isolated LTR, and every grammar explanation is written in warm Egyptian colloquial Arabic.

The app runs as a guest out of the box with local-first progress. Supabase is optional and adds cross-device accounts and sync.

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
- **Speech support** — German text can be spoken with the Web Speech API (`de-DE`), and supported browsers can dictate learner turns.
- **Word help** — tap a German word for a local dictionary lookup first; when online, the AI can fill in article, plural, meaning, and an example.
- **Grammar trainers** — article and case drills plus preposition drills. Questions are sampled with a bias toward the learner's existing weak patterns while preserving variety.
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
| Testing | Vitest (unit tests for API JSON parsing, SRS, adaptive selection, German segmentation) |
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
│   │       ├── lib/              # JSON extraction, errors, HTTP helpers
│   │       ├── middleware/       # JSON-aware rate limiter
│   │       ├── prompts/          # tutor, assist, word, and scenario prompts
│   │       ├── services/ai.ts    # Anthropic, Gemini, and demo gateways
│   │       └── services/scenarioCache.ts # normalized cache + in-flight dedupe
│   └── web                       # React PWA
│       ├── public/               # icons, favicon
│       ├── scripts/              # reproducible icon generation
│       └── src
│           ├── components/       # UI, layout, German, tutor components
│           ├── config/           # browser-safe env
│           ├── data/             # scenarios, vocab, drills, sentences, placement
│           ├── hooks/            # speech, online, install
│           ├── lib/              # SRS, adaptive, dates, German highlighting, i18n
│           ├── pages/            # route screens
│           ├── providers/        # settings/theme/language
│           ├── services/         # AI client, local store, Supabase, dictionary
│           ├── state/            # auth, progress, factories, merge, mutations
│           ├── styles/           # Tailwind layers and design tokens
│           └── types/            # canonical domain model
├── supabase
│   └── migrations
│       ├── 001_initial.sql
│       └── 002_custom_scenarios.sql
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
| `TRUST_PROXY` | `0` | API | Set to `1` only behind a trusted reverse proxy so rate limits use the real client IP. |

Restart the dev server after changing `.env` or Vite values.

`npm run build` forces `NODE_ENV=production` for Vite, so a local `NODE_ENV=development` in `.env` cannot downgrade the production web bundle. Set `NODE_ENV=production` in the shell or host environment when running the API in production.

---

## AI providers, modes, and safeguards

Select the AI backend with `AI_PROVIDER=anthropic | gemini | demo`. When it is unset, the API prefers Anthropic, then Gemini, then falls back to the demo tutor in development. `AI_DEMO_MODE=true` always wins, so local UI work never calls a paid API by accident.

Both live gateways reuse the same system prompts, Zod schemas, history window, and one-shot JSON repair path. `/api/health` reports the active gateway:

```json
{
  "ok": true,
  "data": {
    "status": "ok",
    "ai": "live",
    "provider": "gemini",
    "timestamp": "2026-01-01T00:00:00.000Z"
  }
}
```

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
- Every request body is validated with Zod and capped at 32 kB.
- Responses are validated against Zod; Markdown fences are stripped and malformed output gets one repair attempt.
- `helmet` sets security headers; CORS is an explicit allow-list.
- JSON-aware rate limiters protect chat, assist, word, and scenario-generation routes per IP.
- Errors are normalised into a stable envelope; internal errors are logged, not leaked.
- The tutor prompt treats learner text and history as untrusted data and refuses prompt-extraction and off-topic requests.
- Conversation history is limited to 12 items by the request schema and trimmed again before the Anthropic call.
- The tutor is instructed to cap German at the learner's CEFR level and to keep corrections focused.

> **Rate limits are in-memory.** They reset on restart and are per process. For multi-instance deployments, replace the limiter store with Redis or another shared store.

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

---

## Supabase setup (optional)

Guest mode is the default and needs no backend account. To enable accounts and cross-device sync:

### 1. Create a project

Create a project at [supabase.com](https://supabase.com). Note the project URL and anon key from **Project Settings → API**.

### 2. Run the migration

Open the Supabase **SQL Editor**, paste the contents of [`supabase/migrations/001_initial.sql`](supabase/migrations/001_initial.sql), run it, then repeat with [`supabase/migrations/002_custom_scenarios.sql`](supabase/migrations/002_custom_scenarios.sql). Fresh projects run both in order; existing projects only need `002`.

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
- When both local and remote state exist for the same account, they are merged; the browser then debounces writes to Supabase by two seconds. Custom scenarios merge by `id`, keeping the newest `updatedAt`.
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
    "details": [{ "path": "learnerMessage", "message": "String must contain at most 500 character(s)" }]
  }
}
```

`/api/health` returns `{ "ok": true, "data": { ... } }` without `meta`.

### Endpoints

| Method | Path | Purpose | Rate limit |
| --- | --- | --- | --- |
| `GET` | `/api/health` | Status, AI mode and active provider, timestamp | None |
| `POST` | `/api/chat` | One tutor turn with correction and vocabulary | `CHAT_RATE_*` |
| `POST` | `/api/scenarios/generate` | Turn one learner idea into a validated, editable scenario | `SCENARIO_RATE_*` |
| `POST` | `/api/assist` | Explain, simplify, or translate a German snippet | `ASSIST_RATE_*` |
| `POST` | `/api/word` | Dictionary details for a single word | `WORD_RATE_*` |

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
- **`ProgressProvider`** is the single source of truth for learning data. It hydrates guest or account progress, exposes typed mutations, debounces remote saves, tracks active minutes, records chat mistakes as weak spots, and merges local/remote state on sign-in.
- **`CustomScenariosProvider`** owns learner-generated scenarios. It merges per-owner local storage, promoted guest scenarios, and Supabase rows by `updatedAt`, then exposes save, delete, duplicate, and lookup helpers. Scenario generation itself happens in `CustomScenarioPage`.
- **Services** isolate side effects: `ai.ts` (typed Zod client), `customScenarioStore.ts` (validated local persistence and merging), `remoteCustomScenarios.ts` (Supabase sync), `customScenarioMapping.ts` (API/domain/chat mapping), `supabaseClient.ts`, `remoteProgress.ts`, `localStore.ts`, `dictionary.ts`, and `wordLookup.ts`.
- **Domain types** in `types/domain.ts` are shared by seed data, state, services, and UI.
- **Route gates** distinguish anonymous, guest, and authenticated users; guests can still open `/auth` to promote progress, while authenticated users are redirected away from it.

### API

- `config.ts` resolves the shared root `.env`, validates numeric settings, and decides the AI mode.
- `app.ts` composes Express middleware, rate limiters, Zod validation, scenario lookup, custom scenario resolution, and response envelopes.
- `prompts/` contains the tutor, assist, word, and scenario prompts. The tutor prompt enforces the CEFR cap, correction contract, Egyptian Arabic voice, safety boundaries, formality, tone, grammar focus, key vocabulary, and JSON output. The scenario prompt isolates learner ideas as untrusted data and defines refusal rules.
- `services/ai.ts` defines an `AiGateway` interface with live and demo implementations. The live gateway retries once with a repair instruction when structured JSON is invalid. The demo gateway returns deterministic scenarios for the full creator flow.
- `services/scenarioCache.ts` normalizes ideas (case, punctuation, spacing, Arabic diacritics), caches completed scenarios for 30 minutes, and de-duplicates concurrent identical requests.
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
        └── AI client ── POST /api/* ──► Express ──► Anthropic
                                              └──► Zod validate/retry
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
| Grammar drill questions | 40 |
| · Article questions | 12 |
| · Case questions | 18 |
| · Preposition questions | 10 |
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

Workspace-specific examples:

```bash
npm run dev --workspace @bruecke/web
npm run dev --workspace @bruecke/api
npm run build --workspace @bruecke/web
npm test --workspace @bruecke/web
```

---

## Testing and verification

The repository currently includes 93 unit tests:

- API JSON extraction and structured-response parsing.
- API request/model schemas, including custom scenario limits, formality/article validation, and refusal shapes.
- Endpoint tests for scenario generation: validation, tone attachment, explicit level/formality override, cache hits, forced regeneration, refusal mapping, and custom-chat resolution.
- Scenario cache normalization, TTL expiry, concurrent de-duplication, and refresh semantics.
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
7. Complete an article/case drill and a preposition drill.
8. Build a sentence, check it, and reset it.
9. Open progress and follow a weak-spot deep link.
10. Toggle Arabic/English and light/dark mode.
11. Install the PWA and reload while offline to verify the shell and local content.
12. Sign in with Supabase configured and confirm sync, guest-progress promotion, and custom scenario sync.

---

## PWA and offline behaviour

- `vite-plugin-pwa` generates the manifest and service worker during `npm run build`.
- The service worker precaches the app shell, fonts, CSS, JS chunks, and icons.
- The generated manifest declares Arabic/RTL, standalone display, portrait orientation, theme colours, and two shortcuts (`/tutor`, `/vocabulary`).
- Icons are generated reproducibly with `apps/web/scripts/generate-icons.ps1` (192 px, 512 px, maskable 512 px, Apple touch icon).
- Core learning content, drills, vocabulary, and local progress remain available offline.
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
- [ ] Rate-limit storage is shared if you run multiple API instances.
- [ ] SPA fallback and `/api` proxy are configured.
- [ ] The service worker and manifest load without console errors.

---

## Capacitor packaging guide

Phase 1 is a PWA. The architecture is ready for a Capacitor wrapper in Phase 2:

```bash
npm install @capacitor/core @capacitor/cli @capacitor/android
npx cap init "Deutsch Brücke" "app.bruecke.deutsch" --web-dir "apps/web/dist"
npx cap add android
npm run build
npx cap sync
npx cap open android
```

For iOS, install `@capacitor/ios` and add the iOS platform similarly. Capacitor requires macOS and Xcode for iOS builds.

### Native considerations

- **API base URL** — a WebView cannot use the Vite dev proxy. Build with an absolute `VITE_API_BASE_URL=https://api.example.com/api`.
- **Allowed origins** — add `https://localhost` (Android) and `capacitor://localhost` (iOS) to the API's `CLIENT_ORIGIN` if the WebView calls the API directly.
- **Secrets** — never ship the Anthropic key in the app. All AI calls stay behind your API.
- **Speech** — Android WebView supports speech synthesis; speech recognition support varies by WebView/OS. A native speech plugin is the reliable path if dictation becomes a core native feature.
- **Service worker** — native WebViews do not use the PWA service worker; bundled assets are already local. Keep the PWA target for browser installs.
- **Safe areas** — respect notches and gesture bars with `env(safe-area-inset-*)` in the shell.
- **Cleartext HTTP** — use HTTPS APIs in production; only allow cleartext in local Android debug builds.
- **Deep links** — map `/auth` and app routes to Android/iOS app links if email confirmation or OAuth should return to the app.

---

## Phase 2

Designed but intentionally not implemented in Phase 1:

- A pronunciation coach with phoneme-level feedback.
- Listening dictation exercises.
- A structured A1–B1 curriculum that sequences scenarios, grammar, and vocabulary into a guided path.
- Native packaging and native speech plugins via Capacitor.
- Shared rate-limit storage and richer observability for multi-instance deployments.

The current domain model, skill-tracking tables, and deep-linkable trainers are structured so these can be added without rewriting the learning state.

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
| OAuth returns to the wrong place | Add `<web-origin>/auth` to Supabase redirect URLs and set the Site URL correctly. |
| PWA does not offer installation | Use HTTPS or localhost, confirm the manifest and service worker load, and clear old service workers during development. |
| Speech recognition does nothing | Use a browser/OS with Web Speech recognition (often Chrome/Edge/Android). Typing and speech playback remain available. |
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
