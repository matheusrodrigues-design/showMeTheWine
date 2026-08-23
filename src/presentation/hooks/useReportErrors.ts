import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { reportErrorRepository } from '@/data/repositories/ReportErrorRepository';
import type { CreateReportErrorInput } from '@/data/schemas/wine';

export const reportErrorKeys = {
  all: ['report-errors'] as const,
};

export function useReportWineError() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateReportErrorInput) =>
      reportErrorRepository.create(input),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: reportErrorKeys.all });
    },
  });
}

export function useReportErrors(enabled: boolean) {
  return useQuery({
    queryKey: reportErrorKeys.all,
    queryFn: () => reportErrorRepository.list(),
    enabled,
    staleTime: 15_000,
  });
}

export function useMarkReportReviewed() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => reportErrorRepository.markReviewed(id),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: reportErrorKeys.all });
    },
  });
}
