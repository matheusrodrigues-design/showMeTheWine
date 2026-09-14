import { apiRequest, ApiError } from '@/data/datasources/apiClient';

export { ApiError };

/**
 * Chamadas autenticadas ao sommelier. Secrets de IA ficam só no servidor.
 */
export async function invokeEdgeFunction<T>(
  name: string,
  body: unknown,
): Promise<T> {
  if (!/^[a-z0-9-]{1,64}$/.test(name)) {
    throw new ApiError('Nome de função inválido', 400, 'INVALID_FUNCTION');
  }
  return apiRequest<T>(`/${name}`, { body });
}
