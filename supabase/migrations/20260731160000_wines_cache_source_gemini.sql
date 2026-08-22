-- Permite marcar fichas geradas via Gemini
ALTER TABLE public.wines_cache
  DROP CONSTRAINT IF EXISTS wines_cache_source_check;

ALTER TABLE public.wines_cache
  ADD CONSTRAINT wines_cache_source_check
  CHECK (source IN ('openai', 'gemini', 'manual', 'ocr'));
