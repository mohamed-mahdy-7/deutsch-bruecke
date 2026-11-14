-- ============================================================================
-- Deutsch Brücke — Enable Supabase Realtime for synced tables
-- ============================================================================
-- Run after 005_profiles_update_grant.sql.
--
-- Adds the tables the client syncs to the supabase_realtime publication so
-- postgres_changes events are delivered. Idempotent: skips tables already in
-- the publication.
--
-- Replica identity: the default (primary key / full row for tables without PK)
-- is enough for INSERT and UPDATE payloads. For UPDATE/DELETE to include the
-- OLD row values (useful for tombstones), set REPLICA IDENTITY FULL on the
-- tables that need it. That increases WAL volume on the free tier, so we only
-- enable it where the client merges by id.
-- ============================================================================

do $$
declare
  t text;
begin
  foreach t in array array[
    'profiles',
    'weak_spots',
    'vocab_cards',
    'drill_results',
    'conversations',
    'messages',
    'corrections',
    'daily_activity',
    'streaks',
    'custom_scenarios',
    'curriculum_completions'
  ] loop
    if not exists (
      select 1 from pg_publication_tables
      where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = t
    ) then
      execute format('alter publication supabase_realtime add table public.%I', t);
    end if;
  end loop;
end $$;

-- Full replica identity for the tables the client merges by id, so UPDATE/DELETE
-- payloads carry the previous row (tombstone support).
alter table public.profiles replica identity full;
alter table public.weak_spots replica identity full;
alter table public.vocab_cards replica identity full;
alter table public.custom_scenarios replica identity full;
alter table public.curriculum_completions replica identity full;
alter table public.streaks replica identity full;
alter table public.daily_activity replica identity full;

notify pgrst, 'reload schema';
