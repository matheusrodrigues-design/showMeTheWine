import { getPublicEnv } from '@/core/config/env';
import { getStoredSession, setStoredSession } from '@/data/datasources/session';

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

function apiUrl(path: string): string {
  const { apiUrl: base } = getPublicEnv();
  return `${base.replace(/\/$/, '')}${path.startsWith('/') ? path : `/${path}`}`;
}

export async function apiRequest<T>(
  path: string,
  init: { method?: string; body?: unknown; auth?: boolean } = {},
): Promise<T> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };
  if (init.auth !== false) {
    const session = await getStoredSession();
    if (!session?.accessToken) {
      throw new ApiError('Sessão expirada. Faça login novamente.', 401, 'UNAUTHORIZED');
    }
    headers.Authorization = `Bearer ${session.accessToken}`;
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 45_000);
  try {
    const response = await fetch(apiUrl(path), {
      method: init.method ?? (init.body === undefined ? 'GET' : 'POST'),
      headers,
      body: init.body === undefined ? undefined : JSON.stringify(init.body),
      signal: controller.signal,
    });
    const payload = (await response.json().catch(() => ({}))) as {
      error?: string;
      code?: string;
    } & T;

    if (response.status === 401) {
      await setStoredSession(null);
    }
    if (!response.ok) {
      throw new ApiError(
        payload.error ?? 'Falha na solicitação',
        response.status,
        payload.code,
      );
    }
    return payload;
  } catch (err) {
    if (err instanceof ApiError) throw err;
    if (err instanceof Error && err.name === 'AbortError') {
      throw new ApiError('A solicitação demorou demais. Tente de novo.', 504, 'TIMEOUT');
    }
    throw new ApiError('Não foi possível falar com o servidor.', 503, 'NETWORK');
  } finally {
    clearTimeout(timeout);
  }
}
