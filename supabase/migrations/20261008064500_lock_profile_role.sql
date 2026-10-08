-- Lock the role column on profiles.
-- Supabase grants "authenticated" full table-level INSERT/UPDATE on new public tables,
-- which made the earlier column-level grants ineffective (a user could set their own role).
-- Remove the table-level grants and allow only the columns the app writes.
revoke insert, update, delete on public.profiles from authenticated, anon;
grant insert (id, full_name, email) on public.profiles to authenticated;
grant update (full_name, email) on public.profiles to authenticated;
