# Auditoria de Segurança (SAST) — Etapa 2: Setup do Projeto

## Veredicto: APROVADO

- Clean Architecture isola `presentation` de secrets e de I/O.
- `getPublicEnv()` rejeita URL sem HTTPS e chave contendo `service_role`.
- Auth storage = `expo-secure-store` (sem AsyncStorage no projeto).
- Path alias `@/` não afeta superfície de ataque.
- `.env` ignorado no git; apenas `.env.example` versionado.
