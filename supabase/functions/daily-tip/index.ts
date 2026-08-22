import { buildCorsHeaders, handleOptions } from '../_shared/cors.ts';
import { getServiceClient, requireUser } from '../_shared/auth.ts';
import { enforceRateLimit } from '../_shared/rateLimit.ts';
import { dailyTipBodySchema, sanitizeText } from '../_shared/schemas.ts';
import { assertAiConfigured, generateDailyTip } from '../_shared/ai.ts';

function json(req: Request, body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      ...buildCorsHeaders(req),
      'Content-Type': 'application/json',
    },
  });
}

async function fetchWeather(
  lat: number,
  lon: number,
): Promise<{ summary: string; temperatureC: number; locationLabel: string }> {
  const apiKey = Deno.env.get('WEATHER_API_KEY');

  // Fallback seguro se a chave não estiver configurada
  if (!apiKey) {
    return {
      summary: 'Clima ameno (fallback)',
      temperatureC: 22,
      locationLabel: 'Localização indisponível',
    };
  }

  const url =
    `https://api.openweathermap.org/data/2.5/weather?lat=${lat}&lon=${lon}&units=metric&lang=pt_br&appid=${apiKey}`;

  const res = await fetch(url);
  if (!res.ok) {
    return {
      summary: 'Clima indisponível',
      temperatureC: 22,
      locationLabel: 'Localização aproximada',
    };
  }

  const data = await res.json();
  const temp = Number(data?.main?.temp ?? 22);
  const desc = String(data?.weather?.[0]?.description ?? 'tempo estável');
  const city = String(data?.name ?? 'Sua região');

  return {
    summary: sanitizeText(desc, 200),
    temperatureC: temp,
    locationLabel: sanitizeText(city, 120),
  };
}

Deno.serve(async (req) => {
  const opt = handleOptions(req);
  if (opt) return opt;

  if (req.method !== 'POST') {
    return json(req, { error: 'Method not allowed' }, 405);
  }

  try {
    assertAiConfigured();

    const auth = await requireUser(req);
    if ('error' in auth) {
      return json(req, { error: auth.error }, auth.status);
    }

    const limit = await enforceRateLimit(auth.user.id, 'daily-tip', 6);
    if (!limit.ok) {
      return json(req, { error: limit.error, code: 'RATE_LIMITED' }, limit.status);
    }

    const rawBody = await req.json().catch(() => ({}));
    const parsed = dailyTipBodySchema.safeParse(rawBody);
    if (!parsed.success) {
      return json(req, { error: 'Invalid payload', code: 'VALIDATION_ERROR' }, 400);
    }

    const { latitude, longitude, cellarId } = parsed.data;
    const hasCoords =
      typeof latitude === 'number' && typeof longitude === 'number';

    const weather = hasCoords
      ? await fetchWeather(latitude, longitude)
      : {
          summary: 'Clima ameno (sem geolocalização)',
          temperatureC: 22,
          locationLabel: 'Brasil',
        };

    const service = getServiceClient();

    // Carrega vinhos da adega do usuário (ownership enforced)
    let cellarWines: string[] = [];
    let cellarType: string | undefined;
    let wineId: string | null = null;

    if (cellarId) {
      const { data: cellar } = await service
        .from('cellars')
        .select('id, type, user_id')
        .eq('id', cellarId)
        .eq('user_id', auth.user.id)
        .maybeSingle();

      if (cellar) {
        cellarType = cellar.type;
        const { data: wines } = await service
          .from('cellar_wines')
          .select('wine_cache_id, wines_cache(id, name)')
          .eq('cellar_id', cellar.id)
          .limit(20);

        cellarWines = (wines ?? [])
          .map((w: { wines_cache?: { name?: string; id?: string } | null }) => {
            if (w.wines_cache?.id && !wineId) wineId = w.wines_cache.id;
            return w.wines_cache?.name ?? '';
          })
          .filter(Boolean);
      }
    } else {
      const { data: cellars } = await service
        .from('cellars')
        .select('id, type')
        .eq('user_id', auth.user.id)
        .limit(1);

      const first = cellars?.[0];
      if (first) {
        cellarType = first.type;
        const { data: wines } = await service
          .from('cellar_wines')
          .select('wines_cache(id, name)')
          .eq('cellar_id', first.id)
          .limit(20);

        cellarWines = (wines ?? [])
          .map((w: { wines_cache?: { name?: string; id?: string } | null }) => {
            if (w.wines_cache?.id && !wineId) wineId = w.wines_cache.id;
            return w.wines_cache?.name ?? '';
          })
          .filter(Boolean);
      }
    }

    const tip = await generateDailyTip({
      weatherSummary: weather.summary,
      temperatureC: weather.temperatureC,
      locationLabel: weather.locationLabel,
      cellarWines,
      cellarType,
    });

    return json(req, {
      title: tip.title,
      editorial: tip.editorial,
      wineName: tip.wineName,
      wineId,
      weatherSummary: weather.summary,
      temperatureC: weather.temperatureC,
      locationLabel: weather.locationLabel,
      pairingRationale: tip.pairingRationale,
      fromCache: false,
    });
  } catch (err) {
    console.error('daily_tip_unhandled', err);
    return json(req, { error: 'Internal error' }, 500);
  }
});
