# Schedule Content Pipeline (Phase 3 — Cron)

Run the content pipeline daily at 6:00 AM (e.g. Eastern) using Supabase pg_cron + pg_net.

## 1. Enable extensions

Run in SQL Editor (or use migration `0003_enable_cron_extensions.sql`):

```sql
create extension if not exists pg_cron with schema extensions;
create extension if not exists pg_net with schema extensions;
```

(If your project already has these, skip.)

## 2. Store secrets in Vault

In SQL Editor:

```sql
-- Replace with your project URL and service role key
select vault.create_secret('https://arrbvgspssuuwzvavjhx.supabase.co', 'nflwire_project_url');
select vault.create_secret('YOUR_SERVICE_ROLE_KEY', 'nflwire_service_role_key');
```

Use **Dashboard → Project Settings → Vault** if you prefer the UI.

## 3. Schedule the pipeline

Run in SQL Editor:

```sql
select cron.schedule(
  'run-content-pipeline-daily',
  '0 6 * * *',   -- 6:00 AM every day (server UTC; adjust for your timezone)
  $$
  select net.http_post(
    url := (select decrypted_secret from vault.decrypted_secrets where name = 'nflwire_project_url') || '/functions/v1/run-content-pipeline',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || (select decrypted_secret from vault.decrypted_secrets where name = 'nflwire_service_role_key')
    ),
    body := '{}'::jsonb
  ) as request_id;
  $$
);
```

To use a different schedule (e.g. 6 AM Eastern):

- Eastern: `0 11 * * *` (11:00 UTC)
- Or use Supabase Dashboard → **Database** → **Cron Jobs** to create/edit the job.

## 4. Unschedule (optional)

```sql
select cron.unschedule('run-content-pipeline-daily');
```

## Manual test

Invoke the function once (no cron):

```bash
curl -X POST 'https://arrbvgspssuuwzvavjhx.supabase.co/functions/v1/run-content-pipeline' \
  -H 'Content-Type: application/json' \
  -H 'Authorization: Bearer YOUR_SERVICE_ROLE_KEY'
```
