import Constants from 'expo-constants';
import { z } from 'zod';

/**
 * Variáveis públicas do client. Validação falha cedo em runtime se mal configurado.
 * Secrets (OpenAI, Weather, service_role) NÃO existem neste módulo.
 */
const publicEnvSchema = z.object({
  supabaseUrl: z
    .string()
    .url('EXPO_PUBLIC_SUPABASE_URL inválida')
    .refine((u) => u.startsWith('https://'), 'Supabase URL deve ser HTTPS'),
  supabaseAnonKey: z
    .string()
    .min(20, 'EXPO_PUBLIC_SUPABASE_ANON_KEY ausente ou inválida')
    .refine(
      (k) => !k.includes('service_role'),
      'SERVICE_ROLE não pode ser usada no client',
    ),
});

type PublicEnv = z.infer<typeof publicEnvSchema>;

function readExtra(): Record<string, unknown> {
  return (Constants.expoConfig?.extra ?? {}) as Record<string, unknown>;
}

let cached: PublicEnv | null = null;

export function getPublicEnv(): PublicEnv {
  if (cached) return cached;

  const extra = readExtra();
  const parsed = publicEnvSchema.safeParse({
    supabaseUrl: extra.supabaseUrl ?? process.env.EXPO_PUBLIC_SUPABASE_URL,
    supabaseAnonKey:
      extra.supabaseAnonKey ?? process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY,
  });

  if (!parsed.success) {
    const message = parsed.error.issues.map((i) => i.message).join('; ');
    throw new Error(`Configuração insegura/incompleta: ${message}`);
  }

  cached = parsed.data;
  return cached;
}

export function getFunctionsBaseUrl(): string {
  const { supabaseUrl } = getPublicEnv();
  return `${supabaseUrl.replace(/\/$/, '')}/functions/v1`;
}
