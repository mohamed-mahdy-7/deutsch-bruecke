-- ============================================================================
-- Deutsch Brücke — initial schema
-- ============================================================================
-- Run this migration in the Supabase SQL editor (or via the Supabase CLI) once
-- per project. It is idempotent enough for a fresh project and matches the
-- columns read/written by apps/web/src/services/remoteProgress.ts.
--
-- Design notes
-- * Supabase Auth owns identities. Every table is keyed to auth.users(id) so
--   deleting an account cascades cleanly.
-- * Domain object IDs are text because the client generates prefixed IDs such
--   as "conv_<uuid>" and "v-kaffee". They are globally unique per user.
-- * The app deliberately does NOT create a profile with a database trigger.
--   On first sign-in the client promotes any guest progress and then upserts
--   the profile via saveRemoteProgress(). A trigger-created default profile
--   would make loadRemoteProgress() return an empty remote state and hide the
--   learner's guest progress.
-- * Row Level Security restricts every row to its owner.
-- ============================================================================

-- ---------------------------------------------------------------------------
-- Tables
-- ---------------------------------------------------------------------------

create table if not exists public.profiles (
  user_id uuid primary key references auth.users (id) on delete cascade,
  display_name text not null default '',
  level text not null default 'A1' check (level in ('A1', 'A2', 'B1')),
  daily_goal_minutes integer not null default 20 check (daily_goal_minutes between 5 and 240),
  ui_language text not null default 'ar' check (ui_language in ('ar', 'en')),
  native_dialect text not null default 'egyptian'
    check (native_dialect in ('egyptian', 'levantine', 'gulf', 'maghrebi', 'msa', 'other')),
  theme text not null default 'system' check (theme in ('light', 'dark', 'system')),
  onboarding_completed boolean not null default false,
  xp integer not null default 0 check (xp >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.weak_spots (
  id text primary key,
  user_id uuid not null references auth.users (id) on delete cascade,
  topic text not null
    check (topic in ('articles', 'cases', 'word_order', 'vocabulary', 'prepositions')),
  pattern text not null,
  label_ar text not null default '',
  label_en text not null default '',
  count integer not null default 0 check (count >= 0),
  last_seen timestamptz not null default now(),
  unique (user_id, topic, pattern)
);

create table if not exists public.vocab_cards (
  id text primary key,
  user_id uuid not null references auth.users (id) on delete cascade,
  word text not null,
  article text check (article is null or article in ('der', 'die', 'das')),
  plural text,
  translation_ar text not null default '',
  translation_en text not null default '',
  example_de text not null default '',
  example_ar text not null default '',
  level text not null default 'A1' check (level in ('A1', 'A2', 'B1')),
  category text not null default 'other'
    check (category in ('home', 'people', 'food', 'city', 'work', 'health', 'shopping', 'other')),
  ease numeric(4, 2) not null default 2.5 check (ease >= 1.3 and ease <= 5),
  interval_days integer not null default 0 check (interval_days >= 0),
  repetitions integer not null default 0 check (repetitions >= 0),
  due_date timestamptz not null default now(),
  created_at timestamptz not null default now(),
  last_reviewed_at timestamptz,
  source text not null default 'manual' check (source in ('seed', 'chat', 'manual'))
);

create table if not exists public.drill_results (
  id text primary key,
  user_id uuid not null references auth.users (id) on delete cascade,
  topic text not null
    check (topic in ('articles', 'cases', 'word_order', 'vocabulary', 'prepositions')),
  pattern text not null,
  question_id text not null,
  correct boolean not null default false,
  created_at timestamptz not null default now()
);

create table if not exists public.conversations (
  id text primary key,
  user_id uuid not null references auth.users (id) on delete cascade,
  scenario_id text not null
    check (scenario_id in ('cafe', 'doctor', 'interview', 'office', 'shopping')),
  started_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.messages (
  id text primary key,
  user_id uuid not null references auth.users (id) on delete cascade,
  conversation_id text not null references public.conversations (id) on delete cascade,
  role text not null check (role in ('user', 'assistant')),
  content_de text not null,
  translation_ar text,
  vocabulary jsonb,
  is_starter boolean not null default false,
  mode text check (mode is null or mode in ('live', 'demo')),
  created_at timestamptz not null default now()
);

create table if not exists public.corrections (
  id text primary key,
  user_id uuid not null references auth.users (id) on delete cascade,
  message_id text not null unique references public.messages (id) on delete cascade,
  corrected text not null default '',
  praise_ar text not null default '',
  mistakes jsonb not null default '[]'::jsonb,
  follow_up_question_de text not null default '',
  created_at timestamptz not null default now()
);

create table if not exists public.daily_activity (
  user_id uuid not null references auth.users (id) on delete cascade,
  date date not null,
  xp integer not null default 0 check (xp >= 0),
  seconds integer not null default 0 check (seconds >= 0),
  primary key (user_id, date)
);

create table if not exists public.streaks (
  user_id uuid primary key references auth.users (id) on delete cascade,
  current_streak integer not null default 0 check (current_streak >= 0),
  longest_streak integer not null default 0 check (longest_streak >= 0),
  last_practice_date date,
  updated_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- Indexes
-- ---------------------------------------------------------------------------

create index if not exists weak_spots_user_idx
  on public.weak_spots (user_id);

create index if not exists vocab_cards_user_due_idx
  on public.vocab_cards (user_id, due_date);

create index if not exists vocab_cards_user_created_idx
  on public.vocab_cards (user_id, created_at);

create index if not exists drill_results_user_created_idx
  on public.drill_results (user_id, created_at desc);

create index if not exists conversations_user_updated_idx
  on public.conversations (user_id, updated_at desc);

create index if not exists messages_conversation_created_idx
  on public.messages (conversation_id, created_at);

create index if not exists messages_user_idx
  on public.messages (user_id);

create index if not exists corrections_user_idx
  on public.corrections (user_id);

-- ---------------------------------------------------------------------------
-- Row Level Security
-- ---------------------------------------------------------------------------

alter table public.profiles enable row level security;
alter table public.weak_spots enable row level security;
alter table public.vocab_cards enable row level security;
alter table public.drill_results enable row level security;
alter table public.conversations enable row level security;
alter table public.messages enable row level security;
alter table public.corrections enable row level security;
alter table public.daily_activity enable row level security;
alter table public.streaks enable row level security;

drop policy if exists "profiles_owner_all" on public.profiles;
create policy "profiles_owner_all" on public.profiles
  for all to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "weak_spots_owner_all" on public.weak_spots;
create policy "weak_spots_owner_all" on public.weak_spots
  for all to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "vocab_cards_owner_all" on public.vocab_cards;
create policy "vocab_cards_owner_all" on public.vocab_cards
  for all to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "drill_results_owner_all" on public.drill_results;
create policy "drill_results_owner_all" on public.drill_results
  for all to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "conversations_owner_all" on public.conversations;
create policy "conversations_owner_all" on public.conversations
  for all to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "messages_owner_all" on public.messages;
create policy "messages_owner_all" on public.messages
  for all to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "corrections_owner_all" on public.corrections;
create policy "corrections_owner_all" on public.corrections
  for all to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "daily_activity_owner_all" on public.daily_activity;
create policy "daily_activity_owner_all" on public.daily_activity
  for all to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "streaks_owner_all" on public.streaks;
create policy "streaks_owner_all" on public.streaks
  for all to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- ---------------------------------------------------------------------------
-- Privileges (defense in depth; RLS is still the primary guard)
-- ---------------------------------------------------------------------------

revoke all on public.profiles from anon;
revoke all on public.weak_spots from anon;
revoke all on public.vocab_cards from anon;
revoke all on public.drill_results from anon;
revoke all on public.conversations from anon;
revoke all on public.messages from anon;
revoke all on public.corrections from anon;
revoke all on public.daily_activity from anon;
revoke all on public.streaks from anon;

grant select, insert, update, delete on public.profiles to authenticated;
grant select, insert, update, delete on public.weak_spots to authenticated;
grant select, insert, update, delete on public.vocab_cards to authenticated;
grant select, insert, update, delete on public.drill_results to authenticated;
grant select, insert, update, delete on public.conversations to authenticated;
grant select, insert, update, delete on public.messages to authenticated;
grant select, insert, update, delete on public.corrections to authenticated;
grant select, insert, update, delete on public.daily_activity to authenticated;
grant select, insert, update, delete on public.streaks to authenticated;

-- ---------------------------------------------------------------------------
-- Reload PostgREST's schema cache so the new tables are visible immediately.
-- ---------------------------------------------------------------------------
notify pgrst, 'reload schema';
