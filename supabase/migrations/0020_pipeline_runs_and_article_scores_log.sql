-- Pipeline observability tables (PRD). Read by admin UI; writes from edge functions only.

create extension if not exists pgcrypto;

create table if not exists public.pipeline_runs (
  id uuid primary key default gen_random_uuid(),
  team_id uuid not null references public.teams (id) on delete cascade,
  run_at timestamptz not null default now(),
  articles_fetched integer not null default 0,
  articles_passed_quality_gate integer not null default 0,
  articles_scored integer not null default 0,
  articles_selected integer not null default 0,
  status text not null default 'completed' check (status in ('completed', 'failed', 'partial')),
  notes text
);

create index if not exists idx_pipeline_runs_team_run_at on public.pipeline_runs (team_id, run_at desc);

create table if not exists public.article_scores_log (
  id uuid primary key default gen_random_uuid(),
  pipeline_run_id uuid not null references public.pipeline_runs (id) on delete cascade,
  article_id uuid not null references public.articles (id) on delete cascade,
  team_id uuid not null references public.teams (id) on delete cascade,
  source_id uuid not null references public.sources (id) on delete cascade,
  source_name text not null,
  fetch_date date not null,
  headline text not null,
  original_url text not null,
  word_count integer,
  relevance_score integer,
  significance_score integer,
  credibility_score integer,
  uniqueness_score integer,
  composite_score integer not null default 0,
  selection_reasoning text,
  passed_quality_gate boolean not null default false,
  passed_threshold boolean not null default false,
  rejection_reason text,
  threshold_at_time integer,
  summary_generated boolean not null default false
);

create index if not exists idx_article_scores_log_team_fetch on public.article_scores_log (team_id, fetch_date desc);
create index if not exists idx_article_scores_log_pipeline on public.article_scores_log (pipeline_run_id);

alter table public.pipeline_runs enable row level security;
alter table public.article_scores_log enable row level security;

drop policy if exists "admin_read_pipeline_runs" on public.pipeline_runs;
create policy "admin_read_pipeline_runs" on public.pipeline_runs for select to authenticated using (
  exists (select 1 from public.admin_users au where au.user_id = auth.uid())
);

drop policy if exists "admin_read_article_scores_log" on public.article_scores_log;
create policy "admin_read_article_scores_log" on public.article_scores_log for select to authenticated using (
  exists (select 1 from public.admin_users au where au.user_id = auth.uid())
);
