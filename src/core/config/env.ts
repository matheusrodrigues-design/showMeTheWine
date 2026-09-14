import Constants from 'expo-constants';
import { z } from 'zod';

/**
 * Variáveis públicas do client. Secrets de IA e do banco NÃO existem neste módulo.
 */
const publicEnvSchema = z.object({
  apiUrl: z
    .string()
    .url('EXPO_PUBLIC_API_URL inválida')
    .refine((u) => u.startsWith('https://'), 'API URL deve ser HTTPS'),
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
    apiUrl: extra.apiUrl ?? process.env.EXPO_PUBLIC_API_URL,
  });

  if (!parsed.success) {
    const message = parsed.error.issues.map((i) => i.message).join('; ');
    throw new Error(`Configuração insegura/incompleta: ${message}`);
  }

  cached = parsed.data;
  return cached;
}
