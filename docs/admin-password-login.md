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

- **Invalid login credentials** → wrong email/password. If the user was invited with magic link only, open **Authentication → Users** → user → set / reset password.
- **“Email not confirmed”** (or sign-in blocked) → **Authentication → Providers → Email**: temporarily disable “Confirm email” for testing, **or** in **Users** mark the user confirmed / resend confirmation.
- **Signed in but “not on allowlist”** → `admin_users.user_id` must equal `auth.users.id` for that email. Run in **SQL Editor**:

```sql
select u.id as auth_user_id, u.email, u.email_confirmed_at,
       au.user_id as admin_user_id, au.email as admin_email
from auth.users u
left join public.admin_users au on au.user_id = u.id
where lower(u.email) = lower('adi.kirsch@gmail.com');
```

If `admin_user_id` is **null**, the allowlist row is missing or `user_id` is wrong. Fix:

```sql
insert into public.admin_users (user_id, email)
select id, email from auth.users where lower(email) = lower('adi.kirsch@gmail.com')
on conflict (email) do update set user_id = excluded.user_id;
```

- **RLS / policy errors** → ensure migration **`0011_admin_users_select_policy_simple.sql`** is applied so authenticated users can `select` their own row (`user_id = auth.uid()`).
- Passwords are **never** stored in env vars or the repo — only in Supabase Auth.
