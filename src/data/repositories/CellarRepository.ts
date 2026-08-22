import { z } from 'zod';
import { getSupabase } from '@/data/datasources/supabaseClient';
import {
  addWineToCellarSchema,
  cellarSchema,
  cellarTypeSchema,
  cellarWineSchema,
  createCellarInputSchema,
  type WineReport as WineReportDto,
} from '@/data/schemas/wine';
import type {
  Cellar,
  CellarType,
  CellarWine,
  Wine,
  WineReport,
} from '@/domain/entities/Cellar';
import type {
  AddWineToCellarInput,
  CreateCellarInput,
  ICellarRepository,
} from '@/domain/repositories/ICellarRepository';
import { sanitizeUserText } from '@/core/security/sanitize';

function mapReport(dto?: WineReportDto | null): WineReport | undefined {
  if (!dto) return undefined;
  return {
    producerStory: dto.producer_story,
    terroir: dto.terroir,
    vintageStory: dto.vintage_story,
    labelStory: dto.label_story,
    technicalSheet: dto.technical_sheet,
    agingPotential: dto.aging_potential,
    drinkingWindow: dto.drinking_window,
    pairings: dto.pairings,
    buyingRationale: dto.buying_rationale,
  };
}

function mapWine(row: z.infer<typeof cellarWineSchema>['wines_cache']): Wine | undefined {
  if (!row) return undefined;
  return {
    id: row.id,
    name: row.name,
    normalizedName: row.normalized_name,
    producer: row.producer,
    vintage: row.vintage,
    region: row.region,
    country: row.country,
    grapeVariety: row.grape_variety,
    wineType: row.wine_type,
    tastingNotes: row.tasting_notes,
    pairingNotes: row.pairing_notes,
    alcoholPct: row.alcohol_pct,
    servingTempC: row.serving_temp_c,
    report: mapReport(row.metadata?.report),
  };
}

function mapCellar(row: z.infer<typeof cellarSchema>): Cellar {
  return {
    id: row.id,
    userId: row.user_id,
    name: row.name,
    type: row.type,
    capacity: row.capacity,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export class CellarRepository implements ICellarRepository {
  async listCellars(): Promise<Cellar[]> {
    const supabase = getSupabase();
    const { data, error } = await supabase
      .from('cellars')
      .select('*')
      .order('created_at', { ascending: true });

    if (error) throw new Error(error.message);

    return z.array(cellarSchema).parse(data ?? []).map(mapCellar);
  }

  async createCellar(input: CreateCellarInput): Promise<Cellar> {
    const parsed = createCellarInputSchema.parse({
      ...input,
      name: sanitizeUserText(input.name, 80),
    });

    const supabase = getSupabase();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      throw new Error('Sessão expirada. Faça login novamente.');
    }

    const { data, error } = await supabase
      .from('cellars')
      .insert({
        user_id: user.id,
        name: parsed.name,
        type: parsed.type,
        capacity: parsed.capacity,
      })
      .select('*')
      .single();

    if (error) throw new Error(error.message);
    return mapCellar(cellarSchema.parse(data));
  }

  async updateCellarType(cellarId: string, type: CellarType): Promise<Cellar> {
    const safeId = z.string().uuid().parse(cellarId);
    const safeType = cellarTypeSchema.parse(type);

    const supabase = getSupabase();
    const { data, error } = await supabase
      .from('cellars')
      .update({ type: safeType })
      .eq('id', safeId)
      .select('*')
      .single();

    if (error) throw new Error(error.message);
    return mapCellar(cellarSchema.parse(data));
  }

  async listCellarWines(cellarId: string): Promise<CellarWine[]> {
    const safeId = z.string().uuid().parse(cellarId);
    const supabase = getSupabase();

    const { data, error } = await supabase
      .from('cellar_wines')
      .select('*, wines_cache(*)')
      .eq('cellar_id', safeId)
      .order('created_at', { ascending: false });

    if (error) throw new Error(error.message);

    return z.array(cellarWineSchema).parse(data ?? []).map(mapCellarWine);
  }

  async addWineToCellar(input: AddWineToCellarInput): Promise<CellarWine> {
    const parsed = addWineToCellarSchema.parse({
      ...input,
      notes: input.notes
        ? sanitizeUserText(input.notes, 500)
        : null,
    });

    const supabase = getSupabase();

    const { data: existing, error: existingError } = await supabase
      .from('cellar_wines')
      .select('id, quantity')
      .eq('cellar_id', parsed.cellarId)
      .eq('wine_cache_id', parsed.wineCacheId)
      .maybeSingle();

    if (existingError) throw new Error(existingError.message);

    if (existing) {
      const nextQty = Math.min(existing.quantity + parsed.quantity, 10000);
      const { data, error } = await supabase
        .from('cellar_wines')
        .update({
          quantity: nextQty,
          notes: parsed.notes,
        })
        .eq('id', existing.id)
        .select('*, wines_cache(*)')
        .single();

      if (error) throw new Error(error.message);
      return mapCellarWine(cellarWineSchema.parse(data));
    }

    const { data, error } = await supabase
      .from('cellar_wines')
      .insert({
        cellar_id: parsed.cellarId,
        wine_cache_id: parsed.wineCacheId,
        quantity: parsed.quantity,
        notes: parsed.notes,
      })
      .select('*, wines_cache(*)')
      .single();

    if (error) throw new Error(error.message);
    return mapCellarWine(cellarWineSchema.parse(data));
  }
}

function mapCellarWine(
  row: z.infer<typeof cellarWineSchema>,
): CellarWine {
  return {
    id: row.id,
    cellarId: row.cellar_id,
    wineCacheId: row.wine_cache_id,
    quantity: row.quantity,
    notes: row.notes,
    wine: mapWine(row.wines_cache),
  };
}

export const cellarRepository = new CellarRepository();
