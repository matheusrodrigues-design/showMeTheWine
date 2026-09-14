import { z } from 'zod';
import { apiRequest } from '@/data/datasources/apiClient';
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

    const data = await apiRequest<unknown>('/report-errors', {
      body: {
        wineName: parsed.wineName,
        wineCacheId: parsed.wineCacheId ?? null,
        grapeVariety: parsed.grapeVariety ?? null,
        message: parsed.message,
      },
    });
    return reportErrorSchema.parse(data);
  },

  async list(): Promise<ReportError[]> {
    const data = await apiRequest<unknown[]>('/report-errors');
    return z.array(reportErrorSchema).parse(data ?? []);
  },

  async markReviewed(id: string): Promise<void> {
    const safeId = z.string().uuid().parse(id);
    await apiRequest(`/report-errors/${safeId}`, { method: 'PATCH', body: {} });
  },
};
