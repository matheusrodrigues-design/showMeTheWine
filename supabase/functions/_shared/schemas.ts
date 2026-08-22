import { z } from 'https://deno.land/x/zod@v3.23.8/mod.ts';

const CONTROL = /[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g;
const INJECTION =
  /(ignore\s+(all|previous|above)\s+instructions|system\s*:|<\/?\s*script)/gi;

export function sanitizeText(input: string, max = 200): string {
  return input
    .replace(CONTROL, '')
    .replace(INJECTION, '')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, max);
}

export const wineSearchBodySchema = z
  .object({
    query: z.string().trim().min(2).max(200).optional(),
    imageBase64: z.string().min(100).max(1_500_000).optional(),
    mode: z.enum(['text', 'ocr']).optional(),
  })
  .superRefine((val, ctx) => {
    const isOcr = val.mode === 'ocr' || Boolean(val.imageBase64);
    if (isOcr && !val.imageBase64) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'imageBase64 required for OCR',
      });
    }
    if (!isOcr && !val.query) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'query required for text search',
      });
    }
  });

export const wineReportSchema = z.object({
  producer_story: z.string().min(1).max(1500),
  terroir: z.string().min(1).max(1500),
  vintage_story: z.string().min(1).max(1500),
  label_story: z.string().min(1).max(1500),
  technical_sheet: z.string().min(1).max(1500),
  sensory_analysis: z.string().min(1).max(1500),
  oak_influence: z.string().min(1).max(800),
  tannin_level: z.string().min(1).max(200),
  aging_potential: z.string().min(1).max(800),
  drinking_window: z.string().min(1).max(800),
  pairings: z.array(z.string().min(1).max(300)).min(3).max(3),
  buying_rationale: z.string().min(1).max(1500),
});

export const wineAiSchema = z.object({
  name: z.string().min(1).max(200),
  producer: z.string().max(200).nullable(),
  vintage: z.number().int().min(1800).max(2100).nullable(),
  region: z.string().max(200).nullable(),
  country: z.string().max(120).nullable(),
  grape_variety: z.string().max(200).nullable(),
  wine_type: z
    .enum(['tinto', 'branco', 'rosado', 'espumante', 'fortificado', 'outro'])
    .nullable(),
  tasting_notes: z.string().max(1000).nullable(),
  pairing_notes: z.string().max(1000).nullable(),
  alcohol_pct: z.number().min(0).max(30).nullable(),
  serving_temp_c: z.number().min(0).max(30).nullable(),
  report: wineReportSchema,
});

export const dailyTipBodySchema = z.object({
  latitude: z.number().min(-90).max(90).optional(),
  longitude: z.number().min(-180).max(180).optional(),
  cellarId: z.string().uuid().optional(),
});

export const dailyTipAiSchema = z.object({
  title: z.string().min(1).max(120),
  editorial: z.string().min(1).max(2000),
  wineName: z.string().min(1).max(200),
  pairingRationale: z.string().min(1).max(1000),
});

export type WineAi = z.infer<typeof wineAiSchema>;
export type WineReport = z.infer<typeof wineReportSchema>;

export function sanitizeWineReport(report: WineReport): WineReport {
  return {
    producer_story: sanitizeText(report.producer_story, 1500),
    terroir: sanitizeText(report.terroir, 1500),
    vintage_story: sanitizeText(report.vintage_story, 1500),
    label_story: sanitizeText(report.label_story, 1500),
    technical_sheet: sanitizeText(report.technical_sheet, 1500),
    sensory_analysis: sanitizeText(report.sensory_analysis, 1500),
    oak_influence: sanitizeText(report.oak_influence, 800),
    tannin_level: sanitizeText(report.tannin_level, 200),
    aging_potential: sanitizeText(report.aging_potential, 800),
    drinking_window: sanitizeText(report.drinking_window, 800),
    pairings: report.pairings.map((p) => sanitizeText(p, 300)) as [
      string,
      string,
      string,
    ],
    buying_rationale: sanitizeText(report.buying_rationale, 1500),
  };
}
