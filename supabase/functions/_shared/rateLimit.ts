import { getServiceClient } from './auth.ts';

export async function enforceRateLimit(
  userId: string,
  endpoint: string,
  maxPerMinute = 10,
): Promise<{ ok: true } | { ok: false; status: 429; error: string }> {
  const service = getServiceClient();
  const { data, error } = await service.rpc('check_rate_limit', {
    p_user_id: userId,
    p_endpoint: endpoint,
    p_max_per_minute: maxPerMinute,
  });

  if (error) {
    console.error('rate_limit_error', error.message);
    return { ok: false, status: 429, error: 'Rate limit unavailable' };
  }

  if (data !== true) {
    return {
      ok: false,
      status: 429,
      error: 'Too many requests. Please wait a minute.',
    };
  }

  return { ok: true };
}
