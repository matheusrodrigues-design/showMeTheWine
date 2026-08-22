import { ExpoConfig, ConfigContext } from 'expo/config';

/**
 * Apenas EXPO_PUBLIC_* chega ao client bundle.
 * OpenAI / Weather / service_role NUNCA entram aqui.
 */
export default ({ config }: ConfigContext): ExpoConfig => ({
  ...config,
  name: 'Show Me The Wine',
  slug: 'show-me-the-wine',
  version: '1.0.0',
  orientation: 'portrait',
  icon: './assets/icon.png',
  userInterfaceStyle: 'dark',
  scheme: 'showmethewine',
  ios: {
    supportsTablet: true,
    bundleIdentifier: 'com.showmethewine.app',
    infoPlist: {
      NSLocationWhenInUseUsageDescription:
        'Usamos sua localização apenas para sugerir vinhos alinhados ao clima local.',
      NSCameraUsageDescription:
        'A câmera é usada para ler o rótulo do vinho com OCR.',
      NSPhotoLibraryUsageDescription:
        'Acesse fotos de rótulos para identificar vinhos.',
    },
  },
  android: {
    adaptiveIcon: {
      backgroundColor: '#FFFFFF',
      foregroundImage: './assets/android-icon-foreground.png',
      backgroundImage: './assets/android-icon-background.png',
      monochromeImage: './assets/android-icon-monochrome.png',
    },
    package: 'com.showmethewine.app',
    permissions: [
      'ACCESS_COARSE_LOCATION',
      'ACCESS_FINE_LOCATION',
      'CAMERA',
      'READ_MEDIA_IMAGES',
    ],
  },
  web: {
    favicon: './assets/favicon.png',
  },
  plugins: [
    'expo-secure-store',
    'expo-font',
    [
      'expo-splash-screen',
      {
        image: './assets/splash-icon.png',
        imageWidth: 200,
        resizeMode: 'contain',
        backgroundColor: '#FFFFFF',
      },
    ],
    [
      'expo-location',
      {
        locationWhenInUsePermission:
          'Permitir localização para a Dica do Dia contextualizada pelo clima.',
      },
    ],
    [
      'expo-image-picker',
      {
        cameraPermission: 'Permitir câmera para OCR de rótulos.',
        photosPermission: 'Permitir galeria para OCR de rótulos.',
      },
    ],
  ],
  extra: {
    supabaseUrl: process.env.EXPO_PUBLIC_SUPABASE_URL ?? '',
    supabaseAnonKey: process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ?? '',
    eas: {
      projectId: process.env.EAS_PROJECT_ID,
    },
  },
});
