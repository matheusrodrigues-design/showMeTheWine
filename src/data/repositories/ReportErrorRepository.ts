import { z } from 'zod';
import { getSupabase } from '@/data/datasources/supabaseClient';
import { sanitizeUserText } from '@/core/security/sanitize';
import {
  createReportErrorSchema,
  reportErrorSchema,
  type CreateReportErrorInput,
  type ReportError,
} from '@/data/schemas/wine';

export const reportErrorRepository = {
  async create(input: CreateReportErrorInput): Promise<ReportError> {
    const parsed = createReportErrorSchema.parse({
      ...input,
      wineName: sanitizeUserText(input.wineName, 200),
      grapeVariety: input.grapeVariety
        ? sanitizeUserText(input.grapeVariety, 200)
        : null,
      message: sanitizeUserText(input.message, 2000),
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
      .from('report_errors')
      .insert({
        user_id: user.id,
        wine_cache_id: parsed.wineCacheId ?? null,
        wine_name: parsed.wineName,
        grape_variety: parsed.grapeVariety ?? null,
        message: parsed.message,
      })
      .select('*')
      .single();

    if (error) throw new Error(error.message);
    return reportErrorSchema.parse(data);
  },

  async list(): Promise<ReportError[]> {
    const supabase = getSupabase();
    const { data, error } = await supabase
      .from('report_errors')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(100);

    if (error) throw new Error(error.message);
    return z.array(reportErrorSchema).parse(data ?? []);
  },

  async markReviewed(id: string): Promise<void> {
    const safeId = z.string().uuid().parse(id);
    const supabase = getSupabase();
    const { error } = await supabase
      .from('report_errors')
      .update({ status: 'reviewed' })
      .eq('id', safeId);

    if (error) throw new Error(error.message);
  },
};
