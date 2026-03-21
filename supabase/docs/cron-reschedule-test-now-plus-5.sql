-- One-off test: reschedule cron to run soon (UTC).
-- Run the whole script in Supabase SQL Editor — "now" is when you click Run.
--
-- Pipeline:  now() + 5 minutes
-- Assemble: now() + 10 minutes (gives pipeline time to ingest articles)
--
-- pg_cron uses minute + hour only — the job will repeat daily at that UTC time.
-- After your test, restore production times with migrations 0006 + 0007.

do $$
declare
  pipeline_after interval := interval '5 minutes';
  assemble_after interval := interval '10 minutes';

  t_pipe timestamptz := now() + pipeline_after;
  t_asm  timestamptz := now() + assemble_after;

  m1 int := extract(minute from t_pipe)::int;
  h1 int := extract(hour from t_pipe)::int;
  m2 int := extract(minute from t_asm)::int;
  h2 int := extract(hour from t_asm)::int;

  sched_pipe text := format('%s %s * * *', m1, h1);
  sched_asm  text := format('%s %s * * *', m2, h2);
begin
  raise notice 'Pipeline cron (UTC): % → first run ~ %', sched_pipe, t_pipe;
  raise notice 'Assemble cron (UTC): % → first run ~ %', sched_asm, t_asm;

  begin
    perform cron.unschedule('run-content-pipeline-daily');
  exception when others then null;
  end;

  begin
    perform cron.unschedule('assemble-and-send-daily');
  exception when others then null;
  end;

  perform cron.schedule(
    'run-content-pipeline-daily',
    sched_pipe,
    $cron$
    select net.http_post(
      url := (select decrypted_secret from vault.decrypted_secrets where name = 'nflwire_project_url') || '/functions/v1/run-content-pipeline',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer ' || (select decrypted_secret from vault.decrypted_secrets where name = 'nflwire_service_role_key')
      ),
      body := '{}'::jsonb
    ) as request_id;
    $cron$
  );

  perform cron.schedule(
    'assemble-and-send-daily',
    sched_asm,
    $cron$
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
    $cron$
  );
end $$;

select jobname, schedule, active from cron.job order by jobname;
