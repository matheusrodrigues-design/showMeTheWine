import { buildCorsHeaders, handleOptions } from '../_shared/cors.ts';
import { getServiceClient, requireUser } from '../_shared/auth.ts';
import { enforceRateLimit } from '../_shared/rateLimit.ts';
import {
  sanitizeText,
  sanitizeWineReport,
  wineSearchBodySchema,
  type WineAi,
} from '../_shared/schemas.ts';
import {
  aiSourceLabel,
  analyzeWineByImage,
  analyzeWineByText,
  assertAiConfigured,
} from '../_shared/ai.ts';

function json(req: Request, body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      ...buildCorsHeaders(req),
      'Content-Type': 'application/json',
    },
  });
}

function normalizeName(name: string): string {
  return sanitizeText(name, 200).toLowerCase();
}

Deno.serve(async (req) => {
  const opt = handleOptions(req);
  if (opt) return opt;

  if (req.method !== 'POST') {
    return json(req, { error: 'Method not allowed' }, 405);
  }

  try {
    const auth = await requireUser(req);
    if ('error' in auth) {
      return json(req, { error: auth.error }, auth.status);
    }

    const limit = await enforceRateLimit(auth.user.id, 'wine-search', 8);
    if (!limit.ok) {
      return json(req, { error: limit.error, code: 'RATE_LIMITED' }, limit.status);
    }

    const rawBody = await req.json().catch(() => null);
    const parsed = wineSearchBodySchema.safeParse(rawBody);
    if (!parsed.success) {
      return json(
        req,
        { error: 'Invalid payload', code: 'VALIDATION_ERROR' },
        400,
      );
    }

    const body = parsed.data;
    const isOcr = body.mode === 'ocr' || Boolean(body.imageBase64);
    const service = getServiceClient();

    let searchQuery = body.query ? normalizeName(body.query) : '';

    // OCR: primeiro extrai nome via modelo vision, depois aplica regra de cache
    let aiWine: WineAi | null = null;
    if (isOcr && body.imageBase64) {
      // Rate limit mais agressivo para OCR (custo alto)
      const ocrLimit = await enforceRateLimit(auth.user.id, 'wine-ocr', 3);
      if (!ocrLimit.ok) {
        return json(
          req,
          { error: ocrLimit.error, code: 'RATE_LIMITED' },
          ocrLimit.status,
        );
      }
      assertAiConfigured();
      aiWine = await analyzeWineByImage(body.imageBase64);
      searchQuery = normalizeName(aiWine.name);
    }

    // Regra de Ouro: cache FIRST (similarity > 0.8)
    const { data: cached, error: cacheError } = await service.rpc(
      'search_wines_cache',
      {
        p_query: searchQuery,
        p_threshold: 0.8,
        p_limit: 1,
      },
    );

    if (cacheError) {
      console.error('cache_search_error', cacheError.message);
    }

    const hit = Array.isArray(cached) && cached.length > 0 ? cached[0] : null;
    const hitHasReport =
      hit &&
      typeof hit === 'object' &&
      hit.metadata &&
      typeof hit.metadata === 'object' &&
      hit.metadata.report &&
      typeof hit.metadata.report === 'object' &&
      typeof hit.metadata.report.sensory_analysis === 'string';

    if (hit && hitHasReport) {
      return json(req, {
        wine: hit,
        fromCache: true,
        similarity: 0.8,
      });
    }

    // Miss → IA (texto) se ainda não veio do OCR
    if (!aiWine) {
      assertAiConfigured();
      aiWine = await analyzeWineByText(searchQuery);
    }

    const normalized = normalizeName(aiWine.name);
    const report = sanitizeWineReport(aiWine.report);
    const insertPayload = {
      normalized_name: normalized,
      name: sanitizeText(aiWine.name, 200),
      producer: aiWine.producer ? sanitizeText(aiWine.producer, 200) : null,
      vintage: aiWine.vintage,
      region: aiWine.region ? sanitizeText(aiWine.region, 200) : null,
      country: aiWine.country ? sanitizeText(aiWine.country, 120) : null,
      grape_variety: aiWine.grape_variety
        ? sanitizeText(aiWine.grape_variety, 200)
        : null,
      wine_type: aiWine.wine_type,
      tasting_notes: aiWine.tasting_notes
        ? sanitizeText(aiWine.tasting_notes, 1000)
        : null,
      pairing_notes: report.pairings.join(' · '),
      alcohol_pct: aiWine.alcohol_pct,
      serving_temp_c: aiWine.serving_temp_c,
      source: isOcr ? 'ocr' : aiSourceLabel(),
      metadata: { report },
    };

    const { data: saved, error: saveError } = await service
      .from('wines_cache')
      .upsert(insertPayload, { onConflict: 'normalized_name' })
      .select('*')
      .single();

    if (saveError) {
      console.error('cache_save_error', saveError.message);
      return json(req, { error: 'Failed to persist wine cache' }, 500);
    }

    return json(req, {
      wine: saved,
      fromCache: false,
    });
  } catch (err) {
    console.error('wine_search_unhandled', err);
    return json(req, { error: 'Internal error' }, 500);
  }
});
