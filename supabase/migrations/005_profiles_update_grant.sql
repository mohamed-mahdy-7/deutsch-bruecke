-- ============================================================================
-- Deutsch Brücke — Fix profiles UPDATE grant (post-Phase 2)
-- ============================================================================
-- Run after 004_ai_access.sql.
--
-- Problem: Phase 2 granted INSERT on a column list that included user_id and
-- created_at, but UPDATE only on the mutable columns. When the client upserts
-- a profile row that already exists, Postgres issues an UPDATE whose SET list
-- contains every column in the payload (including user_id and created_at),
-- which failed with 42501 "permission denied for table profiles" because those
-- two columns were not granted for UPDATE.
--
-- Fix: grant UPDATE on exactly the same column list as INSERT, and add an
-- explicit UPDATE-only policy so the intent is unambiguous. Idempotent.
-- ============================================================================

-- 1. Align the UPDATE grant with the INSERT grant.
revoke update on public.profiles from authenticated;
grant update (
  user_id, display_name, level, daily_goal_minutes, ui_language,
  native_dialect, theme, onboarding_completed, xp, created_at, updated_at
) on public.profiles to authenticated;

-- 2. Explicit UPDATE policy (in addition to the existing owner-all policy).
drop policy if exists "profiles_update_own" on public.profiles;
create policy "profiles_update_own"
  on public.profiles
  for update to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- 3. Keep RLS enabled.
alter table public.profiles enable row level security;

notify pgrst, 'reload schema';
