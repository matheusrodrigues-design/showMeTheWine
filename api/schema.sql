-- Schema do Sommelier Digital para Neon (Postgres puro).
-- Sem auth.users, RLS ou papéis do Supabase. A API filtra por user_id.
-- Reexecutável.

CREATE EXTENSION IF NOT EXISTS pgcrypto;
CREATE EXTENSION IF NOT EXISTS pg_trgm;

CREATE TABLE IF NOT EXISTS public.users (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email         TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.profiles (
  id           UUID PRIMARY KEY REFERENCES public.users(id) ON DELETE CASCADE,
  display_name TEXT,
  locale       TEXT NOT NULL DEFAULT 'pt-BR',
  is_admin     BOOLEAN NOT NULL DEFAULT false,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

DO $$ BEGIN
  CREATE TYPE public.cellar_type AS ENUM (
    'climatizada',
    'subterranea',
    'armario',
    'adega_natural',
    'garrafeira'
  );
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS public.cellars (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  name       TEXT NOT NULL CHECK (char_length(trim(name)) BETWEEN 1 AND 80),
  type       public.cellar_type NOT NULL DEFAULT 'climatizada',
  capacity   INTEGER NOT NULL DEFAULT 50 CHECK (capacity > 0 AND capacity <= 10000),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_cellars_user_id ON public.cellars(user_id);

CREATE TABLE IF NOT EXISTS public.wines_cache (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  normalized_name  TEXT NOT NULL,
  name             TEXT NOT NULL,
  producer         TEXT,
  vintage          INTEGER CHECK (vintage IS NULL OR (vintage >= 1800 AND vintage <= 2100)),
  region           TEXT,
  country          TEXT,
  grape_variety    TEXT,
  wine_type        TEXT,
  tasting_notes    TEXT,
  pairing_notes    TEXT,
  alcohol_pct      NUMERIC(4,2) CHECK (alcohol_pct IS NULL OR (alcohol_pct >= 0 AND alcohol_pct <= 30)),
  serving_temp_c   NUMERIC(4,1),
  metadata         JSONB NOT NULL DEFAULT '{}'::jsonb,
  source           TEXT NOT NULL DEFAULT 'gemini'
                     CHECK (source IN ('openai', 'gemini', 'manual', 'ocr')),
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT wines_cache_normalized_name_unique UNIQUE (normalized_name)
);

CREATE INDEX IF NOT EXISTS idx_wines_cache_normalized_name_trgm
  ON public.wines_cache
  USING GIN (normalized_name gin_trgm_ops);

CREATE INDEX IF NOT EXISTS idx_wines_cache_created_at
  ON public.wines_cache (created_at DESC);

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

CREATE TABLE IF NOT EXISTS public.report_errors (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  wine_cache_id UUID REFERENCES public.wines_cache(id) ON DELETE SET NULL,
  wine_name     TEXT NOT NULL CHECK (char_length(trim(wine_name)) BETWEEN 1 AND 200),
  grape_variety TEXT CHECK (grape_variety IS NULL OR char_length(grape_variety) <= 200),
  message       TEXT NOT NULL CHECK (char_length(trim(message)) BETWEEN 4 AND 2000),
  status        TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'reviewed')),
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_report_errors_created_at ON public.report_errors (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_report_errors_status ON public.report_errors (status, created_at DESC);

CREATE TABLE IF NOT EXISTS public.rate_limits (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  endpoint      TEXT NOT NULL CHECK (char_length(endpoint) BETWEEN 1 AND 64),
  window_start  TIMESTAMPTZ NOT NULL DEFAULT date_trunc('minute', now()),
  request_count INTEGER NOT NULL DEFAULT 1 CHECK (request_count >= 0),
  CONSTRAINT rate_limits_user_endpoint_window UNIQUE (user_id, endpoint, window_start)
);

CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_profiles_updated_at ON public.profiles;
CREATE TRIGGER trg_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS trg_cellars_updated_at ON public.cellars;
CREATE TRIGGER trg_cellars_updated_at
  BEFORE UPDATE ON public.cellars
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS trg_wines_cache_updated_at ON public.wines_cache;
CREATE TRIGGER trg_wines_cache_updated_at
  BEFORE UPDATE ON public.wines_cache
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS trg_cellar_wines_updated_at ON public.cellar_wines;
CREATE TRIGGER trg_cellar_wines_updated_at
  BEFORE UPDATE ON public.cellar_wines
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE OR REPLACE FUNCTION public.normalize_wine_name(p_name TEXT)
RETURNS TEXT
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT lower(trim(regexp_replace(COALESCE(p_name, ''), '\s+', ' ', 'g')));
$$;

CREATE OR REPLACE FUNCTION public.search_wines_cache(
  p_query TEXT,
  p_threshold REAL DEFAULT 0.8,
  p_limit INTEGER DEFAULT 5
)
RETURNS SETOF public.wines_cache
LANGUAGE plpgsql
STABLE
AS $$
DECLARE
  v_q TEXT;
  v_limit INTEGER;
BEGIN
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
