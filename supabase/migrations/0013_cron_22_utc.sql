-- Daily schedules in UTC:
-- - run-content-pipeline: 21:30 UTC
-- - assemble-and-send:    22:00 UTC
--
-- day_ymd for assemble still uses Pacific calendar date (same as 0007) for article window alignment.

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

select cron.schedule(
  'run-content-pipeline-daily',
  '30 21 * * *',
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

select cron.schedule(
  'assemble-and-send-daily',
  '0 22 * * *',
  $$
  select net.http_post(
    url := (select decrypted_secret from vault.decrypted_secrets where name = 'nflwire_project_url') || '/functions/v1/assemble-and-send',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || (select decrypted_secret from vault.decrypted_secrets where name = 'nflwire_service_role_key')
    ),
    body := jsonb_build_object(
      'send', true,
      'day_ymd', to_char((now() - interval '8 hours')::date, 'YYYY-MM-DD')
    )::jsonb
  ) as request_id;
  $$
);
