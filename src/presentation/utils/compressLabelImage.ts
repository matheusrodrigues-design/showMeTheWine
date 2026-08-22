import * as ImageManipulator from 'expo-image-manipulator';

const MAX_EDGE = 800;
const COMPRESS_QUALITY = 0.72;

/**
 * Comprime a foto do rótulo no device antes do upload (máx 800px).
 * Reduz latência móvel e custo de tokens vision.
 */
export async function compressLabelImage(uri: string): Promise<string> {
  const result = await ImageManipulator.manipulateAsync(
    uri,
    [{ resize: { width: MAX_EDGE } }],
    {
      compress: COMPRESS_QUALITY,
      format: ImageManipulator.SaveFormat.JPEG,
      base64: true,
    },
  );

  if (!result.base64) {
    throw new Error('Falha ao comprimir a imagem');
  }

  // Limite defensivo (~1.2MB base64)
  if (result.base64.length > 1_200_000) {
    const tighter = await ImageManipulator.manipulateAsync(
      uri,
      [{ resize: { width: 640 } }],
      {
        compress: 0.55,
        format: ImageManipulator.SaveFormat.JPEG,
        base64: true,
      },
    );
    if (!tighter.base64 || tighter.base64.length > 1_200_000) {
      throw new Error('Imagem ainda grande demais após compressão');
    }
    return tighter.base64;
  }

  return result.base64;
}
