-- Enable pg_cron and pg_net for scheduling the content pipeline (Phase 3).
-- Run the actual schedule and Vault secrets via supabase/docs/cron-content-pipeline.md.

create extension if not exists pg_cron with schema extensions;
create extension if not exists pg_net with schema extensions;
