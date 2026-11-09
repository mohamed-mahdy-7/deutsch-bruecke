-- ============================================================================
-- Deutsch Brücke — custom AI scenarios
-- ============================================================================
-- Run this migration once on an existing project that already applied
-- 001_initial.sql. Fresh projects can run 001 + 002 in order.
--
-- Custom scenarios are owned by a signed-in learner. The browser keeps a local
-- copy for offline/guest use and syncs this table when Supabase is configured.
-- The validated scenario lives in `data` (JSONB); `updated_at` is used for
-- last-write-wins conflict resolution across devices.
-- ============================================================================

-- Allow conversation rows to reference learner-generated scenario ids while
-- keeping the built-in allow-list intact.
alter table public.conversations
  drop constraint if exists conversations_scenario_id_check;

alter table public.conversations
  add constraint conversations_scenario_id_check
  check (
    scenario_id in ('cafe', 'doctor', 'interview', 'office', 'shopping')
    or scenario_id ~ '^custom_[A-Za-z0-9_-]+$'
  );

create table if not exists public.custom_scenarios (
  user_id uuid not null references auth.users (id) on delete cascade,
  id text not null,
  data jsonb not null check (jsonb_typeof(data) = 'object'),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (user_id, id)
);

create index if not exists custom_scenarios_user_updated_idx
  on public.custom_scenarios (user_id, updated_at desc);

alter table public.custom_scenarios enable row level security;

drop policy if exists "custom_scenarios_owner_all" on public.custom_scenarios;
create policy "custom_scenarios_owner_all" on public.custom_scenarios
  for all to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

revoke all on public.custom_scenarios from anon;
grant select, insert, update, delete on public.custom_scenarios to authenticated;

notify pgrst, 'reload schema';
