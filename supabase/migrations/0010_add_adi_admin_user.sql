-- Add Adi as an admin user if the auth account exists.
-- Safe to re-run due to ON CONFLICT.
INSERT INTO public.admin_users (user_id, email)
SELECT id, email
FROM auth.users
WHERE lower(email) = lower('adi.kirsch@gmail.com')
ON CONFLICT (email) DO UPDATE
SET user_id = EXCLUDED.user_id;
