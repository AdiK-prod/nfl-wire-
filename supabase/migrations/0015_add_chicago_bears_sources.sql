-- Add baseline Chicago Bears sources as pending.
-- Validation is handled by the existing `validate-source` Edge Function.

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
    ('https://www.chicagobears.com/news', 'Chicago Bears Official', 'team_specific', 'pending', 0),
    ('https://bearswire.usatoday.com/', 'Bears Wire', 'team_specific', 'pending', 0)
) as s(url, name, type, status, relevance_score)
join public.teams t on t.slug = 'chicago-bears'
on conflict (url) do nothing;
