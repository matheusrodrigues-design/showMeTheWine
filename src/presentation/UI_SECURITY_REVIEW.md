# Auditoria de Segurança (SAST) — Etapa 4: UI/UX

## Veredicto: APROVADO

- Telas não embutem secrets nem montam SQL.
- Busca sanitizada (`sanitizeUserText`) antes da mutation.
- OCR comprime client-side (≤800px / teto base64) — mitiga abuso de bandwidth.
- GPS negado → fallback; app não quebra nem vaza coordenadas.
- Erros de API mapeados para mensagens genéricas/tratáveis.
- Auth valida e-mail/senha com Zod (min 8) antes do Supabase.
