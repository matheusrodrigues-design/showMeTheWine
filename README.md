# Sommelier Digital

App mobile de produção (Expo + Supabase) para gestão de adegas de alto padrão, com Dica do Dia geolocalizada e Sommelier AI (cache inteligente + OCR de rótulo).

## Stack

- React Native (Expo) + TypeScript estrito
- TanStack Query v5
- NativeWind v4 (tema bordô / ouro / amolde)
- Supabase (Postgres + Auth + Edge Functions)
- Google Gemini (padrão) com JSON estruturado + Zod  
  (fallback opcional OpenAI via `AI_PROVIDER=openai`)
- `expo-secure-store` para sessão

## Segurança (resumo)

- Zero secrets de IA/Weather/service_role no client
- RLS com `auth.uid()` + `FORCE ROW LEVEL SECURITY`
- Rate limiting nas Edge Functions
- Validação Zod ponta a ponta
- Sessão em SecureStore (Keychain/Keystore)

## Setup

1. Node **≥ 20.19**
2. Copie env:

```bash
cp .env.example .env
```

3. Preencha `EXPO_PUBLIC_SUPABASE_URL` e `EXPO_PUBLIC_SUPABASE_ANON_KEY`
4. Aplique a migration:

```bash
supabase db push
```

5. Secrets das Edge Functions (Gemini):

```bash
supabase secrets set AI_PROVIDER=gemini
supabase secrets set GEMINI_API_KEY=AIza...
supabase secrets set GEMINI_MODEL=gemini-2.0-flash
# opcional
supabase secrets set WEATHER_API_KEY=...
```

`SUPABASE_URL`, `SUPABASE_ANON_KEY` e `SUPABASE_SERVICE_ROLE_KEY` já são injetados pelo Supabase nas Edge Functions — não precisa setar manualmente.

6. Deploy functions:

```bash
supabase functions deploy wine-search
supabase functions deploy daily-tip
```

7. App:

```bash
npm install
npm start
```

## Arquitetura

```
src/
  core/          # config, theme, security
  domain/        # entities, repository ports
  data/          # supabase, schemas Zod, repos
  presentation/  # screens, hooks, navigation
supabase/
  migrations/    # SQL + RLS
  functions/     # Edge Functions Deno
```

## Telas

1. **Adegas** — multi-adega, transição de atmosfera por tipo
2. **Dica do Dia** — editorial clima × vinho (fallback sem GPS)
3. **Sommelier AI** — cache `wines_cache` (similarity > 0.8) antes da OpenAI; OCR com compressão ≤800px
