-- ============================================================================
-- Deutsch Brücke — Phase 2: AI access control, quotas and beta gate
-- ============================================================================
-- Run after 001_initial.sql, 002_custom_scenarios.sql and 003_curriculum.sql.
--
-- What this migration adds
--   * profiles.approved + profiles.role (beta gate / future reviewer role)
--   * invite_codes (redeemed through a SECURITY DEFINER RPC)
--   * ai_daily_usage (per-user, per-feature, per-UTC-day counters)
--   * ai_global_usage (one row per UTC day, the global circuit breaker)
--   * redeem_invite(code)          — user redeems an invite code
--   * consume_ai_call(...)         — atomic gate + quota + global cap
--   * get_ai_entitlement()         — read-only approved flag + today's usage
--
-- Security notes
--   * No service_role key is needed. The server calls the RPCs with the
--     learner's own access token; SECURITY DEFINER lets the function update
--     counters the learner cannot write directly.
--   * ai_daily_usage / ai_global_usage / invite_codes are NOT writable by
--     authenticated users. Only the definer functions touch them.
--   * profiles column grants are narrowed so a learner cannot approve
--     themselves or change their role.
-- ============================================================================

-- ---------------------------------------------------------------------------
-- 1. Profile flags
-- ---------------------------------------------------------------------------

alter table public.profiles
  add column if not exists approved boolean not null default false;

alter table public.profiles
  add column if not exists role text not null default 'learner';

do $$
begin
  alter table public.profiles
    add constraint profiles_role_check
    check (role in ('learner', 'reviewer', 'owner'));
exception
  when duplicate_object then null;
end $$;

create index if not exists profiles_approved_idx
  on public.profiles (approved)
  where approved = true;

-- Narrow privileges: the app may still upsert its own profile (display name,
-- level, goal, theme, xp) but must never write approved/role.
revoke all on public.profiles from authenticated;
grant select, delete on public.profiles to authenticated;
grant insert (
  user_id, display_name, level, daily_goal_minutes, ui_language,
  native_dialect, theme, onboarding_completed, xp, created_at, updated_at
) on public.profiles to authenticated;
grant update (
  display_name, level, daily_goal_minutes, ui_language, native_dialect,
  theme, onboarding_completed, xp, updated_at
) on public.profiles to authenticated;

-- ---------------------------------------------------------------------------
-- 2. Invite codes
-- ---------------------------------------------------------------------------

create table if not exists public.invite_codes (
  code text primary key,
  label text not null default '',
  max_uses integer not null default 1 check (max_uses > 0),
  uses integer not null default 0 check (uses >= 0),
  expires_at timestamptz,
  created_at timestamptz not null default now()
);

alter table public.invite_codes enable row level security;
-- Intentionally no policies: the table is reachable only through the
-- SECURITY DEFINER functions below.
revoke all on public.invite_codes from anon, authenticated;

-- ---------------------------------------------------------------------------
-- 3. Usage counters
-- ---------------------------------------------------------------------------

create table if not exists public.ai_daily_usage (
  user_id uuid not null references auth.users (id) on delete cascade,
  day date not null default (now() at time zone 'utc')::date,
  feature text not null
    check (feature in ('chat', 'scenario', 'drill', 'word', 'assist', 'recap')),
  count integer not null default 0 check (count >= 0),
  primary key (user_id, day, feature)
);

create index if not exists ai_daily_usage_day_idx
  on public.ai_daily_usage (day);

alter table public.ai_daily_usage enable row level security;

drop policy if exists "ai_daily_usage_owner_read" on public.ai_daily_usage;
create policy "ai_daily_usage_owner_read"
  on public.ai_daily_usage
  for select to authenticated
  using (auth.uid() = user_id);

revoke all on public.ai_daily_usage from anon;
revoke insert, update, delete on public.ai_daily_usage from authenticated;
grant select on public.ai_daily_usage to authenticated;

create table if not exists public.ai_global_usage (
  day date primary key,
  count integer not null default 0 check (count >= 0)
);

alter table public.ai_global_usage enable row level security;
-- No policies and no grants: only SECURITY DEFINER functions read/write it.
revoke all on public.ai_global_usage from anon, authenticated;

-- ---------------------------------------------------------------------------
-- 4. redeem_invite(code)
-- ---------------------------------------------------------------------------
-- Returns { ok: true } or { ok: false, reason: ... }. Marks the caller's
-- profile approved and consumes one use of the code atomically.
-- ---------------------------------------------------------------------------

create or replace function public.redeem_invite(p_code text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_code public.invite_codes%rowtype;
begin
  if v_uid is null then
    return jsonb_build_object('ok', false, 'reason', 'auth_required');
  end if;

  if p_code is null or length(trim(p_code)) = 0 then
    return jsonb_build_object('ok', false, 'reason', 'invalid_code');
  end if;

  select *
    into v_code
    from public.invite_codes
   where code = upper(trim(p_code))
   for update;

  if not found then
    return jsonb_build_object('ok', false, 'reason', 'invalid_code');
  end if;

  if v_code.expires_at is not null and v_code.expires_at < now() then
    return jsonb_build_object('ok', false, 'reason', 'expired');
  end if;

  if v_code.uses >= v_code.max_uses then
    return jsonb_build_object('ok', false, 'reason', 'used_up');
  end if;

  -- Ensure a profile row exists before setting the flag. The client upsert
  -- will later fill in display name / level without touching approved.
  insert into public.profiles (user_id)
  values (v_uid)
  on conflict (user_id) do nothing;

  update public.invite_codes
     set uses = uses + 1
   where code = v_code.code;

  update public.profiles
     set approved = true
   where user_id = v_uid;

  return jsonb_build_object('ok', true);
end;
$$;

revoke all on function public.redeem_invite(text) from public, anon;
grant execute on function public.redeem_invite(text) to authenticated;

-- ---------------------------------------------------------------------------
-- 5. consume_ai_call(feature, user_limit, global_cap, beta_gate)
-- ---------------------------------------------------------------------------
-- One atomic call enforces, in order:
--   1. the caller must be signed in,
--   2. the beta gate (when enabled) requires profiles.approved,
--   3. the global daily cap (when > 0),
--   4. the per-user per-feature daily quota.
-- It increments both counters only when the call is allowed, and always
-- returns the remaining allowance so the UI can show a quota meter.
--
-- The per-user quota is checked BEFORE the global counter is incremented,
-- so an exhausted user quota never burns global budget.
-- ---------------------------------------------------------------------------

create or replace function public.consume_ai_call(
  p_feature text,
  p_user_limit integer,
  p_global_cap integer,
  p_beta_gate boolean
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_day date := (now() at time zone 'utc')::date;
  v_approved boolean := false;
  v_used integer := 0;
  v_global integer := 0;
  v_limit integer := greatest(0, coalesce(p_user_limit, 0));
  v_cap integer := greatest(0, coalesce(p_global_cap, 0));
begin
  if v_uid is null then
    return jsonb_build_object('allowed', false, 'reason', 'auth_required');
  end if;

  select coalesce(approved, false)
    into v_approved
    from public.profiles
   where user_id = v_uid;

  v_approved := coalesce(v_approved, false);

  if p_beta_gate and not v_approved then
    return jsonb_build_object(
      'allowed', false,
      'reason', 'beta_not_approved',
      'approved', false,
      'used', 0,
      'limit', v_limit,
      'remaining', 0
    );
  end if;

  -- Make sure today's user row exists, then lock it for the quota check.
  insert into public.ai_daily_usage (user_id, day, feature, count)
  values (v_uid, v_day, p_feature, 0)
  on conflict (user_id, day, feature) do nothing;

  select count
    into v_used
    from public.ai_daily_usage
   where user_id = v_uid and day = v_day and feature = p_feature
   for update;

  if v_used >= v_limit then
    return jsonb_build_object(
      'allowed', false,
      'reason', 'quota_exhausted',
      'approved', v_approved,
      'used', v_used,
      'limit', v_limit,
      'remaining', 0
    );
  end if;

  -- Check the global circuit breaker after the user quota so a blocked user
  -- never consumes shared budget, but before incrementing anything.
  if v_cap > 0 then
    insert into public.ai_global_usage (day, count)
    values (v_day, 0)
    on conflict (day) do nothing;

    select count
      into v_global
      from public.ai_global_usage
     where day = v_day
     for update;

    if v_global >= v_cap then
      return jsonb_build_object(
        'allowed', false,
        'reason', 'global_cap',
        'approved', v_approved,
        'used', v_used,
        'limit', v_limit,
        'remaining', greatest(0, v_limit - v_used),
        'global_used', v_global,
        'global_cap', v_cap
      );
    end if;
  end if;

  update public.ai_daily_usage
     set count = count + 1
   where user_id = v_uid and day = v_day and feature = p_feature;

  if v_cap > 0 then
    update public.ai_global_usage
       set count = count + 1
     where day = v_day;
  end if;

  return jsonb_build_object(
    'allowed', true,
    'reason', 'ok',
    'approved', v_approved,
    'used', v_used + 1,
    'limit', v_limit,
    'remaining', greatest(0, v_limit - v_used - 1),
    'global_used', case when v_cap > 0 then v_global + 1 else null end,
    'global_cap', case when v_cap > 0 then v_cap else null end
  );
end;
$$;

revoke all on function public.consume_ai_call(text, integer, integer, boolean)
  from public, anon;
grant execute on function public.consume_ai_call(text, integer, integer, boolean)
  to authenticated;

-- ---------------------------------------------------------------------------
-- 6. get_ai_entitlement()
-- ---------------------------------------------------------------------------
-- Read-only helper for the UI quota meter. Returns:
--   { approved, day, usage: { chat: n, scenario: n, ... } }
-- ---------------------------------------------------------------------------

create or replace function public.get_ai_entitlement()
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_day date := (now() at time zone 'utc')::date;
  v_approved boolean := false;
  v_usage jsonb := '{}'::jsonb;
begin
  if v_uid is null then
    return jsonb_build_object('approved', false, 'day', v_day, 'usage', v_usage);
  end if;

  select coalesce(approved, false)
    into v_approved
    from public.profiles
   where user_id = v_uid;

  select coalesce(jsonb_object_agg(feature, count), '{}'::jsonb)
    into v_usage
    from public.ai_daily_usage
   where user_id = v_uid and day = v_day;

  return jsonb_build_object(
    'approved', coalesce(v_approved, false),
    'day', v_day,
    'usage', coalesce(v_usage, '{}'::jsonb)
  );
end;
$$;

revoke all on function public.get_ai_entitlement() from public, anon;
grant execute on function public.get_ai_entitlement() to authenticated;

notify pgrst, 'reload schema';
