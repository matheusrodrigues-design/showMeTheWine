-- =============================================================================
-- Seed OPCIONAL (apenasenvolvimento). NÃO executar em produção com dados reais.
-- Cria uma adega + vinhos de cache para o usuário autenticado atual.
-- Uso: substitua o UUID abaixo ou rode após login via SQL Editor com auth.
-- =============================================================================

-- Exemplo de cache global (service_role / SQL editor)
INSERT INTO public.wines_cache (
  normalized_name, name, producer, vintage, region, country,
  grape_variety, wine_type, tasting_notes, pairing_notes, source
) VALUES
  (
    'dom perignon 2012',
    'Dom Pérignon',
    'Moët & Chandon',
    2012,
    'Champagne',
    'França',
    'Chardonnay / Pinot Noir',
    'espumante',
    'Bolhas finas, brioche, cítricos maduros e mineralidade calcária.',
    'Ostras, caviar e peixes grelhados com manteiga.',
    'manual'
  ),
  (
    'catena zapata malbec 2019',
    'Catena Zapata Malbec',
    'Catena Zapata',
    2019,
    'Mendoza',
    'Argentina',
    'Malbec',
    'tinto',
    'Ameixa preta, violeta e taninos aveludados de altitude.',
    'Carnes grelhadas e queijos curados.',
    'manual'
  )
ON CONFLICT (normalized_name) DO NOTHING;
