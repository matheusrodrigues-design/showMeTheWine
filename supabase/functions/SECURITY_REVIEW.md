# Auditoria de Segurança (SAST) — Etapa 3: Edge Functions

## Veredicto: APROVADO para prosseguir

### Controles

| Risco | Mitigação |
|---|---|
| Secrets no client | Gemini/OpenAI/Weather/service_role só em `Deno.env` |
| Broken Auth | `requireUser` valida JWT via `getUser(token)` |
| BOLA / IDOR | `daily-tip` filtra cellar por `user_id = auth.user.id` |
| Resource exhaustion | `check_rate_limit` (8/min search, 3/min OCR, 6/min tip) |
| Injection | Zod + `sanitizeText` + delimitação de prompt |
| Prompt injection | System prompt instrui ignorar conteúdo do user; dados entre aspas/JSON |
| CORS abuse | Allowlist de origins; métodos só POST/OPTIONS |
| SSRF | Weather URL fixa em OpenWeather; lat/lon validados por Zod |
| Error leakage | Respostas genéricas; detalhes só em `console.error` |

### Residual

- Allowlist CORS deve incluir o scheme do app nativo em produção (`sommelierdigital://` não envia Origin típico — OK).
- Imagem OCR limitada a ~1.5MB base64; client comprime para ≤800px.
