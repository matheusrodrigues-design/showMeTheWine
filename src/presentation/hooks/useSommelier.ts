import { useMutation, useQuery } from '@tanstack/react-query';
import { sommelierRepository } from '@/data/repositories/SommelierRepository';

export function useWineSearch() {
  return useMutation({
    mutationFn: (query: string) => sommelierRepository.searchWine(query),
  });
}

export function useLabelOcr() {
  return useMutation({
    mutationFn: (imageBase64: string) =>
      sommelierRepository.searchWineByLabel(imageBase64),
  });
}

export function useDailyTip(params: {
  latitude?: number;
  longitude?: number;
  cellarId?: string;
  enabled?: boolean;
}) {
  return useQuery({
    queryKey: [
      'daily-tip',
      params.latitude ?? null,
      params.longitude ?? null,
      params.cellarId ?? null,
    ],
    queryFn: () =>
      sommelierRepository.getDailyTip({
        latitude: params.latitude,
        longitude: params.longitude,
        cellarId: params.cellarId,
      }),
    enabled: params.enabled !== false,
    staleTime: 15 * 60_000,
    retry: 1,
  });
}
