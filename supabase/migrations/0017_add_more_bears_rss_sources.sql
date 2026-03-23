-- Add additional Chicago Bears RSS sources to improve article coverage.

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
    ('https://www.windycitygridiron.com/rss/current.xml', 'Windy City Gridiron RSS', 'team_specific', 'pending', 0),
    ('https://beargoggleson.com/feed/', 'Bear Goggles On RSS', 'team_specific', 'pending', 0),
    ('https://www.profootballrumors.com/chicago-bears/feed', 'ProFootballRumors Bears RSS', 'team_specific', 'pending', 0),
    ('https://www.sportsmockery.com/chicago-bears/feed/', 'Sports Mockery Bears RSS', 'team_specific', 'pending', 0)
) as s(url, name, type, status, relevance_score)
join public.teams t on t.slug = 'chicago-bears'
on conflict (url) do nothing;

