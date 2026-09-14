import { neon, type NeonQueryFunction } from '@neondatabase/serverless';
import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { sign, verify } from 'hono/jwt';
import { z } from 'zod';
import {
  analyzeWineByImage,
  analyzeWineByText,
  assertAiConfigured,
  generateDailyTip,
  sanitizeText,
  sanitizeWineReport,
  type WineAi,
} from './ai';

type Bindings = {
  DATABASE_URL: string;
  AUTH_SECRET: string;
  GEMINI_API_KEY?: string;
  GEMINI_MODEL?: string;
  WEATHER_API_KEY?: string;
  AI_PROVIDER?: string;
};

type AuthUser = { id: string; email: string; isAdmin: boolean };

type Vars = { user: AuthUser };

const app = new Hono<{ Bindings: Bindings; Variables: Vars }>();

const ALLOWED_ORIGINS = new Set([
  'http://localhost:8081',
  'http://localhost:19006',
  'http://127.0.0.1:8081',
  'http://127.0.0.1:19006',
  'https://sommelier-digital-rho.vercel.app',
  'https://show-me-the-wine.vercel.app',
]);

function originAllowed(origin: string): boolean {
  if (ALLOWED_ORIGINS.has(origin)) return true;
  try {
    const url = new URL(origin);
    if (url.protocol !== 'https:') return false;
    const host = url.hostname;
    return (
      host === 'show-me-the-wine.vercel.app' ||
      host.endsWith('-show-me-the-wine.vercel.app') ||
      (host.endsWith('.vercel.app') && host.includes('show-me-the-wine')) ||
      host === 'sommelier-digital-rho.vercel.app' ||
      (host.endsWith('.vercel.app') && host.includes('sommelier-digital-rho'))
    );
  } catch {
    return false;
  }
}

app.use(
  '*',
  cors({
    origin: (origin) => {
      if (!origin) return '*';
      return originAllowed(origin) ? origin : null;
    },
    allowHeaders: ['Authorization', 'Content-Type'],
    allowMethods: ['GET', 'POST', 'PATCH', 'OPTIONS'],
    maxAge: 86400,
  }),
);

function db(url: string): NeonQueryFunction<false, false> {
  return neon(url);
}

function jsonError(message: string, status: number, code?: string) {
  return { error: message, ...(code ? { code } : {}) };
}

const credentialsSchema = z.object({
  email: z.string().email().max(254),
  password: z.string().min(8).max(128),
});

async function issueToken(secret: string, user: AuthUser): Promise<string> {
  return sign(
    {
      sub: user.id,
      email: user.email,
      adm: user.isAdmin,
      exp: Math.floor(Date.now() / 1000) + 60 * 60 * 24 * 14,
    },
    secret,
    'HS256',
  );
}

function asString(value: unknown): string {
  if (value instanceof Date) return value.toISOString();
  return String(value);
}

function asNumber(value: unknown): number | null {
  if (value == null) return null;
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

function asObject(value: unknown): Record<string, unknown> {
  if (value && typeof value === 'object' && !Array.isArray(value)) {
    return value as Record<string, unknown>;
  }
  if (typeof value === 'string') {
    try {
      const parsed = JSON.parse(value) as unknown;
      if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
        return parsed as Record<string, unknown>;
      }
    } catch {
      return {};
    }
  }
  return {};
}

function wineRow(row: Record<string, unknown>) {
  return {
    id: row.id,
    normalized_name: row.normalized_name,
    name: row.name,
    producer: row.producer,
    vintage: asNumber(row.vintage),
    region: row.region,
    country: row.country,
    grape_variety: row.grape_variety,
    wine_type: row.wine_type,
    tasting_notes: row.tasting_notes,
    pairing_notes: row.pairing_notes,
    alcohol_pct: asNumber(row.alcohol_pct),
    serving_temp_c: asNumber(row.serving_temp_c),
    source: row.source,
    metadata: asObject(row.metadata),
  };
}

function cellarRow(row: Record<string, unknown>) {
  return {
    id: row.id,
    user_id: row.user_id,
    name: row.name,
    type: row.type,
    capacity: Number(row.capacity),
    created_at: asString(row.created_at),
    updated_at: asString(row.updated_at),
  };
}

function cellarWineRow(
  row: Record<string, unknown>,
  wine: Record<string, unknown> | null,
) {
  return {
    id: row.id,
    cellar_id: row.cellar_id,
    wine_cache_id: row.wine_cache_id,
    quantity: Number(row.quantity),
    notes: row.notes,
    wines_cache: wine ? wineRow(wine) : null,
  };
}

function reportRow(row: Record<string, unknown>) {
  return {
    id: row.id,
    user_id: row.user_id,
    wine_cache_id: row.wine_cache_id,
    wine_name: row.wine_name,
    grape_variety: row.grape_variety,
    message: row.message,
    status: row.status,
    created_at: asString(row.created_at),
  };
}

async function rateLimit(
  sql: NeonQueryFunction<false, false>,
  userId: string,
  endpoint: string,
  maxPerMinute: number,
): Promise<boolean> {
  const rows = await sql`
    INSERT INTO public.rate_limits (user_id, endpoint, window_start, request_count)
    VALUES (${userId}, ${endpoint}, date_trunc('minute', now()), 1)
    ON CONFLICT (user_id, endpoint, window_start)
    DO UPDATE SET request_count = public.rate_limits.request_count + 1
    RETURNING request_count
  `;
  const count = Number((rows[0] as { request_count: number }).request_count);
  return count <= maxPerMinute;
}

async function sessionFromHeader(
  c: {
    env: Bindings;
    req: { header: (name: string) => string | undefined };
  },
): Promise<AuthUser | null> {
  const header = c.req.header('Authorization') ?? '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : '';
  if (!token || !c.env.AUTH_SECRET) return null;
  try {
    const payload = await verify(token, c.env.AUTH_SECRET, 'HS256');
    const id = typeof payload.sub === 'string' ? payload.sub : '';
    const email = typeof payload.email === 'string' ? payload.email : '';
    if (!id || !email) return null;
    return { id, email, isAdmin: payload.adm === true };
  } catch {
    return null;
  }
}

app.use('*', async (c, next) => {
  if (!c.env.DATABASE_URL || !c.env.AUTH_SECRET) {
    return c.json(jsonError('API sem configuração de banco', 500), 500);
  }
  await next();
});

app.get('/health', (c) => c.json({ ok: true }));

app.post('/auth/signup', async (c) => {
  const parsed = credentialsSchema.safeParse(await c.req.json().catch(() => null));
  if (!parsed.success) {
    return c.json(jsonError('E-mail ou senha inválidos', 400, 'VALIDATION_ERROR'), 400);
  }
  const email = parsed.data.email.trim().toLowerCase();
  const sql = db(c.env.DATABASE_URL);

  const existing = await sql`
    SELECT id, password_hash, email
    FROM public.users
    WHERE lower(email) = ${email}
    LIMIT 1
  `;
  const found = existing[0] as
    | { id: string; password_hash: string; email: string }
    | undefined;

  let userId = found?.id;
  if (found && found.password_hash !== 'pending') {
    return c.json(jsonError('Este e-mail já está cadastrado. Faça login.', 409), 409);
  }

  if (found) {
    const updated = await sql`
      UPDATE public.users
      SET password_hash = crypt(${parsed.data.password}, gen_salt('bf'))
      WHERE id = ${found.id} AND password_hash = 'pending'
      RETURNING id, email
    `;
    if (!updated[0]) {
      return c.json(jsonError('Não foi possível definir a senha. Tente entrar.', 409), 409);
    }
    userId = (updated[0] as { id: string }).id;
  } else {
    const created = await sql`
      INSERT INTO public.users (email, password_hash)
      VALUES (${email}, crypt(${parsed.data.password}, gen_salt('bf')))
      RETURNING id, email
    `;
    userId = (created[0] as { id: string }).id;
    const display = email.split('@')[0] ?? 'cliente';
    await sql`
      INSERT INTO public.profiles (id, display_name)
      VALUES (${userId}, ${display})
      ON CONFLICT (id) DO NOTHING
    `;
  }

  const profile = await sql`
    SELECT is_admin FROM public.profiles WHERE id = ${userId} LIMIT 1
  `;
  const user: AuthUser = {
    id: userId!,
    email,
    isAdmin: (profile[0] as { is_admin?: boolean } | undefined)?.is_admin === true,
  };
  const accessToken = await issueToken(c.env.AUTH_SECRET, user);
  return c.json({ accessToken, user });
});

app.post('/auth/login', async (c) => {
  const parsed = credentialsSchema.safeParse(await c.req.json().catch(() => null));
  if (!parsed.success) {
    return c.json(jsonError('E-mail ou senha inválidos', 400, 'VALIDATION_ERROR'), 400);
  }
  const email = parsed.data.email.trim().toLowerCase();
  const sql = db(c.env.DATABASE_URL);
  const rows = await sql`
    SELECT id, email, password_hash
    FROM public.users
    WHERE lower(email) = ${email}
    LIMIT 1
  `;
  const found = rows[0] as
    | { id: string; email: string; password_hash: string }
    | undefined;
  if (!found) {
    return c.json(jsonError('E-mail ou senha incorretos', 401), 401);
  }
  if (found.password_hash === 'pending') {
    return c.json(
      jsonError(
        'Conta migrada. Cadastre-se de novo com o mesmo e-mail para definir a senha.',
        409,
        'ACCOUNT_MIGRATED',
      ),
      409,
    );
  }
  const ok = await sql`
    SELECT id FROM public.users
    WHERE id = ${found.id}
      AND password_hash = crypt(${parsed.data.password}, password_hash)
    LIMIT 1
  `;
  if (!ok[0]) {
    return c.json(jsonError('E-mail ou senha incorretos', 401), 401);
  }
  const profile = await sql`
    SELECT is_admin FROM public.profiles WHERE id = ${found.id} LIMIT 1
  `;
  const user: AuthUser = {
    id: found.id,
    email: found.email,
    isAdmin: (profile[0] as { is_admin?: boolean } | undefined)?.is_admin === true,
  };
  const accessToken = await issueToken(c.env.AUTH_SECRET, user);
  return c.json({ accessToken, user });
});

app.get('/auth/me', async (c) => {
  const user = await sessionFromHeader(c);
  if (!user) return c.json(jsonError('Sessão expirada. Faça login novamente.', 401), 401);
  const sql = db(c.env.DATABASE_URL);
  const profile = await sql`
    SELECT is_admin FROM public.profiles WHERE id = ${user.id} LIMIT 1
  `;
  return c.json({
    user: {
      id: user.id,
      email: user.email,
      isAdmin: (profile[0] as { is_admin?: boolean } | undefined)?.is_admin === true,
    },
  });
});

app.use('/cellars/*', async (c, next) => {
  const user = await sessionFromHeader(c);
  if (!user) return c.json(jsonError('Sessão expirada. Faça login novamente.', 401), 401);
  c.set('user', user);
  await next();
});
app.use('/cellars', async (c, next) => {
  const user = await sessionFromHeader(c);
  if (!user) return c.json(jsonError('Sessão expirada. Faça login novamente.', 401), 401);
  c.set('user', user);
  await next();
});

app.get('/cellars', async (c) => {
  const user = c.get('user');
  const sql = db(c.env.DATABASE_URL);
  const rows = await sql`
    SELECT * FROM public.cellars
    WHERE user_id = ${user.id}
    ORDER BY created_at ASC
  `;
  return c.json(rows.map((row) => cellarRow(row as Record<string, unknown>)));
});

const createCellarSchema = z.object({
  name: z.string().trim().min(1).max(80),
  type: z.enum(['climatizada', 'subterranea', 'armario', 'adega_natural', 'garrafeira']),
  capacity: z.number().int().positive().max(10000).optional(),
});

app.post('/cellars', async (c) => {
  const user = c.get('user');
  const parsed = createCellarSchema.safeParse(await c.req.json().catch(() => null));
  if (!parsed.success) {
    return c.json(jsonError('Dados da adega inválidos', 400, 'VALIDATION_ERROR'), 400);
  }
  const sql = db(c.env.DATABASE_URL);
  const rows = await sql`
    INSERT INTO public.cellars (user_id, name, type, capacity)
    VALUES (
      ${user.id},
      ${parsed.data.name},
      CAST(${parsed.data.type} AS public.cellar_type),
      ${parsed.data.capacity ?? 50}
    )
    RETURNING *
  `;
  return c.json(cellarRow(rows[0] as Record<string, unknown>));
});

app.patch('/cellars/:id', async (c) => {
  const user = c.get('user');
  const id = c.req.param('id');
  if (!z.string().uuid().safeParse(id).success) {
    return c.json(jsonError('Adega inválida', 400), 400);
  }
  const body = z
    .object({
      type: z.enum(['climatizada', 'subterranea', 'armario', 'adega_natural', 'garrafeira']),
    })
    .safeParse(await c.req.json().catch(() => null));
  if (!body.success) {
    return c.json(jsonError('Tipo de adega inválido', 400), 400);
  }
  const sql = db(c.env.DATABASE_URL);
  const rows = await sql`
    UPDATE public.cellars
    SET type = CAST(${body.data.type} AS public.cellar_type)
    WHERE id = ${id} AND user_id = ${user.id}
    RETURNING *
  `;
  if (!rows[0]) return c.json(jsonError('Adega não encontrada', 404), 404);
  return c.json(cellarRow(rows[0] as Record<string, unknown>));
});

app.get('/cellars/:id/wines', async (c) => {
  const user = c.get('user');
  const id = c.req.param('id');
  if (!z.string().uuid().safeParse(id).success) {
    return c.json(jsonError('Adega inválida', 400), 400);
  }
  const sql = db(c.env.DATABASE_URL);
  const owned = await sql`
    SELECT id FROM public.cellars WHERE id = ${id} AND user_id = ${user.id} LIMIT 1
  `;
  if (!owned[0]) return c.json(jsonError('Adega não encontrada', 404), 404);
  const rows = await sql`
    SELECT cw.*, to_jsonb(w) AS wines_cache
    FROM public.cellar_wines cw
    JOIN public.wines_cache w ON w.id = cw.wine_cache_id
    WHERE cw.cellar_id = ${id}
    ORDER BY cw.created_at DESC
  `;
  return c.json(
    rows.map((row) => {
      const record = row as Record<string, unknown>;
      return cellarWineRow(record, record.wines_cache as Record<string, unknown>);
    }),
  );
});

const addWineSchema = z.object({
  wineCacheId: z.string().uuid(),
  quantity: z.number().int().min(1).max(10000),
  notes: z.string().max(500).nullable().optional(),
});

app.post('/cellars/:id/wines', async (c) => {
  const user = c.get('user');
  const cellarId = c.req.param('id');
  if (!z.string().uuid().safeParse(cellarId).success) {
    return c.json(jsonError('Adega inválida', 400), 400);
  }
  const parsed = addWineSchema.safeParse(await c.req.json().catch(() => null));
  if (!parsed.success) {
    return c.json(jsonError('Vinho inválido', 400, 'VALIDATION_ERROR'), 400);
  }
  const sql = db(c.env.DATABASE_URL);
  const owned = await sql`
    SELECT id FROM public.cellars WHERE id = ${cellarId} AND user_id = ${user.id} LIMIT 1
  `;
  if (!owned[0]) return c.json(jsonError('Adega não encontrada', 404), 404);

  const rows = await sql`
    WITH upserted AS (
      INSERT INTO public.cellar_wines (cellar_id, wine_cache_id, quantity, notes)
      VALUES (
        ${cellarId},
        ${parsed.data.wineCacheId},
        ${parsed.data.quantity},
        ${parsed.data.notes ?? null}
      )
      ON CONFLICT (cellar_id, wine_cache_id)
      DO UPDATE SET
        quantity = LEAST(public.cellar_wines.quantity + EXCLUDED.quantity, 10000),
        notes = EXCLUDED.notes
      RETURNING *
    )
    SELECT u.*, to_jsonb(w) AS wines_cache
    FROM upserted u
    JOIN public.wines_cache w ON w.id = u.wine_cache_id
  `;
  if (!rows[0]) return c.json(jsonError('Não foi possível adicionar o vinho', 400), 400);
  const record = rows[0] as Record<string, unknown>;
  return c.json(cellarWineRow(record, record.wines_cache as Record<string, unknown>));
});

app.use('/report-errors', async (c, next) => {
  const user = await sessionFromHeader(c);
  if (!user) return c.json(jsonError('Sessão expirada. Faça login novamente.', 401), 401);
  c.set('user', user);
  await next();
});
app.use('/report-errors/*', async (c, next) => {
  const user = await sessionFromHeader(c);
  if (!user) return c.json(jsonError('Sessão expirada. Faça login novamente.', 401), 401);
  c.set('user', user);
  await next();
});

const reportSchema = z.object({
  wineName: z.string().trim().min(1).max(200),
  wineCacheId: z.string().uuid().nullable().optional(),
  grapeVariety: z.string().trim().max(200).nullable().optional(),
  message: z.string().trim().min(4).max(2000),
});

app.post('/report-errors', async (c) => {
  const user = c.get('user');
  const parsed = reportSchema.safeParse(await c.req.json().catch(() => null));
  if (!parsed.success) {
    return c.json(jsonError('Relato inválido', 400, 'VALIDATION_ERROR'), 400);
  }
  const sql = db(c.env.DATABASE_URL);
  const rows = await sql`
    INSERT INTO public.report_errors (user_id, wine_cache_id, wine_name, grape_variety, message)
    VALUES (
      ${user.id},
      ${parsed.data.wineCacheId ?? null},
      ${parsed.data.wineName},
      ${parsed.data.grapeVariety ?? null},
      ${parsed.data.message}
    )
    RETURNING *
  `;
  return c.json(reportRow(rows[0] as Record<string, unknown>));
});

app.get('/report-errors', async (c) => {
  const user = c.get('user');
  if (!user.isAdmin) return c.json(jsonError('Acesso restrito', 403), 403);
  const sql = db(c.env.DATABASE_URL);
  const rows = await sql`
    SELECT * FROM public.report_errors
    ORDER BY created_at DESC
    LIMIT 100
  `;
  return c.json(rows.map((row) => reportRow(row as Record<string, unknown>)));
});

app.patch('/report-errors/:id', async (c) => {
  const user = c.get('user');
  if (!user.isAdmin) return c.json(jsonError('Acesso restrito', 403), 403);
  const id = c.req.param('id');
  if (!z.string().uuid().safeParse(id).success) {
    return c.json(jsonError('Relato inválido', 400), 400);
  }
  const sql = db(c.env.DATABASE_URL);
  const rows = await sql`
    UPDATE public.report_errors
    SET status = 'reviewed'
    WHERE id = ${id}
    RETURNING id
  `;
  if (!rows[0]) return c.json(jsonError('Relato não encontrado', 404), 404);
  return c.json({ ok: true });
});

app.use('/wine-search', async (c, next) => {
  const user = await sessionFromHeader(c);
  if (!user) return c.json(jsonError('Sessão expirada. Faça login novamente.', 401), 401);
  c.set('user', user);
  await next();
});
app.use('/daily-tip', async (c, next) => {
  const user = await sessionFromHeader(c);
  if (!user) return c.json(jsonError('Sessão expirada. Faça login novamente.', 401), 401);
  c.set('user', user);
  await next();
});

const wineSearchSchema = z
  .object({
    query: z.string().trim().min(2).max(200).optional(),
    imageBase64: z.string().min(100).max(1_500_000).optional(),
    mode: z.enum(['text', 'ocr']).optional(),
    forceRefresh: z.boolean().optional(),
    wineCacheId: z.string().uuid().optional(),
  })
  .superRefine((val, ctx) => {
    const isOcr = val.mode === 'ocr' || Boolean(val.imageBase64);
    if (isOcr && !val.imageBase64) {
      ctx.addIssue({ code: 'custom', message: 'imageBase64 required' });
    }
    if (!isOcr && !val.query) {
      ctx.addIssue({ code: 'custom', message: 'query required' });
    }
  });

function hasCompleteReport(hit: Record<string, unknown> | null): boolean {
  if (!hit) return false;
  const metadata = asObject(hit.metadata);
  const report = metadata.report;
  return (
    !!report &&
    typeof report === 'object' &&
    typeof (report as { visual_analysis?: unknown }).visual_analysis === 'string'
  );
}

app.post('/wine-search', async (c) => {
  const user = c.get('user');
  const sql = db(c.env.DATABASE_URL);
  if (!(await rateLimit(sql, user.id, 'wine-search', 8))) {
    return c.json(jsonError('Muitas solicitações. Aguarde um momento.', 429, 'RATE_LIMITED'), 429);
  }
  const parsed = wineSearchSchema.safeParse(await c.req.json().catch(() => null));
  if (!parsed.success) {
    return c.json(jsonError('Busca inválida', 400, 'VALIDATION_ERROR'), 400);
  }
  const body = parsed.data;
  const isOcr = body.mode === 'ocr' || Boolean(body.imageBase64);
  let searchQuery = body.query ? sanitizeText(body.query, 200).toLowerCase() : '';
  let aiWine: WineAi | null = null;

  if (isOcr && body.imageBase64) {
    if (!(await rateLimit(sql, user.id, 'wine-ocr', 3))) {
      return c.json(jsonError('Muitas solicitações. Aguarde um momento.', 429, 'RATE_LIMITED'), 429);
    }
    try {
      assertAiConfigured(c.env);
      aiWine = await analyzeWineByImage(c.env, body.imageBase64);
      searchQuery = sanitizeText(aiWine.name, 200).toLowerCase();
    } catch (err) {
      console.error('wine_ocr_error', err);
      return c.json(jsonError('Não foi possível ler o rótulo agora', 503), 503);
    }
  }

  const cached = await sql`
    SELECT * FROM public.search_wines_cache(${searchQuery}, 0.8, 1)
  `;
  const hit = (cached[0] as Record<string, unknown> | undefined) ?? null;
  if (hit && hasCompleteReport(hit) && body.forceRefresh !== true) {
    return c.json({ wine: wineRow(hit), fromCache: true, similarity: 0.8 });
  }

  if (!aiWine) {
    try {
      assertAiConfigured(c.env);
      aiWine = await analyzeWineByText(c.env, searchQuery);
    } catch (err) {
      console.error('wine_text_error', err);
      return c.json(jsonError('Sommelier indisponível no momento', 503), 503);
    }
  }

  const report = sanitizeWineReport(aiWine.report);
  const payload = {
    normalized_name: sanitizeText(aiWine.name, 200).toLowerCase(),
    name: sanitizeText(aiWine.name, 200),
    producer: aiWine.producer ? sanitizeText(aiWine.producer, 200) : null,
    vintage: aiWine.vintage,
    region: aiWine.region ? sanitizeText(aiWine.region, 200) : null,
    country: aiWine.country ? sanitizeText(aiWine.country, 120) : null,
    grape_variety: aiWine.grape_variety ? sanitizeText(aiWine.grape_variety, 200) : null,
    wine_type: aiWine.wine_type,
    tasting_notes: aiWine.tasting_notes ? sanitizeText(aiWine.tasting_notes, 1000) : null,
    pairing_notes: report.pairings.join(' · '),
    alcohol_pct: aiWine.alcohol_pct,
    serving_temp_c: aiWine.serving_temp_c,
    source: isOcr ? 'ocr' : 'gemini',
    metadata: { report },
  };

  const persistId =
    body.wineCacheId ?? (hit && typeof hit.id === 'string' ? hit.id : null);

  let saved: Record<string, unknown> | null = null;
  if (persistId) {
    const updated = await sql`
      UPDATE public.wines_cache
      SET
        name = ${payload.name},
        producer = ${payload.producer},
        vintage = ${payload.vintage},
        region = ${payload.region},
        country = ${payload.country},
        grape_variety = ${payload.grape_variety},
        wine_type = ${payload.wine_type},
        tasting_notes = ${payload.tasting_notes},
        pairing_notes = ${payload.pairing_notes},
        alcohol_pct = ${payload.alcohol_pct},
        serving_temp_c = ${payload.serving_temp_c},
        source = ${payload.source},
        metadata = CAST(${JSON.stringify(payload.metadata)} AS jsonb)
      WHERE id = ${persistId}
      RETURNING *
    `;
    saved = (updated[0] as Record<string, unknown> | undefined) ?? null;
  }
  if (!saved) {
    const upserted = await sql`
      INSERT INTO public.wines_cache (
        normalized_name, name, producer, vintage, region, country, grape_variety,
        wine_type, tasting_notes, pairing_notes, alcohol_pct, serving_temp_c,
        source, metadata
      )
      VALUES (
        ${payload.normalized_name},
        ${payload.name},
        ${payload.producer},
        ${payload.vintage},
        ${payload.region},
        ${payload.country},
        ${payload.grape_variety},
        ${payload.wine_type},
        ${payload.tasting_notes},
        ${payload.pairing_notes},
        ${payload.alcohol_pct},
        ${payload.serving_temp_c},
        ${payload.source},
        CAST(${JSON.stringify(payload.metadata)} AS jsonb)
      )
      ON CONFLICT (normalized_name) DO UPDATE SET
        name = EXCLUDED.name,
        producer = EXCLUDED.producer,
        vintage = EXCLUDED.vintage,
        region = EXCLUDED.region,
        country = EXCLUDED.country,
        grape_variety = EXCLUDED.grape_variety,
        wine_type = EXCLUDED.wine_type,
        tasting_notes = EXCLUDED.tasting_notes,
        pairing_notes = EXCLUDED.pairing_notes,
        alcohol_pct = EXCLUDED.alcohol_pct,
        serving_temp_c = EXCLUDED.serving_temp_c,
        source = EXCLUDED.source,
        metadata = EXCLUDED.metadata
      RETURNING *
    `;
    saved = (upserted[0] as Record<string, unknown> | undefined) ?? null;
  }
  if (!saved) return c.json(jsonError('Não foi possível gravar a ficha', 500), 500);
  return c.json({ wine: wineRow(saved), fromCache: false });
});

app.post('/daily-tip', async (c) => {
  const user = c.get('user');
  const sql = db(c.env.DATABASE_URL);
  if (!(await rateLimit(sql, user.id, 'daily-tip', 6))) {
    return c.json(jsonError('Muitas solicitações. Aguarde um momento.', 429, 'RATE_LIMITED'), 429);
  }
  const body = z
    .object({
      latitude: z.number().min(-90).max(90).optional(),
      longitude: z.number().min(-180).max(180).optional(),
      cellarId: z.string().uuid().optional(),
    })
    .safeParse(await c.req.json().catch(() => ({})));
  if (!body.success) {
    return c.json(jsonError('Pedido inválido', 400, 'VALIDATION_ERROR'), 400);
  }

  let weather = {
    summary: 'Clima ameno (sem geolocalização)',
    temperatureC: 22,
    locationLabel: 'Brasil',
  };
  if (typeof body.data.latitude === 'number' && typeof body.data.longitude === 'number') {
    weather = await fetchWeather(c.env, body.data.latitude, body.data.longitude);
  }

  let cellarWines: string[] = [];
  let cellarType: string | undefined;
  let wineId: string | null = null;

  if (body.data.cellarId) {
    const cellars = await sql`
      SELECT id, type FROM public.cellars
      WHERE id = ${body.data.cellarId} AND user_id = ${user.id}
      LIMIT 1
    `;
    const cellar = cellars[0] as { id: string; type: string } | undefined;
    if (cellar) {
      cellarType = cellar.type;
      const wines = await sql`
        SELECT w.id, w.name
        FROM public.cellar_wines cw
        JOIN public.wines_cache w ON w.id = cw.wine_cache_id
        WHERE cw.cellar_id = ${cellar.id}
        LIMIT 20
      `;
      for (const wine of wines as { id: string; name: string }[]) {
        if (!wineId) wineId = wine.id;
        if (wine.name) cellarWines.push(wine.name);
      }
    }
  } else {
    const cellars = await sql`
      SELECT id, type FROM public.cellars
      WHERE user_id = ${user.id}
      ORDER BY created_at ASC
      LIMIT 1
    `;
    const cellar = cellars[0] as { id: string; type: string } | undefined;
    if (cellar) {
      cellarType = cellar.type;
      const wines = await sql`
        SELECT w.id, w.name
        FROM public.cellar_wines cw
        JOIN public.wines_cache w ON w.id = cw.wine_cache_id
        WHERE cw.cellar_id = ${cellar.id}
        LIMIT 20
      `;
      for (const wine of wines as { id: string; name: string }[]) {
        if (!wineId) wineId = wine.id;
        if (wine.name) cellarWines.push(wine.name);
      }
    }
  }

  try {
    assertAiConfigured(c.env);
    const tip = await generateDailyTip(c.env, {
      weatherSummary: weather.summary,
      temperatureC: weather.temperatureC,
      locationLabel: weather.locationLabel,
      cellarWines,
      cellarType,
    });
    return c.json({
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
    console.error('daily_tip_error', err);
    return c.json(jsonError('Dica do dia indisponível no momento', 503), 503);
  }
});

async function fetchWeather(
  env: Bindings,
  lat: number,
  lon: number,
): Promise<{ summary: string; temperatureC: number; locationLabel: string }> {
  if (!env.WEATHER_API_KEY) {
    return {
      summary: 'Clima ameno (fallback)',
      temperatureC: 22,
      locationLabel: 'Localização indisponível',
    };
  }
  const url =
    `https://api.openweathermap.org/data/2.5/weather?lat=${lat}&lon=${lon}&units=metric&lang=pt_br&appid=${env.WEATHER_API_KEY}`;
  const res = await fetch(url);
  if (!res.ok) {
    return {
      summary: 'Clima indisponível',
      temperatureC: 22,
      locationLabel: 'Localização aproximada',
    };
  }
  const data = (await res.json()) as {
    main?: { temp?: number };
    weather?: { description?: string }[];
    name?: string;
  };
  return {
    summary: sanitizeText(String(data.weather?.[0]?.description ?? 'tempo estável'), 200),
    temperatureC: Number(data.main?.temp ?? 22),
    locationLabel: sanitizeText(String(data.name ?? 'Sua região'), 120),
  };
}

export default app;
