-- Allow the same email to subscribe to multiple teams (one row per email + team).
alter table public.subscribers drop constraint if exists subscribers_email_key;

create unique index if not exists subscribers_email_lower_team_id_key
  on public.subscribers (lower(trim(email)), team_id);

create index if not exists idx_subscribers_team_active
  on public.subscribers (team_id)
  where is_active = true;
