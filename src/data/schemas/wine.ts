import { z } from 'zod';

export const cellarTypeSchema = z.enum([
  'climatizada',
  'subterranea',
  'armario',
  'adega_natural',
  'garrafeira',
]);

export const createCellarInputSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, 'Informe o nome da adega')
    .max(80, 'Nome deve ter no máximo 80 caracteres'),
  type: cellarTypeSchema,
  capacity: z.number().int().positive().max(10000).optional().default(50),
});

export const cellarSchema = z.object({
  id: z.string().uuid(),
  user_id: z.string().uuid(),
  name: z.string().min(1).max(80),
  type: cellarTypeSchema,
  capacity: z.number().int().positive().max(10000),
  created_at: z.string(),
  updated_at: z.string(),
});

export const wineReportSchema = z.object({
  producer_story: z.string(),
  terroir: z.string(),
  vintage_story: z.string(),
  label_story: z.string(),
  technical_sheet: z.string(),
  sensory_analysis: z.string().optional(),
  visual_analysis: z.string().optional(),
  olfactory_analysis: z.string().optional(),
  palate_analysis: z.string().optional(),
  oak_influence: z.string().optional(),
  tannin_level: z.string().optional(),
  aging_potential: z.string(),
  drinking_window: z.string(),
  pairings: z.array(z.string()).min(1).max(3),
  buying_rationale: z.string(),
});

export const wineCacheSchema = z.object({
  id: z.string().uuid(),
  normalized_name: z.string(),
  name: z.string().min(1).max(200),
  producer: z.string().nullable(),
  vintage: z.number().int().nullable(),
  region: z.string().nullable(),
  country: z.string().nullable(),
  grape_variety: z.string().nullable(),
  wine_type: z.string().nullable(),
  tasting_notes: z.string().nullable(),
  pairing_notes: z.string().nullable(),
  alcohol_pct: z.number().nullable(),
  serving_temp_c: z.number().nullable(),
  source: z.string().optional(),
  metadata: z
    .object({
      report: wineReportSchema.optional(),
    })
    .passthrough()
    .nullable()
    .optional(),
});

export type WineReport = z.infer<typeof wineReportSchema>;

export const cellarWineSchema = z.object({
  id: z.string().uuid(),
  cellar_id: z.string().uuid(),
  wine_cache_id: z.string().uuid(),
  quantity: z.number().int().min(0).max(10000),
  notes: z.string().max(500).nullable(),
  wines_cache: wineCacheSchema.optional().nullable(),
});

export const addWineToCellarSchema = z.object({
  cellarId: z.string().uuid(),
  wineCacheId: z.string().uuid(),
  quantity: z.number().int().min(1).max(10000),
  notes: z
    .string()
    .trim()
    .max(500)
    .optional()
    .nullable()
    .transform((v) => (v && v.length > 0 ? v : null)),
});

export const wineSearchRequestSchema = z.object({
  query: z
    .string()
    .trim()
    .min(2)
    .max(200)
    .regex(/^[\p{L}\p{N}\s.'’&\-()/]+$/u, 'Caracteres inválidos na busca'),
  forceRefresh: z.boolean().optional(),
  wineCacheId: z.string().uuid().optional(),
});

export const wineSearchResponseSchema = z.object({
  wine: wineCacheSchema,
  fromCache: z.boolean(),
  similarity: z.number().min(0).max(1).optional(),
});

export const dailyTipRequestSchema = z.object({
  latitude: z.number().min(-90).max(90).optional(),
  longitude: z.number().min(-180).max(180).optional(),
  cellarId: z.string().uuid().optional(),
});

export const dailyTipResponseSchema = z.object({
  title: z.string().max(120),
  editorial: z.string().max(2000),
  wineName: z.string().max(200),
  wineId: z.string().uuid().nullable(),
  weatherSummary: z.string().max(200),
  temperatureC: z.number(),
  locationLabel: z.string().max(120),
  pairingRationale: z.string().max(1000),
  fromCache: z.boolean(),
});

export const createReportErrorSchema = z.object({
  wineName: z.string().trim().min(1).max(200),
  wineCacheId: z.string().uuid().optional().nullable(),
  grapeVariety: z.string().trim().max(200).optional().nullable(),
  message: z
    .string()
    .trim()
    .min(4, 'Descreva o erro com pelo menos 4 caracteres')
    .max(2000),
});

export const reportErrorSchema = z.object({
  id: z.string().uuid(),
  user_id: z.string().uuid(),
  wine_cache_id: z.string().uuid().nullable(),
  wine_name: z.string(),
  grape_variety: z.string().nullable(),
  message: z.string(),
  status: z.enum(['open', 'reviewed']),
  created_at: z.string(),
});

export type WineSearchResponse = z.infer<typeof wineSearchResponseSchema>;
export type DailyTipResponse = z.infer<typeof dailyTipResponseSchema>;
export type ReportError = z.infer<typeof reportErrorSchema>;
export type CreateReportErrorInput = z.infer<typeof createReportErrorSchema>;
