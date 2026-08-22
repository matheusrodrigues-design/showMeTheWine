# Auditoria SAST Contínua — Sommelier Digital

## Etapa 1 — Database & RLS ✅

- RLS + `FORCE ROW LEVEL SECURITY` em todas as tabelas sensíveis
- Policies com `auth.uid()` / `user_owns_cellar`
- `wines_cache` write apenas `service_role`
- `rate_limits` inacessível a `authenticated`/`anon`
- Índice GIN `pg_trgm` em `normalized_name`
- Funções com `SET search_path = public`

## Etapa 2 — Setup Mobile ✅

- Secrets de terceiros ausentes do bundle (`app.config.ts` só `EXPO_PUBLIC_*`)
- Guard contra `service_role` no client (`env.ts` + `SafeBoot`)
- Sessão em `expo-secure-store` (`WHEN_UNLOCKED_THIS_DEVICE_ONLY`)
- Zod em inputs de busca/auth
- Sanitização anti prompt-injection no client
- `.env` no `.gitignore`

## Etapa 3 — Edge Functions ✅

- JWT obrigatório (`verify_jwt = true`)
- Rate limit DB-backed por endpoint
- CORS allowlist
- Gemini JSON schema (`responseMimeType` + `responseSchema`) + revalidação Zod
- Provider selecionável via `AI_PROVIDER` (default `gemini`)
- Weather com fallback se permissão/chave ausente
- Erros genéricos ao client; logs internos truncados

## Etapa 4 — UI ✅

- Loading com shimmer (sem crash)
- Erros tratáveis (`ErrorBanner` + retry)
- OCR comprime ≤800px antes do upload
- Negação de GPS → fallback seguro (não bloqueia app)
- Sem hardcode de API keys nas telas

## OWASP Mobile Top 10 — cobertura

| Item | Status |
|---|---|
| M1 Improper Credential Usage | Mitigado (SecureStore + sem secrets) |
| M2 Inadequate Supply Chain | Dependências pinadas via lockfile; revisar `npm audit` no CI |
| M3 Insecure Auth/AuthZ | Supabase Auth + RLS |
| M4 Insufficient Input Validation | Zod client + server |
| M5 Insecure Communication | HTTPS Supabase obrigatório |
| M6 Inadequate Privacy Controls | GPS opcional com fallback |
| M7 Insufficient Binary Protections | Sem secrets no binário |
| M8 Security Misconfiguration | CORS allowlist + FORCE RLS |
| M9 Insecure Data Storage | SecureStore para sessão |
| M10 Insufficient Cryptography | Keychain/Keystore nativos |

## Residual aceito

- `wines_cache` é legível por qualquer autenticado (cache global sem PII)
- Purge periódico de `rate_limits` via cron recomendado
- Pinning de certificado (SSL pinning) pode ser adicionado em build nativo EAS
