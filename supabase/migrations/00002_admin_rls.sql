-- Lock down matches + tournament_config so only admins can write directly.
-- These tables previously had RLS disabled, meaning any authenticated user
-- could UPDATE match results or set is_locked via the Supabase (PostgREST) API,
-- bypassing the /api/admin/* routes entirely.
--
-- Admin identity lives in the JWT: app_metadata.role = 'admin'.
-- The server-side `db` connection (DATABASE_URL, service role) bypasses RLS,
-- so the admin API routes continue to work unchanged.

-- Reusable predicate for "current request is an admin".
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean
LANGUAGE sql
STABLE
AS $$
  SELECT coalesce(
    (auth.jwt() -> 'app_metadata' ->> 'role') = 'admin',
    false
  );
$$;

-- tournament_config -----------------------------------------------------------
ALTER TABLE tournament_config ENABLE ROW LEVEL SECURITY;

CREATE POLICY "tournament_config_select" ON tournament_config
  FOR SELECT USING (true);

CREATE POLICY "tournament_config_insert" ON tournament_config
  FOR INSERT WITH CHECK (public.is_admin());

CREATE POLICY "tournament_config_update" ON tournament_config
  FOR UPDATE USING (public.is_admin()) WITH CHECK (public.is_admin());

CREATE POLICY "tournament_config_delete" ON tournament_config
  FOR DELETE USING (public.is_admin());

-- matches ---------------------------------------------------------------------
ALTER TABLE matches ENABLE ROW LEVEL SECURITY;

CREATE POLICY "matches_select" ON matches
  FOR SELECT USING (true);

CREATE POLICY "matches_insert" ON matches
  FOR INSERT WITH CHECK (public.is_admin());

CREATE POLICY "matches_update" ON matches
  FOR UPDATE USING (public.is_admin()) WITH CHECK (public.is_admin());

CREATE POLICY "matches_delete" ON matches
  FOR DELETE USING (public.is_admin());
