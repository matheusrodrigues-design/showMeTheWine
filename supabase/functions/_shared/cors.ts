/** CORS restritivo — apenas origens conhecidas do app em produção. */
const ALLOWED_ORIGINS = new Set([
  'http://localhost:8081',
  'http://localhost:19006',
  'http://127.0.0.1:8081',
  'http://127.0.0.1:19006',
  'https://sommelier-digital-rho.vercel.app',
  'https://show-me-the-wine.vercel.app',
]);

function resolveAllowedOrigin(origin: string): string | null {
  if (!origin) return null;
  if (ALLOWED_ORIGINS.has(origin)) return origin;
  // Preview deployments do projeto Show Me The Wine / legado na Vercel
  try {
    const url = new URL(origin);
    if (url.protocol !== 'https:') return null;
    const host = url.hostname;
    if (
      host === 'show-me-the-wine.vercel.app' ||
      host.endsWith('-show-me-the-wine.vercel.app') ||
      (host.endsWith('.vercel.app') && host.includes('show-me-the-wine')) ||
      host === 'sommelier-digital-rho.vercel.app' ||
      (host.endsWith('.vercel.app') && host.includes('sommelier-digital-rho'))
    ) {
      return origin;
    }
  } catch {
    return null;
  }
  return null;
}

export function buildCorsHeaders(req: Request): HeadersInit {
  const origin = req.headers.get('Origin') ?? '';
  const allowOrigin = resolveAllowedOrigin(origin) ?? 'null';

  return {
    'Access-Control-Allow-Origin': allowOrigin,
    'Access-Control-Allow-Headers':
      'authorization, x-client-info, apikey, content-type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Max-Age': '86400',
    Vary: 'Origin',
  };
}

export function handleOptions(req: Request): Response | null {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: buildCorsHeaders(req) });
  }
  return null;
}
