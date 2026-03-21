# Production: “Failed to load teams” / empty team list

The home page loads teams with the **anon** key: `supabase.from('teams').select('*')`. If anything in this chain is wrong, you see an error or an empty grid.

## 1. Vercel environment (most common)

Values are **baked in at build time** (`import.meta.env`). After changing env vars you must **redeploy**.

| Variable | Must be |
|----------|---------|
| `VITE_SUPABASE_URL` | `https://<project-ref>.supabase.co` (no trailing slash) |
| `VITE_SUPABASE_ANON_KEY` | **anon public** key from Supabase → **Project Settings → API** |

**Checks**

- URL + anon key are from the **same** Supabase project where you ran migrations and seed.
- No typo, no extra quotes, no `service_role` key in `VITE_SUPABASE_ANON_KEY` (that would be wrong for the browser anyway).

## 2. RLS on `public.teams`

Migration **`0012_teams_public_select.sql`** must be applied on **production** so `anon` can `SELECT`:

```sql
-- Already in repo; run via SQL Editor or supabase db push if not applied
alter table public.teams enable row level security;

drop policy if exists "teams_select_public" on public.teams;

create policy "teams_select_public"
on public.teams
for select
to anon, authenticated
using (true);
```

**Symptom without policy:** request may **fail** or return **0 rows** (empty grid, not always a clear error).

**Verify in SQL Editor (as postgres or service role):**

```sql
select polname, polcmd, polroles::regrole[]
from pg_policy
join pg_class on pg_class.oid = pg_policy.polrelid
where relname = 'teams';
```

You should see a policy allowing `SELECT` for `anon` / `authenticated`.

## 3. Data exists

Teams must be seeded (e.g. **`0002_seed_initial_data.sql`**).

**Check:**

```sql
select count(*) from public.teams;
```

Expect **32** (or your expected count).

## 4. Read the real error in the UI

After deploying the latest app, the error line under the picker shows the **actual** PostgREST message (e.g. invalid JWT, permission denied, network). Use that to narrow 1–3 above.

## Quick manual test (anon key)

From a machine with `curl`:

```bash
curl -sS \
  'https://YOUR_PROJECT.supabase.co/rest/v1/teams?select=id&limit=1' \
  -H "apikey: YOUR_ANON_KEY" \
  -H "Authorization: Bearer YOUR_ANON_KEY"
```

- **200 + JSON** → API + RLS + data OK; problem is likely **wrong env on Vercel** or **stale build**.
- **401 / JWT** → wrong anon key or project URL.
- **200 + `[]`** → RLS blocking or empty table.
