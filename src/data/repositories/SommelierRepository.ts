import { invokeEdgeFunction } from '@/data/datasources/edgeFunctionClient';
import {
  dailyTipRequestSchema,
  dailyTipResponseSchema,
  wineSearchRequestSchema,
  wineSearchResponseSchema,
  type DailyTipResponse,
  type WineSearchResponse,
} from '@/data/schemas/wine';
import { normalizeWineQuery } from '@/core/security/sanitize';

export class SommelierRepository {
  async searchWine(
    query: string,
    options?: { forceRefresh?: boolean; wineCacheId?: string },
  ): Promise<WineSearchResponse> {
    const sanitized = normalizeWineQuery(query);
    const body = wineSearchRequestSchema.parse({
      query: sanitized,
      forceRefresh: options?.forceRefresh,
      wineCacheId: options?.wineCacheId,
    });
    const raw = await invokeEdgeFunction<unknown>('wine-search', body);
    return wineSearchResponseSchema.parse(raw);
  }

  async searchWineByLabel(imageBase64: string): Promise<WineSearchResponse> {
    if (!imageBase64 || imageBase64.length > 1_500_000) {
      throw new Error('Imagem inválida ou excessivamente grande');
    }
    // Remove prefixo data-url se presente; só base64 puro
    const pure = imageBase64.replace(/^data:image\/\w+;base64,/, '');
    if (!/^[A-Za-z0-9+/=\s]+$/.test(pure.slice(0, 200))) {
      throw new Error('Payload de imagem inválido');
    }

    const raw = await invokeEdgeFunction<unknown>('wine-search', {
      imageBase64: pure,
      mode: 'ocr',
    });
    return wineSearchResponseSchema.parse(raw);
  }

  async getDailyTip(input: {
    latitude?: number;
    longitude?: number;
    cellarId?: string;
  }): Promise<DailyTipResponse> {
    const body = dailyTipRequestSchema.parse(input);
    const raw = await invokeEdgeFunction<unknown>('daily-tip', body);
    return dailyTipResponseSchema.parse(raw);
  }
}

export const sommelierRepository = new SommelierRepository();
