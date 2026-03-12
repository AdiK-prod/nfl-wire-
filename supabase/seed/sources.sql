-- Seed global approved sources

insert into public.sources (team_id, url, name, type, status, relevance_score)
values
  (null, 'https://www.espn.com/nfl/', 'ESPN NFL', 'global'::source_type, 'approved'::source_status, 100),
  (null, 'https://www.nfl.com/news', 'NFL.com', 'global'::source_type, 'approved'::source_status, 100),
  (null, 'https://apnews.com/hub/nfl', 'AP Sports NFL', 'global'::source_type, 'approved'::source_status, 100),
  (null, 'https://www.cbssports.com/nfl/news/', 'CBS Sports NFL', 'global'::source_type, 'approved'::source_status, 100),
  (null, 'https://www.si.com/nfl', 'Sports Illustrated NFL', 'global'::source_type, 'approved'::source_status, 100),
  (null, 'https://www.theringer.com/nfl', 'The Ringer NFL', 'global'::source_type, 'approved'::source_status, 100),
  (null, 'https://www.profootballtalk.com/', 'Pro Football Talk', 'global'::source_type, 'approved'::source_status, 100),
  (null, 'https://www.espn.com/nfl/insider/', 'ESPN Insider', 'global'::source_type, 'approved'::source_status, 100);

-- Seed team-specific sources for Seattle Seahawks

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
    ('https://www.seahawks.com/news', 'Seahawks Official', 'team_specific', 'approved', 100),
    ('https://www.fieldgulls.com/', 'Field Gulls', 'team_specific', 'approved', 95)
) as s(url, name, type, status, relevance_score)
join public.teams t on t.slug = 'seattle-seahawks';

