import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  useMarkReportReviewed,
  useReportErrors,
} from '@/presentation/hooks/useReportErrors';
import { ErrorBanner } from '@/presentation/components/ErrorBanner';
import { BrandMark } from '@/presentation/components/BrandMark';
import { colors } from '@/core/theme/colors';

function formatWhen(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return iso;
  return date.toLocaleString('pt-BR', {
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function AdminReportsScreen() {
  const insets = useSafeAreaInsets();
  const list = useReportErrors(true);
  const mark = useMarkReportReviewed();

  const openCount = list.data?.filter((r) => r.status === 'open').length ?? 0;

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
      >
        <BrandMark variant="bottle" style={styles.logo} />
        <Text style={styles.title}>Erros reportados</Text>
        <Text style={styles.subtitle}>
          {openCount === 0
            ? 'Nenhum relato em aberto.'
            : openCount === 1
              ? '1 relato aguardando revisão.'
              : `${openCount} relatos aguardando revisão.`}
        </Text>

        {list.isError ? (
          <ErrorBanner
            message={
              list.error instanceof Error
                ? list.error.message
                : 'Não foi possível carregar os relatos.'
            }
          />
        ) : null}

        {list.isLoading ? (
          <ActivityIndicator color={colors.bordoux} style={{ marginTop: 28 }} />
        ) : null}

        {list.data?.map((item) => (
          <View key={item.id} style={styles.card}>
            <Text style={styles.status}>
              {item.status === 'open' ? 'Aberto' : 'Revisado'} · {formatWhen(item.created_at)}
            </Text>
            <Text style={styles.wine}>{item.wine_name}</Text>
            {item.grape_variety ? (
              <Text style={styles.meta}>Casta na ficha: {item.grape_variety}</Text>
            ) : null}
            <Text style={styles.message}>{item.message}</Text>
            {item.status === 'open' ? (
              <Pressable
                style={[styles.reviewBtn, mark.isPending && styles.disabled]}
                onPress={() => void mark.mutateAsync(item.id)}
                disabled={mark.isPending}
              >
                <Text style={styles.reviewText}>Marcar como revisado</Text>
              </Pressable>
            ) : null}
          </View>
        ))}
      </ScrollView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  logo: { alignSelf: 'flex-start', marginBottom: 8 },
  title: {
    fontFamily: 'CormorantGaramond_600SemiBold',
    fontSize: 32,
    color: colors.ink,
  },
  subtitle: {
    marginTop: 8,
    marginBottom: 12,
    fontFamily: 'DMSans_400Regular',
    fontSize: 14,
    color: colors.muted,
  },
  card: {
    marginTop: 16,
    padding: 16,
    backgroundColor: 'rgba(255,255,255,0.55)',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: '#D9CBC2',
  },
  status: {
    fontFamily: 'DMSans_500Medium',
    fontSize: 11,
    letterSpacing: 1.2,
    textTransform: 'uppercase',
    color: colors.bordoux,
  },
  wine: {
    marginTop: 8,
    fontFamily: 'CormorantGaramond_600SemiBold',
    fontSize: 22,
    color: colors.ink,
  },
  meta: {
    marginTop: 4,
    fontFamily: 'DMSans_400Regular',
    fontSize: 13,
    color: colors.muted,
  },
  message: {
    marginTop: 10,
    fontFamily: 'DMSans_400Regular',
    fontSize: 15,
    lineHeight: 22,
    color: colors.ink,
  },
  reviewBtn: {
    marginTop: 14,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.bordoux,
    paddingVertical: 10,
    alignItems: 'center',
  },
  reviewText: {
    color: colors.bordoux,
    fontFamily: 'DMSans_500Medium',
    fontSize: 11,
    letterSpacing: 1.2,
    textTransform: 'uppercase',
  },
  disabled: { opacity: 0.6 },
});
