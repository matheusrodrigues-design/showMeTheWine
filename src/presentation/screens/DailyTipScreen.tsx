import { useEffect, useState } from 'react';
import {
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import * as Location from 'expo-location';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useDailyTip } from '@/presentation/hooks/useSommelier';
import { useCellars } from '@/presentation/hooks/useCellars';
import { Shimmer } from '@/presentation/components/Shimmer';
import { ErrorBanner } from '@/presentation/components/ErrorBanner';
import { BrandMark } from '@/presentation/components/BrandMark';
import { colors } from '@/core/theme/colors';
import { ApiError } from '@/data/datasources/edgeFunctionClient';

export function DailyTipScreen() {
  const insets = useSafeAreaInsets();
  const { data: cellars } = useCellars();
  const [coords, setCoords] = useState<{
    latitude?: number;
    longitude?: number;
  }>({});
  const [locationNote, setLocationNote] = useState('Obtendo localização…');

  useEffect(() => {
    let cancelled = false;

    async function resolveLocation() {
      try {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (cancelled) return;

        if (status !== 'granted') {
          setLocationNote('Localização negada — usando fallback seguro');
          setCoords({});
          return;
        }

        const position = await Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.Balanced,
        });
        if (cancelled) return;

        setCoords({
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
        });
        setLocationNote('Clima personalizado pela sua localização');
      } catch {
        if (!cancelled) {
          setLocationNote('Localização indisponível — fallback ativo');
          setCoords({});
        }
      }
    }

    void resolveLocation();
    return () => {
      cancelled = true;
    };
  }, []);

  const tipQuery = useDailyTip({
    latitude: coords.latitude,
    longitude: coords.longitude,
    cellarId: cellars?.[0]?.id,
    enabled: true,
  });

  const tip = tipQuery.data;
  const errorMessage =
    tipQuery.error instanceof ApiError
      ? tipQuery.error.message
      : tipQuery.isError
        ? 'Não foi possível carregar a Dica do Dia.'
        : null;

  return (
    <LinearGradient
      colors={[colors.paper, '#F4EBE6', colors.paperWarm]}
      locations={[0, 0.5, 1]}
      style={styles.root}
    >
      <ScrollView
        contentContainerStyle={{
          paddingTop: insets.top + 24,
          paddingBottom: insets.bottom + 120,
          paddingHorizontal: 24,
        }}
        refreshControl={
          <RefreshControl
            refreshing={tipQuery.isRefetching}
            onRefresh={() => void tipQuery.refetch()}
            tintColor={colors.bordoux}
          />
        }
      >
        <BrandMark variant="bottle" style={styles.logoMark} />
        <Text style={styles.kicker}>Editorial</Text>
        <Text style={styles.brand}>Dica do Dia</Text>
        <Text style={styles.locationNote}>{locationNote}</Text>

        {tipQuery.isLoading ? (
          <View style={styles.skeleton}>
            <Shimmer height={36} width="70%" />
            <Shimmer height={14} width="40%" style={{ marginTop: 16 }} />
            <Shimmer height={120} width="100%" style={{ marginTop: 28 }} />
            <Shimmer height={80} width="100%" style={{ marginTop: 20 }} />
          </View>
        ) : null}

        {errorMessage ? (
          <ErrorBanner
            message={errorMessage}
            onRetry={() => void tipQuery.refetch()}
          />
        ) : null}

        {tip ? (
          <Animated.View entering={FadeInDown.duration(550)}>
            <View style={styles.rule} />
            <Text style={styles.weather}>
              {tip.locationLabel} · {Math.round(tip.temperatureC)}°C ·{' '}
              {tip.weatherSummary}
            </Text>

            <Text style={styles.title}>{tip.title}</Text>

            <Text style={styles.editorial}>{tip.editorial}</Text>

            <View style={styles.wineBlock}>
              <Text style={styles.wineLabel}>Seleção</Text>
              <Text style={styles.wineName}>{tip.wineName}</Text>
            </View>

            <Text style={styles.rationaleTitle}>Racional Clima × Vinho</Text>
            <Text style={styles.rationale}>{tip.pairingRationale}</Text>
          </Animated.View>
        ) : null}
      </ScrollView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  logoMark: { marginBottom: 12 },
  kicker: {
    fontFamily: 'DMSans_500Medium',
    fontSize: 11,
    letterSpacing: 2.4,
    textTransform: 'uppercase',
    color: colors.bordoux,
  },
  brand: {
    marginTop: 10,
    fontFamily: 'CormorantGaramond_600SemiBold',
    fontSize: 48,
    color: colors.bordoux,
  },
  locationNote: {
    marginTop: 8,
    fontFamily: 'DMSans_400Regular',
    fontSize: 13,
    color: colors.muted,
  },
  skeleton: { marginTop: 36 },
  rule: {
    marginTop: 36,
    height: StyleSheet.hairlineWidth,
    backgroundColor: colors.bordoux,
    width: 48,
    marginBottom: 18,
  },
  weather: {
    fontFamily: 'DMSans_400Regular',
    fontSize: 13,
    color: colors.bordoux,
    letterSpacing: 0.3,
  },
  title: {
    marginTop: 18,
    fontFamily: 'CormorantGaramond_600SemiBold',
    fontSize: 34,
    lineHeight: 40,
    color: colors.ink,
  },
  editorial: {
    marginTop: 22,
    fontFamily: 'CormorantGaramond_500Medium_Italic',
    fontSize: 22,
    lineHeight: 34,
    color: '#4A3A36',
  },
  wineBlock: {
    marginTop: 36,
    paddingTop: 22,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: '#C9B8AE',
  },
  wineLabel: {
    fontFamily: 'DMSans_500Medium',
    fontSize: 11,
    letterSpacing: 1.8,
    textTransform: 'uppercase',
    color: colors.muted,
  },
  wineName: {
    marginTop: 8,
    fontFamily: 'CormorantGaramond_600SemiBold',
    fontSize: 30,
    color: colors.bordoux,
  },
  rationaleTitle: {
    marginTop: 28,
    fontFamily: 'DMSans_500Medium',
    fontSize: 12,
    letterSpacing: 1.4,
    textTransform: 'uppercase',
    color: colors.muted,
  },
  rationale: {
    marginTop: 10,
    fontFamily: 'DMSans_400Regular',
    fontSize: 15,
    lineHeight: 24,
    color: colors.ink,
  },
});
