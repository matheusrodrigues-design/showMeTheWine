import './global.css';
import { useCallback, type ReactNode } from 'react';
import { View, StyleSheet, Text } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { useFonts } from 'expo-font';
import {
  CormorantGaramond_500Medium_Italic,
  CormorantGaramond_600SemiBold,
} from '@expo-google-fonts/cormorant-garamond';
import {
  DMSans_400Regular,
  DMSans_500Medium,
} from '@expo-google-fonts/dm-sans';
import * as SplashScreen from 'expo-splash-screen';
import { AppProviders } from '@/presentation/providers/AppProviders';
import { AuthProvider } from '@/presentation/providers/AuthProvider';
import { RootNavigator } from '@/presentation/navigation/RootNavigator';
import { colors } from '@/core/theme/colors';

void SplashScreen.preventAutoHideAsync().catch(() => undefined);

function ConfigError({ message }: { message: string }) {
  return (
    <View style={styles.config}>
      <Text style={styles.configTitle}>Configuração necessária</Text>
      <Text style={styles.configBody}>{message}</Text>
      <Text style={styles.configHint}>
        Copie `.env.example` para `.env` e defina EXPO_PUBLIC_SUPABASE_URL e
        EXPO_PUBLIC_SUPABASE_ANON_KEY.
      </Text>
    </View>
  );
}

export default function App() {
  const [fontsLoaded, fontError] = useFonts({
    CormorantGaramond_600SemiBold,
    CormorantGaramond_500Medium_Italic,
    DMSans_400Regular,
    DMSans_500Medium,
  });

  const onLayout = useCallback(() => {
    if (fontsLoaded || fontError) {
      void SplashScreen.hideAsync();
    }
  }, [fontsLoaded, fontError]);

  if (!fontsLoaded && !fontError) {
    return null;
  }

  return (
    <View style={styles.root} onLayout={onLayout}>
      <StatusBar style="dark" />
      <AppProviders>
        <SafeBoot>
          <AuthProvider>
            <RootNavigator />
          </AuthProvider>
        </SafeBoot>
      </AppProviders>
    </View>
  );
}

/**
 * Isola falha de env/secrets no boot sem derrubar a árvore React.
 */
function SafeBoot({ children }: { children: ReactNode }) {
  try {
    // Validação lazy: AuthProvider/getSupabase só falham ao usar.
    // Aqui apenas verificamos presença mínima sem importar secrets.
    const url = process.env.EXPO_PUBLIC_SUPABASE_URL;
    const key = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;
    if (!url || !key) {
      return (
        <ConfigError message="Variáveis públicas do Supabase ausentes." />
      );
    }
    if (key.includes('service_role')) {
      return (
        <ConfigError message="SERVICE_ROLE detectada no client — remova imediatamente." />
      );
    }
    return <>{children}</>;
  } catch (e) {
    return (
      <ConfigError
        message={e instanceof Error ? e.message : 'Erro de configuração'}
      />
    );
  }
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.paper },
  config: {
    flex: 1,
    backgroundColor: colors.paper,
    justifyContent: 'center',
    padding: 28,
  },
  configTitle: {
    fontFamily: 'CormorantGaramond_600SemiBold',
    fontSize: 32,
    color: colors.bordoux,
  },
  configBody: {
    marginTop: 12,
    fontFamily: 'DMSans_400Regular',
    fontSize: 15,
    color: colors.ink,
  },
  configHint: {
    marginTop: 16,
    fontFamily: 'DMSans_400Regular',
    fontSize: 13,
    lineHeight: 20,
    color: colors.muted,
  },
});
