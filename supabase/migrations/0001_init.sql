-- Swerve: research data schema.
-- All access goes through the app's server routes using the service role key,
-- so RLS is enabled with no policies: the anon and authenticated roles can read or write nothing.

create table if not exists participants (
  id              uuid primary key default gen_random_uuid(),
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  consent_version text not null,
  age_band        text,            -- optional, 'Prefer not to say' allowed
  gender          text,
  nationality     text,            -- ISO 3166-1 alpha-2, 'NA' = prefer not to say
  residence       text,
  ip_country      text,            -- derived at the edge; the IP itself is never stored
  ip_region       text,
  timezone        text,
  language        text,
  device          text,            -- 'touch' | 'desktop'
  act_side        text not null check (act_side in ('left', 'right')),
  referred        boolean not null default false
);

create table if not exists responses (
  id          bigint generated always as identity primary key,
  participant uuid not null references participants(id) on delete cascade,
  client_id   text not null,       -- id generated on the device, makes retries idempotent
  session_id  text not null,
  run_id      text,                -- groups one 30-card deeper run
  mode        text not null check (mode in ('core', 'deeper')),
  position    int  not null,
  cell        int  not null,       -- 0..17 for the core design, -1 otherwise
  mech        text not null check (mech in ('lever', 'push')),
  a_type      text not null,
  a_n         int  not null,
  b_type      text not null,
  b_n         int  not null,
  risk        int  not null default 100,
  blame       boolean not null default false,
  is_catch    boolean not null default false,
  choice      text not null check (choice in ('act', 'leave')),
  side        text not null check (side in ('left', 'right')),
  input       text not null,
  rt_ms       int  not null,
  answered_at timestamptz not null,
  created_at  timestamptz not null default now(),
  unique (participant, client_id)
);

create index if not exists responses_participant_idx on responses (participant);
create index if not exists responses_mode_cell_idx on responses (mode, cell);

alter table participants enable row level security;
alter table responses enable row level security;

-- Analysis helper: share who acted in each core cell, excluding participants who failed both attention checks.
create or replace view core_cells with (security_invoker = true) as
with failed as (
  select participant from responses
  where is_catch and mode = 'core'
  group by participant having bool_and(choice = 'leave')
)
select mech, a_n, b_type, cell,
       count(*) as n,
       round(100.0 * avg((choice = 'act')::int), 1) as act_pct,
       percentile_cont(0.5) within group (order by rt_ms) as median_rt_ms
from responses
where mode = 'core' and not is_catch and participant not in (select participant from failed)
group by mech, a_n, b_type, cell
order by cell;

-- Keep the view off the public API as well.
revoke all on core_cells from anon, authenticated;
