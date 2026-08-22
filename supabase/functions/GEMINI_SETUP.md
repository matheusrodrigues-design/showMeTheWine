# Setup Gemini (Edge Functions)

## Secrets

```bash
supabase secrets set AI_PROVIDER=gemini
supabase secrets set GEMINI_API_KEY=AIza...
supabase secrets set GEMINI_MODEL=gemini-2.0-flash
```

Modelos comuns: `gemini-2.0-flash`, `gemini-2.5-flash`, `gemini-2.5-pro`.

## Deploy

```bash
supabase db push
supabase functions deploy daily-tip
supabase functions deploy wine-search
```

## Logs

```bash
supabase functions logs daily-tip --follow
```

## Fallback OpenAI

```bash
supabase secrets set AI_PROVIDER=openai
supabase secrets set OPENAI_API_KEY=sk-...
supabase functions deploy daily-tip
supabase functions deploy wine-search
```
