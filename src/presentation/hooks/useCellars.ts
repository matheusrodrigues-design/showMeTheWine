import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { cellarRepository } from '@/data/repositories/CellarRepository';
import type { CellarType } from '@/domain/entities/Cellar';
import type {
  AddWineToCellarInput,
  CreateCellarInput,
} from '@/domain/repositories/ICellarRepository';

export const cellarKeys = {
  all: ['cellars'] as const,
  wines: (cellarId: string) => ['cellar-wines', cellarId] as const,
};

export function useCellars() {
  return useQuery({
    queryKey: cellarKeys.all,
    queryFn: () => cellarRepository.listCellars(),
    staleTime: 60_000,
  });
}

export function useCellarWines(cellarId: string | undefined) {
  return useQuery({
    queryKey: cellarKeys.wines(cellarId ?? 'none'),
    queryFn: () => cellarRepository.listCellarWines(cellarId!),
    enabled: Boolean(cellarId),
    staleTime: 30_000,
  });
}

export function useCreateCellar() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateCellarInput) =>
      cellarRepository.createCellar(input),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: cellarKeys.all });
    },
  });
}

export function useUpdateCellarType() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ cellarId, type }: { cellarId: string; type: CellarType }) =>
      cellarRepository.updateCellarType(cellarId, type),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: cellarKeys.all });
    },
  });
}

export function useAddWineToCellar() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: AddWineToCellarInput) =>
      cellarRepository.addWineToCellar(input),
    onSuccess: (_data, variables) => {
      void qc.invalidateQueries({
        queryKey: cellarKeys.wines(variables.cellarId),
      });
    },
  });
}
