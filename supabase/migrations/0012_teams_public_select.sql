-- Landing page reads teams with the anon key. If RLS is enabled on `teams`
-- without a SELECT policy for anon, PostgREST returns zero rows (empty grid).

alter table public.teams enable row level security;

drop policy if exists "teams_select_public" on public.teams;

create policy "teams_select_public"
on public.teams
for select
to anon, authenticated
using (true);
