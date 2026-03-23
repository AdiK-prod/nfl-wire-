-- Convert existing Chicago Bears sources to RSS feeds for pipeline ingestion.

update public.sources
set url = 'https://www.chicagobears.com/rss/news',
    name = 'Chicago Bears Official RSS',
    updated_at = now()
where url = 'https://www.chicagobears.com/news';

update public.sources
set url = 'https://www.espn.com/espn/rss/nfl/team?team=chi',
    name = 'ESPN Bears RSS',
    updated_at = now()
where url = 'https://bearswire.usatoday.com/';

