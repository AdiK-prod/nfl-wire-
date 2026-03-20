-- Default delivery time: 22:00 Pacific (PST assumption => UTC-8)
-- pg_cron uses server time (typically UTC in Supabase), so we translate:
-- 22:00 PST -> 06:00 UTC (next day for local date)
-- We run the content pipeline shortly before delivery:
-- 21:00 PST -> 05:00 UTC
--
-- Note: during daylight savings (PDT, UTC-7) this will drift by ~+1 hour.
-- We can make it DST-aware later if you want stricter timezone correctness.

do $$
begin
  perform cron.unschedule('run-content-pipeline-daily');
exception when others then
  null;
end
$$;

do $$
begin
  perform cron.unschedule('assemble-and-send-daily');
exception when others then
  null;
end
$$;

-- Pipeline at 21:00 PST (05:00 UTC)
select cron.schedule(
  'run-content-pipeline-daily',
  '0 5 * * *',
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

-- Newsletter send at 22:00 PST (06:00 UTC)
select cron.schedule(
  'assemble-and-send-daily',
  '0 6 * * *',
  $$
  select net.http_post(
    url := (select decrypted_secret from vault.decrypted_secrets where name = 'nflwire_project_url') || '/functions/v1/assemble-and-send',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || (select decrypted_secret from vault.decrypted_secrets where name = 'nflwire_service_role_key')
    ),
    body := jsonb_build_object('send', true)::jsonb
  ) as request_id;
  $$
);

