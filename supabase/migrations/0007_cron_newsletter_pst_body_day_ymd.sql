-- Ensure assemble-and-send uses the intended Pacific day (PST assumption UTC-8)
-- so that a 22:00 PST send selects articles from that Pacific calendar day.

do $$
begin
  perform cron.unschedule('assemble-and-send-daily');
exception when others then
  null;
end
$$;

-- Newsletter send at 22:00 PST (06:00 UTC), but with body.day_ymd set to the Pacific date.
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
    body := jsonb_build_object(
      'send', true,
      'day_ymd', to_char((now() - interval '8 hours')::date, 'YYYY-MM-DD')
    )::jsonb
  ) as request_id;
  $$
);

