-- Allow authenticated users to read only their own admin_users row (no self-referential EXISTS).
-- Fixes allowlist checks from the anon client with a user JWT.

drop policy if exists "Admins can read admin_users" on public.admin_users;

create policy "authenticated_read_own_admin_row"
on public.admin_users
for select
to authenticated
using (user_id = auth.uid());
