-- =============================================================================
-- Sommelier Digital — Schema inicial + RLS (produção)
-- =============================================================================
-- Princípios de segurança:
-- 1. RLS habilitado em TODAS as tabelas de dados do usuário
-- 2. Policies usam auth.uid() — nunca confiam em user_id do cliente
-- 3. wines_cache é global de leitura autenticada; escrita apenas via service_role
-- 4. Índices GIN + pg_trgm para busca fuzzy sem exposição de dados cruzados
-- =============================================================================

-- Extensões necessárias
CREATE EXTENSION IF NOT EXISTS "pgcrypto";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";

-- -----------------------------------------------------------------------------
-- Perfis (espelho 1:1 com auth.users — nunca armazena senha)
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.profiles (
  id          UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name TEXT,
  locale      TEXT NOT NULL DEFAULT 'pt-BR',
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.profiles IS
  'Perfil público mínimo do usuário. Credenciais ficam apenas em auth.users.';

-- -----------------------------------------------------------------------------
-- Adegas (multi-cellar por usuário)
-- -----------------------------------------------------------------------------
CREATE TYPE public.cellar_type AS ENUM (
  'climatizada',
  'subterranea',
  'armario',
  'adega_natural',
  'garrafeira'
);

CREATE TABLE IF NOT EXISTS public.cellars (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name       TEXT NOT NULL CHECK (char_length(trim(name)) BETWEEN 1 AND 80),
  type       public.cellar_type NOT NULL DEFAULT 'climatizada',
  capacity   INTEGER NOT NULL DEFAULT 50 CHECK (capacity > 0 AND capacity <= 10000),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_cellars_user_id ON public.cellars(user_id);

COMMENT ON TABLE public.cellars IS
  'Adegas do cliente. Isolamento total por user_id via RLS.';

-- -----------------------------------------------------------------------------
-- Cache global de vinhos (leitura autenticada; escrita service_role)
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.wines_cache (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  normalized_name  TEXT NOT NULL,
  name             TEXT NOT NULL,
  producer         TEXT,
  vintage          INTEGER CHECK (vintage IS NULL OR (vintage >= 1800 AND vintage <= 2100)),
  region           TEXT,
  country          TEXT,
  grape_variety    TEXT,
  wine_type        TEXT, -- tinto, branco, rosado, espumante, fortificado
  tasting_notes    TEXT,
  pairing_notes    TEXT,
  alcohol_pct      NUMERIC(4,2) CHECK (alcohol_pct IS NULL OR (alcohol_pct >= 0 AND alcohol_pct <= 30)),
  serving_temp_c   NUMERIC(4,1),
  metadata         JSONB NOT NULL DEFAULT '{}'::jsonb,
  source           TEXT NOT NULL DEFAULT 'gemini' CHECK (source IN ('openai', 'gemini', 'manual', 'ocr')),
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT wines_cache_normalized_name_unique UNIQUE (normalized_name)
);

-- Índice GIN trigram para similarity() / ILIKE %termo%
CREATE INDEX IF NOT EXISTS idx_wines_cache_normalized_name_trgm
  ON public.wines_cache
  USING GIN (normalized_name gin_trgm_ops);

CREATE INDEX IF NOT EXISTS idx_wines_cache_created_at
  ON public.wines_cache (created_at DESC);

COMMENT ON TABLE public.wines_cache IS
  'Cache global de fichas de vinho. Escrita apenas via Edge Functions (service_role).';

-- -----------------------------------------------------------------------------
-- Vinhos na adega (estoque do usuário)
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.cellar_wines (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cellar_id     UUID NOT NULL REFERENCES public.cellars(id) ON DELETE CASCADE,
  wine_cache_id UUID NOT NULL REFERENCES public.wines_cache(id) ON DELETE RESTRICT,
  quantity      INTEGER NOT NULL DEFAULT 1 CHECK (quantity >= 0 AND quantity <= 10000),
  notes         TEXT CHECK (notes IS NULL OR char_length(notes) <= 500),
  purchased_at  DATE,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT cellar_wines_unique_per_cellar UNIQUE (cellar_id, wine_cache_id)
);

CREATE INDEX IF NOT EXISTS idx_cellar_wines_cellar_id ON public.cellar_wines(cellar_id);
CREATE INDEX IF NOT EXISTS idx_cellar_wines_wine_cache_id ON public.cellar_wines(wine_cache_id);

COMMENT ON TABLE public.cellar_wines IS
  'Inventário por adega. Acesso somente se a adega pertencer a auth.uid().';

-- -----------------------------------------------------------------------------
-- Rate limiting (servidor) — usado pelas Edge Functions
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.rate_limits (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  endpoint    TEXT NOT NULL CHECK (char_length(endpoint) BETWEEN 1 AND 64),
  window_start TIMESTAMPTZ NOT NULL DEFAULT date_trunc('minute', now()),
  request_count INTEGER NOT NULL DEFAULT 1 CHECK (request_count >= 0),
  CONSTRAINT rate_limits_user_endpoint_window UNIQUE (user_id, endpoint, window_start)
);

CREATE INDEX IF NOT EXISTS idx_rate_limits_lookup
  ON public.rate_limits (user_id, endpoint, window_start DESC);

COMMENT ON TABLE public.rate_limits IS
  'Contadores de rate limit por usuário/endpoint. Acesso exclusivo service_role.';

-- -----------------------------------------------------------------------------
-- Funções auxiliares (security definer com search_path fixo)
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER trg_cellars_updated_at
  BEFORE UPDATE ON public.cellars
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER trg_wines_cache_updated_at
  BEFORE UPDATE ON public.wines_cache
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER trg_cellar_wines_updated_at
  BEFORE UPDATE ON public.cellar_wines
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Cria perfil automaticamente no signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, display_name)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'display_name', split_part(NEW.email, '@', 1))
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Ownership check para cellar_wines (evita OR com subquery insegura)
CREATE OR REPLACE FUNCTION public.user_owns_cellar(p_cellar_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.cellars c
    WHERE c.id = p_cellar_id
      AND c.user_id = auth.uid()
  );
$$;

REVOKE ALL ON FUNCTION public.user_owns_cellar(UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.user_owns_cellar(UUID) TO authenticated;

-- Normalização determinística de nomes de vinho (usada por Edge Functions)
CREATE OR REPLACE FUNCTION public.normalize_wine_name(p_name TEXT)
RETURNS TEXT
LANGUAGE sql
IMMUTABLE
SET search_path = public
AS $$
  SELECT lower(trim(regexp_replace(COALESCE(p_name, ''), '\s+', ' ', 'g')));
$$;

-- Busca fuzzy no cache (threshold 0.8) — apenas authenticated
CREATE OR REPLACE FUNCTION public.search_wines_cache(
  p_query TEXT,
  p_threshold REAL DEFAULT 0.8,
  p_limit INTEGER DEFAULT 5
)
RETURNS SETOF public.wines_cache
LANGUAGE plpgsql
STABLE
SECURITY INVOKER
SET search_path = public
AS $$
DECLARE
  v_q TEXT;
  v_limit INTEGER;
BEGIN
  -- Permite authenticated (via JWT) ou service_role (Edge Functions)
  IF auth.uid() IS NULL AND auth.role() IS DISTINCT FROM 'service_role' THEN
    RAISE EXCEPTION 'not authenticated';
  END IF;

  v_q := public.normalize_wine_name(p_query);
  IF v_q IS NULL OR char_length(v_q) < 2 OR char_length(v_q) > 200 THEN
    RETURN;
  END IF;

  v_limit := GREATEST(1, LEAST(COALESCE(p_limit, 5), 20));

  RETURN QUERY
  SELECT w.*
  FROM public.wines_cache w
  WHERE similarity(w.normalized_name, v_q) > p_threshold
  ORDER BY similarity(w.normalized_name, v_q) DESC
  LIMIT v_limit;
END;
$$;

REVOKE ALL ON FUNCTION public.search_wines_cache(TEXT, REAL, INTEGER) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.search_wines_cache(TEXT, REAL, INTEGER) TO authenticated;
GRANT EXECUTE ON FUNCTION public.search_wines_cache(TEXT, REAL, INTEGER) TO service_role;

-- Rate limit atomico (service_role only)
CREATE OR REPLACE FUNCTION public.check_rate_limit(
  p_user_id UUID,
  p_endpoint TEXT,
  p_max_per_minute INTEGER DEFAULT 10
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_window TIMESTAMPTZ := date_trunc('minute', now());
  v_count INTEGER;
  v_max INTEGER;
BEGIN
  IF p_user_id IS NULL OR p_endpoint IS NULL THEN
    RETURN FALSE;
  END IF;

  v_max := GREATEST(1, LEAST(COALESCE(p_max_per_minute, 10), 100));

  INSERT INTO public.rate_limits (user_id, endpoint, window_start, request_count)
  VALUES (p_user_id, left(p_endpoint, 64), v_window, 1)
  ON CONFLICT (user_id, endpoint, window_start)
  DO UPDATE SET request_count = public.rate_limits.request_count + 1
  RETURNING request_count INTO v_count;

  RETURN v_count <= v_max;
END;
$$;

REVOKE ALL ON FUNCTION public.check_rate_limit(UUID, TEXT, INTEGER) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.check_rate_limit(UUID, TEXT, INTEGER) TO service_role;

-- =============================================================================
-- RLS
-- =============================================================================
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cellars ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cellar_wines ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.wines_cache ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rate_limits ENABLE ROW LEVEL SECURITY;

-- Force RLS mesmo para table owners (defesa em profundidade)
ALTER TABLE public.profiles FORCE ROW LEVEL SECURITY;
ALTER TABLE public.cellars FORCE ROW LEVEL SECURITY;
ALTER TABLE public.cellar_wines FORCE ROW LEVEL SECURITY;
ALTER TABLE public.wines_cache FORCE ROW LEVEL SECURITY;
ALTER TABLE public.rate_limits FORCE ROW LEVEL SECURITY;

-- profiles ------------------------------------------------------------------
CREATE POLICY profiles_select_own
  ON public.profiles FOR SELECT TO authenticated
  USING (id = auth.uid());

CREATE POLICY profiles_update_own
  ON public.profiles FOR UPDATE TO authenticated
  USING (id = auth.uid())
  WITH CHECK (id = auth.uid());

-- INSERT/DELETE de profiles: apenas via trigger/service_role (sem policy)

-- cellars -------------------------------------------------------------------
CREATE POLICY cellars_select_own
  ON public.cellars FOR SELECT TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY cellars_insert_own
  ON public.cellars FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY cellars_update_own
  ON public.cellars FOR UPDATE TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY cellars_delete_own
  ON public.cellars FOR DELETE TO authenticated
  USING (user_id = auth.uid());

-- cellar_wines --------------------------------------------------------------
CREATE POLICY cellar_wines_select_own
  ON public.cellar_wines FOR SELECT TO authenticated
  USING (public.user_owns_cellar(cellar_id));

CREATE POLICY cellar_wines_insert_own
  ON public.cellar_wines FOR INSERT TO authenticated
  WITH CHECK (public.user_owns_cellar(cellar_id));

CREATE POLICY cellar_wines_update_own
  ON public.cellar_wines FOR UPDATE TO authenticated
  USING (public.user_owns_cellar(cellar_id))
  WITH CHECK (public.user_owns_cellar(cellar_id));

CREATE POLICY cellar_wines_delete_own
  ON public.cellar_wines FOR DELETE TO authenticated
  USING (public.user_owns_cellar(cellar_id));

-- wines_cache ---------------------------------------------------------------
-- Leitura autenticada (cache compartilhado de fichas públicas de vinho)
CREATE POLICY wines_cache_select_authenticated
  ON public.wines_cache FOR SELECT TO authenticated
  USING (true);

-- Sem policies de INSERT/UPDATE/DELETE para authenticated
-- Edge Functions usam service_role (bypass RLS) após validação Zod

-- rate_limits ---------------------------------------------------------------
-- Nenhuma policy para authenticated/anon — apenas service_role

-- -----------------------------------------------------------------------------
-- Grants mínimos
-- -----------------------------------------------------------------------------
GRANT USAGE ON SCHEMA public TO authenticated;

GRANT SELECT, UPDATE ON public.profiles TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.cellars TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.cellar_wines TO authenticated;
GRANT SELECT ON public.wines_cache TO authenticated;

GRANT ALL ON public.wines_cache TO service_role;
GRANT ALL ON public.rate_limits TO service_role;
GRANT ALL ON public.profiles TO service_role;
GRANT ALL ON public.cellars TO service_role;
GRANT ALL ON public.cellar_wines TO service_role;

-- Revoga acesso anônimo a dados
REVOKE ALL ON public.profiles FROM anon;
REVOKE ALL ON public.cellars FROM anon;
REVOKE ALL ON public.cellar_wines FROM anon;
REVOKE ALL ON public.wines_cache FROM anon;
REVOKE ALL ON public.rate_limits FROM anon;
