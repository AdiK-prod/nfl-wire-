-- Track daily source relevance outcomes to support streak-based flagging.

create extension if not exists "pgcrypto";

create table if not exists public.source_relevance_daily (
  id uuid primary key default gen_random_uuid(),
  source_id uuid not null references public.sources (id) on delete cascade,
  team_id uuid references public.teams (id) on delete cascade,
  day_ymd date not null,
  total_items integer not null default 0,
  relevant_items integer not null default 0,
  teams_considered integer,
  teams_with_relevant integer,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (source_id, team_id, day_ymd)
);

create index if not exists idx_source_relevance_daily_source_day
  on public.source_relevance_daily (source_id, day_ymd desc);

