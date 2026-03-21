-- Move content pipeline to 21:30 UTC (assemble remains 22:00 UTC from 0013).

do $$
begin
  perform cron.unschedule('run-content-pipeline-daily');
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
