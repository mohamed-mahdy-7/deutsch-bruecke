-- ============================================================================
-- Deutsch Brücke — curriculum completions
-- ============================================================================
-- Run this migration once on an existing project that already applied
-- 001_initial.sql (and optionally 002_custom_scenarios.sql). Fresh projects can
-- run 001, 002, 003 in order.
--
-- Lesson content itself is static and versioned in the web app. The database
-- only stores which lesson ids a signed-in learner has finished. The client
-- ignores this table when it is missing, so older deployments keep working
-- while the migration is being rolled out.
-- ============================================================================

create table if not exists public.curriculum_completions (
  user_id uuid not null references auth.users (id) on delete cascade,
  lesson_id text not null,
  completed_at timestamptz not null default now(),
  score numeric(5, 2) check (score is null or (score >= 0 and score <= 100)),
  primary key (user_id, lesson_id)
);

create index if not exists curriculum_completions_user_time_idx
  on public.curriculum_completions (user_id, completed_at);

alter table public.curriculum_completions enable row level security;

drop policy if exists "curriculum_completions_owner_all"
  on public.curriculum_completions;
create policy "curriculum_completions_owner_all"
  on public.curriculum_completions
  for all to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

revoke all on public.curriculum_completions from anon;
grant select, insert, update, delete on public.curriculum_completions to authenticated;

notify pgrst, 'reload schema';
