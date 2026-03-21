# Admin login (email + password)

The admin UI at `/admin` uses **Supabase Auth** `signInWithPassword` — no magic links.

## 1. Enable email + password in Supabase

1. **Authentication** → **Providers** → **Email**
2. Ensure the provider is **enabled** (default on hosted projects).
3. Optional: disable **“Confirm email”** for faster testing only; for production, keep confirmations as you prefer.

## 2. Create an auth user with a password

1. **Authentication** → **Users** → **Add user** → **Create new user**
2. Enter **email** and **password** (or use **Invite** if you prefer email flow once).
3. Copy the new user’s **UUID** from the users list if you need it for SQL.

## 3. Allowlist in `admin_users`

Access to `/admin/dashboard` still requires a row in `public.admin_users` linking `auth.users.id`:

```sql
insert into public.admin_users (user_id, email)
values ('PASTE_USER_UUID_FROM_AUTH', 'you@example.com')
on conflict (email) do update set user_id = excluded.user_id;
```

Or use the pattern in `supabase/migrations/0010_add_adi_admin_user.sql` (match by email from `auth.users`).

## 4. Troubleshooting

- **Invalid login credentials** → wrong email/password, or user only exists as OTP-only (create user with password in Dashboard).
- **Signed in but “not on allowlist”** → add `admin_users` row for that `user_id`.
- Passwords are **never** stored in env vars or the repo — only in Supabase Auth.
