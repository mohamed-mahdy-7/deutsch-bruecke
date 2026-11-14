-- ============================================================================
-- RLS smoke test for Deutsch Brücke
-- ============================================================================
-- HOW TO RUN:
-- 1. Create two test users in Supabase Auth (Authentication -> Users), e.g.
--    a@example.com and b@example.com. Copy their UUIDs.
-- 2. Replace the two UUID literals below with those user IDs.
-- 3. Open the Supabase SQL editor and run this whole file.
-- 4. A successful run prints "RLS check passed". Any failure raises an
--    exception and rolls back the test row.
--
-- This script assumes the 001_initial.sql (and later) migrations are applied.
-- It tests vocab_cards as a representative table; the same policy pattern is
-- used on every table.
-- ============================================================================

do $$
declare
  user_a uuid := '00000000-0000-0000-0000-000000000001'; -- replace
  user_b uuid := '00000000-0000-0000-0000-000000000002'; -- replace
begin
  -- User A inserts a row.
  perform set_config('request.jwt.claims', json_build_object('sub', user_a, 'role', 'authenticated')::text, true);
  set role authenticated;
  insert into public.vocab_cards (id, user_id, word, translation_ar)
  values ('rls-test-a', user_a, 'Hund', 'كلب')
  on conflict (id) do nothing;

  -- User B must not be able to read it.
  perform set_config('request.jwt.claims', json_build_object('sub', user_b, 'role', 'authenticated')::text, true);
  if exists (select 1 from public.vocab_cards where id = 'rls-test-a') then
    raise exception 'RLS FAIL: user B can READ user A row';
  end if;

  -- User B must not be able to update it.
  update public.vocab_cards set word = 'Katze' where id = 'rls-test-a';
  perform set_config('request.jwt.claims', json_build_object('sub', user_a, 'role', 'authenticated')::text, true);
  if exists (select 1 from public.vocab_cards where id = 'rls-test-a' and word = 'Katze') then
    raise exception 'RLS FAIL: user B can UPDATE user A row';
  end if;

  -- User B must not be able to delete it.
  perform set_config('request.jwt.claims', json_build_object('sub', user_b, 'role', 'authenticated')::text, true);
  delete from public.vocab_cards where id = 'rls-test-a';
  perform set_config('request.jwt.claims', json_build_object('sub', user_a, 'role', 'authenticated')::text, true);
  if not exists (select 1 from public.vocab_cards where id = 'rls-test-a') then
    raise exception 'RLS FAIL: user B can DELETE user A row';
  end if;

  -- Cleanup as user A.
  delete from public.vocab_cards where id = 'rls-test-a';
  reset role;
  raise notice 'RLS check passed: user B cannot read/modify user A rows.';
end $$;

-- Anonymous role must not read authenticated rows.
set role anon;
do $$
begin
  if exists (select 1 from public.vocab_cards limit 1) then
    raise exception 'RLS FAIL: anon can read vocab_cards';
  end if;
  raise notice 'RLS check passed: anon cannot read vocab_cards.';
end $$;
reset role;