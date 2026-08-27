-- ===========================================
-- Adventure/Project -> World Profile context
-- ===========================================
-- `projects.world_id` is intentionally left untouched. It is legacy campaign-lore/world-state
-- identity used by existing Character Lore flows. SagaDrive rule worlds use the explicit
-- `world_profile_id` link introduced here.

ALTER TABLE public.projects
  ADD COLUMN IF NOT EXISTS world_profile_id UUID REFERENCES public.world_profiles(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_projects_world_profile
  ON public.projects(world_profile_id)
  WHERE world_profile_id IS NOT NULL;

-- Keep project ownership immutable through normal client updates on both legacy and Schema V3 policy names.
DROP POLICY IF EXISTS "GMs can update their projects" ON public.projects;
DROP POLICY IF EXISTS "GM can update their projects" ON public.projects;
CREATE POLICY "GM can update their projects" ON public.projects
  FOR UPDATE
  USING (gm_user_id = auth.uid())
  WITH CHECK (gm_user_id = auth.uid());

-- The linked rule-world must belong to the project's GM. This invariant also protects direct
-- project INSERT/UPDATE paths; the RPC below is not the only enforcement layer.
CREATE OR REPLACE FUNCTION public.enforce_project_world_profile_owner()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  IF NEW.world_profile_id IS NULL THEN
    RETURN NEW;
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM public.world_profiles
    WHERE id = NEW.world_profile_id
      AND owner_user_id = NEW.gm_user_id
  ) THEN
    RAISE EXCEPTION 'World profile must be owned by the project GM' USING ERRCODE = '42501';
  END IF;

  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION public.enforce_project_world_profile_owner() FROM PUBLIC;

DROP TRIGGER IF EXISTS enforce_project_world_profile_owner ON public.projects;
CREATE TRIGGER enforce_project_world_profile_owner
  BEFORE INSERT OR UPDATE OF world_profile_id, gm_user_id ON public.projects
  FOR EACH ROW EXECUTE FUNCTION public.enforce_project_world_profile_owner();

-- Explicit write path for changing the world of an existing adventure.
CREATE OR REPLACE FUNCTION public.set_project_world_profile(
  p_project_id UUID,
  p_world_profile_id UUID
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_user_id UUID := auth.uid();
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Authentication required' USING ERRCODE = '42501';
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM public.projects
    WHERE id = p_project_id
      AND gm_user_id = v_user_id
  ) THEN
    RAISE EXCEPTION 'Only the project GM can change the world profile' USING ERRCODE = '42501';
  END IF;

  IF p_world_profile_id IS NULL OR NOT EXISTS (
    SELECT 1
    FROM public.world_profiles
    WHERE id = p_world_profile_id
      AND owner_user_id = v_user_id
  ) THEN
    RAISE EXCEPTION 'World profile is missing or not owned by the project GM' USING ERRCODE = '42501';
  END IF;

  UPDATE public.projects
  SET world_profile_id = p_world_profile_id
  WHERE id = p_project_id;

  RETURN p_project_id;
END;
$$;

REVOKE ALL ON FUNCTION public.set_project_world_profile(UUID, UUID) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.set_project_world_profile(UUID, UUID) FROM anon;
GRANT EXECUTE ON FUNCTION public.set_project_world_profile(UUID, UUID) TO authenticated;

-- Owners still see their library worlds. Active participants may additionally read exactly the
-- world profiles linked to projects they can actively participate in, so effective world config
-- can be resolved without copying rule data onto characters.
DROP POLICY IF EXISTS "Users can view their world profiles" ON public.world_profiles;
DROP POLICY IF EXISTS "Users can view owned or assigned world profiles" ON public.world_profiles;

CREATE POLICY "Users can view owned or assigned world profiles" ON public.world_profiles
  FOR SELECT
  USING (
    owner_user_id = auth.uid()
    OR EXISTS (
      SELECT 1
      FROM public.projects
      WHERE projects.world_profile_id = world_profiles.id
        AND (
          projects.gm_user_id = auth.uid()
          OR public.current_user_is_active_project_member(projects.id)
        )
    )
  );
