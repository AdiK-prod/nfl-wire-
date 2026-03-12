-- Core schema for NFL Wire

-- Enable required extensions (UUID generation, etc.)
create extension if not exists "uuid-ossp";

-- teams
create table if not exists public.teams (
  id uuid primary key default uuid_generate_v4(),
  name text not null,
  city text not null,
  slug text not null unique,
  abbreviation text not null,
  primary_color text not null,
  secondary_color text not null,
  accent_color text,
  logo_url text,
  division text not null,
  conference text not null,
  is_active boolean not null default false,
  created_at timestamptz not null default now()
);

-- subscribers
create table if not exists public.subscribers (
  id uuid primary key default uuid_generate_v4(),
  email text not null unique,
  team_id uuid not null references public.teams (id) on delete cascade,
  subscribed_at timestamptz not null default now(),
  is_active boolean not null default true,
  last_opened_at timestamptz,
  updated_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

-- sources
do $$
begin
  if not exists (select 1 from pg_type where typname = 'source_type') then
    create type source_type as enum ('global', 'team_specific', 'user_submitted');
  end if;
end
$$;

do $$
begin
  if not exists (select 1 from pg_type where typname = 'source_status') then
    create type source_status as enum ('pending', 'approved', 'rejected', 'flagged');
  end if;
end
$$;

create table if not exists public.sources (
  id uuid primary key default uuid_generate_v4(),
  team_id uuid references public.teams (id) on delete set null,
  url text not null unique,
  name text not null,
  type source_type not null,
  status source_status not null default 'pending',
  relevance_score integer,
  submitted_by text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- articles
do $$
begin
  if not exists (select 1 from pg_type where typname = 'article_category') then
    create type article_category as enum ('transaction', 'injury', 'game_analysis', 'rumor', 'general');
  end if;
end
$$;

create table if not exists public.articles (
  id uuid primary key default uuid_generate_v4(),
  source_id uuid not null references public.sources (id) on delete cascade,
  team_id uuid not null references public.teams (id) on delete cascade,
  title text not null,
  original_url text not null unique,
  raw_content text not null,
  ai_summary text,
  published_at timestamptz not null,
  relevance_confirmed boolean not null default false,
  category article_category,
  created_at timestamptz not null default now()
);

-- newsletters
do $$
begin
  if not exists (select 1 from pg_type where typname = 'newsletter_status') then
    create type newsletter_status as enum ('draft', 'sent');
  end if;
end
$$;

create table if not exists public.newsletters (
  id uuid primary key default uuid_generate_v4(),
  team_id uuid not null references public.teams (id) on delete cascade,
  sent_at timestamptz,
  subject_line text not null,
  html_content text not null,
  status newsletter_status not null default 'draft',
  created_at timestamptz not null default now()
);

-- newsletter_metrics
do $$
begin
  if not exists (select 1 from pg_type where typname = 'feedback_type') then
    create type feedback_type as enum ('thumbs_up', 'thumbs_down');
  end if;
end
$$;

create table if not exists public.newsletter_metrics (
  id uuid primary key default uuid_generate_v4(),
  newsletter_id uuid not null references public.newsletters (id) on delete cascade,
  subscriber_id uuid not null references public.subscribers (id) on delete cascade,
  opened_at timestamptz,
  feedback feedback_type,
  created_at timestamptz not null default now()
);

-- Indexes
create index if not exists idx_subscribers_email on public.subscribers (email);
create index if not exists idx_sources_status on public.sources (status);
create index if not exists idx_articles_team_published_at on public.articles (team_id, published_at);
create index if not exists idx_newsletters_team_sent_at on public.newsletters (team_id, sent_at);

