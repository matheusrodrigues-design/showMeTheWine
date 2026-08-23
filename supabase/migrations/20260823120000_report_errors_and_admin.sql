-- Relatos de erro em fichas da IA + flag de administrador.
-- is_admin não pode ser alterado pelo próprio usuário (apenas service_role).

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS is_admin BOOLEAN NOT NULL DEFAULT false;

COMMENT ON COLUMN public.profiles.is_admin IS
  'Acesso à fila de erros reportados. Só service_role pode promover.';

CREATE OR REPLACE FUNCTION public.protect_profile_admin_flag()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.is_admin IS DISTINCT FROM OLD.is_admin
     AND auth.role() IS DISTINCT FROM 'service_role' THEN
    NEW.is_admin := OLD.is_admin;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_protect_profile_admin_flag ON public.profiles;
CREATE TRIGGER trg_protect_profile_admin_flag
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.protect_profile_admin_flag();

CREATE OR REPLACE FUNCTION public.is_app_admin()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(
    (SELECT is_admin FROM public.profiles WHERE id = auth.uid()),
    false
  );
$$;

REVOKE ALL ON FUNCTION public.is_app_admin() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.is_app_admin() TO authenticated;

CREATE TABLE IF NOT EXISTS public.report_errors (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  wine_cache_id UUID REFERENCES public.wines_cache(id) ON DELETE SET NULL,
  wine_name     TEXT NOT NULL CHECK (char_length(trim(wine_name)) BETWEEN 1 AND 200),
  grape_variety TEXT CHECK (grape_variety IS NULL OR char_length(grape_variety) <= 200),
  message       TEXT NOT NULL CHECK (char_length(trim(message)) BETWEEN 4 AND 2000),
  status        TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'reviewed')),
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_report_errors_created_at
  ON public.report_errors (created_at DESC);

CREATE INDEX IF NOT EXISTS idx_report_errors_status
  ON public.report_errors (status, created_at DESC);

COMMENT ON TABLE public.report_errors IS
  'Erros reportados pelos clientes sobre fichas geradas pela IA. Leitura só para admin.';

ALTER TABLE public.report_errors ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.report_errors FORCE ROW LEVEL SECURITY;

CREATE POLICY report_errors_insert_own
  ON public.report_errors FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY report_errors_select_admin
  ON public.report_errors FOR SELECT TO authenticated
  USING (public.is_app_admin());

CREATE POLICY report_errors_update_admin
  ON public.report_errors FOR UPDATE TO authenticated
  USING (public.is_app_admin())
  WITH CHECK (public.is_app_admin());

GRANT SELECT, INSERT, UPDATE ON public.report_errors TO authenticated;
GRANT ALL ON public.report_errors TO service_role;
REVOKE ALL ON public.report_errors FROM anon;

-- Primeiro perfil vira admin se ainda não houver nenhum (alpha).
UPDATE public.profiles
SET is_admin = true
WHERE id = (SELECT id FROM public.profiles ORDER BY created_at ASC LIMIT 1)
  AND NOT EXISTS (SELECT 1 FROM public.profiles WHERE is_admin);
