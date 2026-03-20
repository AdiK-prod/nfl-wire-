-- Point approved sources to RSS feed URLs so the content pipeline can fetch articles.
-- Leaves other approved sources unchanged (HTML-only); pipeline will skip them.

update public.sources
set url = 'https://www.espn.com/espn/rss/nfl/news',
    name = 'ESPN NFL',
    updated_at = now()
where url = 'https://www.espn.com/nfl/'
  and status = 'approved';

update public.sources
set url = 'https://profootballtalk.nbcsports.com/feed/',
    name = 'Pro Football Talk',
    updated_at = now()
where url = 'https://www.profootballtalk.com/'
  and status = 'approved';
