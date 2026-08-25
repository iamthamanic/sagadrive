-- Harden project membership so client-writable rows cannot become authorization grants.
-- Compatible with both the legacy self-host schema and Schema V3 deployments.

CREATE OR REPLACE FUNCTION public.current_user_is_active_project_member(
  p_project_id UUID
)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.project_members
    WHERE project_id = p_project_id
      AND user_id = auth.uid()
      AND status = 'active'
  );
$$;

REVOKE ALL ON FUNCTION public.current_user_is_active_project_member(UUID) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.current_user_is_active_project_member(UUID) FROM anon;
GRANT EXECUTE ON FUNCTION public.current_user_is_active_project_member(UUID) TO authenticated;

-- Normalize project visibility across the legacy and V3 policy names. A kicked/inactive
-- membership is not enough to read a project anymore.
DROP POLICY IF EXISTS "Users can view their own projects" ON public.projects;
DROP POLICY IF EXISTS "Users can view projects where they are GM" ON public.projects;
DROP POLICY IF EXISTS "Active members can view their projects" ON public.projects;

CREATE POLICY "Users can view projects where they are GM"
  ON public.projects FOR SELECT
  USING (gm_user_id = auth.uid());

CREATE POLICY "Active members can view their projects"
  ON public.projects FOR SELECT
  USING (public.current_user_is_active_project_member(id));

-- Remove the old V3 self-service policies that let a browser choose protected
-- membership fields. The legacy schema already restricts writes to GMs only.
DROP POLICY IF EXISTS "Users can join projects" ON public.project_members;
DROP POLICY IF EXISTS "Users can update their member record" ON public.project_members;
DROP POLICY IF EXISTS "Users can leave projects" ON public.project_members;
DROP POLICY IF EXISTS "GM can add members to their projects" ON public.project_members;
DROP POLICY IF EXISTS "GM can update members in their projects" ON public.project_members;
DROP POLICY IF EXISTS "Users can leave active project memberships" ON public.project_members;

CREATE POLICY "GM can add members to their projects"
  ON public.project_members FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.projects
      WHERE projects.id = project_members.project_id
        AND projects.gm_user_id = auth.uid()
    )
  );

CREATE POLICY "GM can update members in their projects"
  ON public.project_members FOR UPDATE
  USING (
    EXISTS (
      SELECT 1
      FROM public.projects
      WHERE projects.id = project_members.project_id
        AND projects.gm_user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.projects
      WHERE projects.id = project_members.project_id
        AND projects.gm_user_id = auth.uid()
    )
  );

-- A kicked membership is kept as a server/GM-controlled denial record.
CREATE POLICY "Users can leave active project memberships"
  ON public.project_members FOR DELETE
  USING (
    user_id = auth.uid()
    AND status IN ('active', 'inactive')
  );

-- Joining by a secret code is the only authenticated self-service operation that can
-- create an active membership. The caller cannot choose user_id, project_id, role or status.
CREATE OR REPLACE FUNCTION public.join_project_by_code(
  p_code TEXT,
  p_character_id UUID DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_user_id UUID := auth.uid();
  v_project_id UUID;
  v_existing_status TEXT;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Authentication required' USING ERRCODE = '42501';
  END IF;

  IF NULLIF(BTRIM(p_code), '') IS NULL THEN
    RAISE EXCEPTION 'Project code is required' USING ERRCODE = '22023';
  END IF;

  SELECT id
  INTO v_project_id
  FROM public.projects
  WHERE UPPER(code) = UPPER(BTRIM(p_code))
    AND status = 'active'
  LIMIT 1;

  IF v_project_id IS NULL THEN
    RAISE EXCEPTION 'Project not found' USING ERRCODE = 'P0002';
  END IF;

  SELECT status
  INTO v_existing_status
  FROM public.project_members
  WHERE project_id = v_project_id
    AND user_id = v_user_id;

  IF FOUND THEN
    RAISE EXCEPTION 'Project membership already exists with status %', v_existing_status
      USING ERRCODE = 'P0001';
  END IF;

  IF p_character_id IS NOT NULL AND NOT EXISTS (
    SELECT 1
    FROM public.characters
    WHERE id = p_character_id
      AND owner_user_id = v_user_id
  ) THEN
    RAISE EXCEPTION 'Character is not owned by the current user' USING ERRCODE = '42501';
  END IF;

  INSERT INTO public.project_members (
    project_id,
    user_id,
    character_id,
    role,
    status
  ) VALUES (
    v_project_id,
    v_user_id,
    p_character_id,
    'player',
    'active'
  );

  RETURN v_project_id;
END;
$$;

REVOKE ALL ON FUNCTION public.join_project_by_code(TEXT, UUID) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.join_project_by_code(TEXT, UUID) FROM anon;
GRANT EXECUTE ON FUNCTION public.join_project_by_code(TEXT, UUID) TO authenticated;

-- The browser may change only the selected character on its own active membership.
CREATE OR REPLACE FUNCTION public.set_my_project_character(
  p_project_id UUID,
  p_character_id UUID DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_user_id UUID := auth.uid();
  v_member_id UUID;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Authentication required' USING ERRCODE = '42501';
  END IF;

  IF p_character_id IS NOT NULL AND NOT EXISTS (
    SELECT 1
    FROM public.characters
    WHERE id = p_character_id
      AND owner_user_id = v_user_id
  ) THEN
    RAISE EXCEPTION 'Character is not owned by the current user' USING ERRCODE = '42501';
  END IF;

  UPDATE public.project_members
  SET character_id = p_character_id
  WHERE project_id = p_project_id
    AND user_id = v_user_id
    AND status = 'active'
  RETURNING id INTO v_member_id;

  IF v_member_id IS NULL THEN
    RAISE EXCEPTION 'Active project membership not found' USING ERRCODE = 'P0002';
  END IF;

  RETURN v_member_id;
END;
$$;

REVOKE ALL ON FUNCTION public.set_my_project_character(UUID, UUID) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.set_my_project_character(UUID, UUID) FROM anon;
GRANT EXECUTE ON FUNCTION public.set_my_project_character(UUID, UUID) TO authenticated;
