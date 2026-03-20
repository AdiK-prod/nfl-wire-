-- Daily schedules:
-- - run-content-pipeline: 6:00 AM Eastern (UTC-5/UTC-4 depending on DST handled by Supabase server schedule)
-- - assemble-and-send: 6:15 AM Eastern
--
-- NOTE: pg_cron uses server UTC cron semantics. This assumes Eastern is UTC-5 during most of the year.
-- If you need strict DST-aware scheduling, we can switch to a timezone-aware strategy.

do $$
begin
  -- Avoid errors if job doesn't exist yet.
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

-- Pipeline at 6:00 AM Eastern ~= 11:00 UTC (winter; adjust if needed)
select cron.schedule(
  'run-content-pipeline-daily',
  '0 11 * * *',
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

-- Newsletter send at 6:15 AM Eastern ~= 11:15 UTC
select cron.schedule(
  'assemble-and-send-daily',
  '15 11 * * *',
  $$
  select net.http_post(
    url := (select decrypted_secret from vault.decrypted_secrets where name = 'nflwire_project_url') || '/functions/v1/assemble-and-send',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || (select decrypted_secret from vault.decrypted_secrets where name = 'nflwire_service_role_key')
    ),
    body := '{}'::jsonb
  ) as request_id;
  $$
);

