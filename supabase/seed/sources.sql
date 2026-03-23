-- Seed global approved RSS sources

insert into public.sources (team_id, url, name, type, status, relevance_score)
values
  (null, 'https://www.espn.com/espn/rss/nfl/news', 'ESPN NFL RSS', 'global'::source_type, 'approved'::source_status, 100),
  (null, 'https://profootballtalk.nbcsports.com/feed/', 'Pro Football Talk RSS', 'global'::source_type, 'approved'::source_status, 100),
  (null, 'https://www.nbcsports.com/profootballtalk.rss', 'NBC ProFootballTalk RSS', 'global'::source_type, 'approved'::source_status, 100),
  (null, 'https://www.espn.com/espn/rss/news', 'ESPN Sports RSS', 'global'::source_type, 'approved'::source_status, 90),
  (null, 'https://www.profootballrumors.com/feed', 'ProFootballRumors RSS', 'global'::source_type, 'approved'::source_status, 90),
  (null, 'https://www.cbssports.com/rss/headlines/nfl/', 'CBS Sports NFL RSS', 'global'::source_type, 'approved'::source_status, 90),
  (null, 'https://sports.yahoo.com/nfl/rss/', 'Yahoo NFL RSS', 'global'::source_type, 'approved'::source_status, 85)
on conflict (url) do nothing;

-- Seed team-specific RSS sources for Seattle Seahawks

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
    ('https://www.espn.com/espn/rss/nfl/team?team=sea', 'ESPN Seahawks RSS', 'team_specific', 'approved', 90)
) as s(url, name, type, status, relevance_score)
join public.teams t on t.slug = 'seattle-seahawks'
on conflict (url) do nothing;

-- Seed team-specific sources for Chicago Bears

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
    ('https://www.chicagobears.com/rss/news', 'Chicago Bears Official RSS', 'team_specific', 'pending', 0),
    ('https://www.espn.com/espn/rss/nfl/team?team=chi', 'ESPN Bears RSS', 'team_specific', 'pending', 0),
    ('https://www.windycitygridiron.com/rss/current.xml', 'Windy City Gridiron RSS', 'team_specific', 'pending', 0),
    ('https://beargoggleson.com/feed/', 'Bear Goggles On RSS', 'team_specific', 'pending', 0),
    ('https://www.profootballrumors.com/chicago-bears/feed', 'ProFootballRumors Bears RSS', 'team_specific', 'pending', 0),
    ('https://www.sportsmockery.com/chicago-bears/feed/', 'Sports Mockery Bears RSS', 'team_specific', 'pending', 0)
) as s(url, name, type, status, relevance_score)
join public.teams t on t.slug = 'chicago-bears'
on conflict (url) do nothing;

