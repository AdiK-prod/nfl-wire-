-- Restore previously used RSS source catalog (global + Seahawks + Bears)
-- and ensure they are approved for ingestion.

insert into public.sources (team_id, url, name, type, status, relevance_score)
values
  (null, 'https://www.espn.com/espn/rss/nfl/news', 'ESPN NFL RSS', 'global'::source_type, 'approved'::source_status, 100),
  (null, 'https://profootballtalk.nbcsports.com/feed/', 'Pro Football Talk RSS', 'global'::source_type, 'approved'::source_status, 100),
  (null, 'https://www.nbcsports.com/profootballtalk.rss', 'NBC ProFootballTalk RSS', 'global'::source_type, 'approved'::source_status, 100),
  (null, 'https://www.espn.com/espn/rss/news', 'ESPN Sports RSS', 'global'::source_type, 'approved'::source_status, 90),
  (null, 'https://www.profootballrumors.com/feed', 'ProFootballRumors RSS', 'global'::source_type, 'approved'::source_status, 90),
  (null, 'https://www.cbssports.com/rss/headlines/nfl/', 'CBS Sports NFL RSS', 'global'::source_type, 'approved'::source_status, 90),
  (null, 'https://sports.yahoo.com/nfl/rss/', 'Yahoo NFL RSS', 'global'::source_type, 'approved'::source_status, 85)
on conflict (url) do update
set name = excluded.name,
    type = excluded.type,
    status = 'approved',
    relevance_score = excluded.relevance_score,
    updated_at = now();

insert into public.sources (team_id, url, name, type, status, relevance_score)
select
  t.id,
  s.url,
  s.name,
  s.type::source_type,
  s.status::source_status,
  s.relevance_score
from (
  values
    ('https://12thmanrising.com/feed', '12th Man Rising RSS', 'team_specific', 'approved', 90),
    ('https://www.fieldgulls.com/rss/index.xml', 'Field Gulls RSS', 'team_specific', 'approved', 90),
    ('https://www.espn.com/espn/rss/nfl/team?team=sea', 'ESPN Seahawks RSS', 'team_specific', 'approved', 90),
    ('https://www.chicagobears.com/rss/news', 'Chicago Bears Official RSS', 'team_specific', 'approved', 100),
    ('https://www.espn.com/espn/rss/nfl/team?team=chi', 'ESPN Bears RSS', 'team_specific', 'approved', 100),
    ('https://www.windycitygridiron.com/rss/current.xml', 'Windy City Gridiron RSS', 'team_specific', 'approved', 100),
    ('https://beargoggleson.com/feed/', 'Bear Goggles On RSS', 'team_specific', 'approved', 95),
    ('https://www.profootballrumors.com/chicago-bears/feed', 'ProFootballRumors Bears RSS', 'team_specific', 'approved', 85),
    ('https://www.sportsmockery.com/chicago-bears/feed/', 'Sports Mockery Bears RSS', 'team_specific', 'approved', 90)
) as s(url, name, type, status, relevance_score)
join public.teams t
  on t.slug = case
    when s.url like '%team=sea%' or s.url like '%12thmanrising%' or s.url like '%fieldgulls%' then 'seattle-seahawks'
    else 'chicago-bears'
  end
on conflict (url) do update
set team_id = excluded.team_id,
    name = excluded.name,
    type = excluded.type,
    status = 'approved',
    relevance_score = excluded.relevance_score,
    updated_at = now();

