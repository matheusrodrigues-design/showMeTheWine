import { useCallback, useState } from 'react';
import { Platform } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { useLabelOcr } from '@/presentation/hooks/useSommelier';
import { compressLabelImage } from '@/presentation/utils/compressLabelImage';
import { ApiError } from '@/data/datasources/edgeFunctionClient';
import type { WineSearchResponse } from '@/data/schemas/wine';

/** Falha com mensagem já pronta para exibição ao usuário. */
export class LabelScanError extends Error {}

export function labelScanErrorMessage(e: unknown): string {
  if (e instanceof LabelScanError || e instanceof ApiError) return e.message;
  return 'Não foi possível ler o rótulo. Tente novamente.';
}

const PICKER_OPTIONS = {
  quality: 0.8,
  allowsEditing: true,
  aspect: [3, 4] as [number, number],
};

/**
 * Leitura de rótulo por OCR. No navegador não há câmera nativa confiável,
 * então usamos upload da galeria; no device abrimos a câmera.
 */
export function useLabelScan() {
  const ocr = useLabelOcr();
  const [preparing, setPreparing] = useState(false);

  const scan = useCallback(async (): Promise<WineSearchResponse | null> => {
    setPreparing(true);
    try {
      const isWeb = Platform.OS === 'web';

      const permission = isWeb
        ? await ImagePicker.requestMediaLibraryPermissionsAsync()
        : await ImagePicker.requestCameraPermissionsAsync();

      if (!permission.granted) {
        throw new LabelScanError(
          isWeb ? 'Permissão de fotos negada.' : 'Permissão de câmera negada.',
        );
      }

      const photo = isWeb
        ? await ImagePicker.launchImageLibraryAsync({
            ...PICKER_OPTIONS,
            base64: false,
          })
        : await ImagePicker.launchCameraAsync(PICKER_OPTIONS);

      if (photo.canceled || !photo.assets[0]?.uri) return null;

      const base64 = await compressLabelImage(photo.assets[0].uri);
      return await ocr.mutateAsync(base64);
    } finally {
      setPreparing(false);
    }
  }, [ocr]);

  return { scan, isPending: preparing || ocr.isPending };
}
