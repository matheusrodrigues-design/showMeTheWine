import { getFunctionsBaseUrl, getPublicEnv } from '@/core/config/env';
import { getSupabase } from '@/data/datasources/supabaseClient';

export class ApiError extends Error {
  constructor(
    message: string,
    public readonly status: number,
    public readonly code?: string,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

/**
 * Chamadas autenticadas às Edge Functions.
 * Secrets de terceiros ficam apenas no servidor.
 */
export async function invokeEdgeFunction<T>(
  name: string,
  body: unknown,
): Promise<T> {
  if (!/^[a-z0-9-]{1,64}$/.test(name)) {
    throw new ApiError('Nome de função inválido', 400, 'INVALID_FUNCTION');
  }

  const supabase = getSupabase();
  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session?.access_token) {
    throw new ApiError('Sessão expirada. Faça login novamente.', 401, 'UNAUTHORIZED');
  }

  const { supabaseAnonKey } = getPublicEnv();
  const url = `${getFunctionsBaseUrl()}/${name}`;

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 30_000);

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${session.access_token}`,
        apikey: supabaseAnonKey,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
      signal: controller.signal,
    });

    const payload = (await response.json().catch(() => ({}))) as {
      error?: string;
      code?: string;
      data?: T;
    } & T;

    if (response.status === 429) {
      throw new ApiError(
        'Muitas solicitações. Aguarde um momento.',
        429,
        'RATE_LIMITED',
      );
    }

    if (!response.ok) {
      throw new ApiError(
        payload.error ?? 'Falha na solicitação',
        response.status,
        payload.code,
      );
    }

    return (payload.data ?? payload) as T;
  } finally {
    clearTimeout(timeout);
  }
}
