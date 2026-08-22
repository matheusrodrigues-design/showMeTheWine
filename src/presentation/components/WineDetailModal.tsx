import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { colors } from '@/core/theme/colors';
import type { CellarWine, WineReport } from '@/domain/entities/Cellar';
import { WineReportView } from '@/presentation/components/WineReportView';
import { useWineSearch } from '@/presentation/hooks/useSommelier';
import { ErrorBanner } from '@/presentation/components/ErrorBanner';
import { ApiError } from '@/data/datasources/edgeFunctionClient';
import type { WineReport as ApiWineReport } from '@/data/schemas/wine';

interface Props {
  visible: boolean;
  item: CellarWine | null;
  onClose: () => void;
  onReportUpdated: () => void;
}

function mapApiReport(next: ApiWineReport): WineReport {
  return {
    producerStory: next.producer_story,
    terroir: next.terroir,
    vintageStory: next.vintage_story,
    labelStory: next.label_story,
    technicalSheet: next.technical_sheet,
    sensoryAnalysis: next.sensory_analysis,
    visualAnalysis: next.visual_analysis,
    olfactoryAnalysis: next.olfactory_analysis,
    palateAnalysis: next.palate_analysis,
    oakInfluence: next.oak_influence,
    tanninLevel: next.tannin_level,
    agingPotential: next.aging_potential,
    drinkingWindow: next.drinking_window,
    pairings: next.pairings,
    buyingRationale: next.buying_rationale,
  };
}

export function WineDetailModal({
  visible,
  item,
  onClose,
  onReportUpdated,
}: Props) {
  const search = useWineSearch();
  const [error, setError] = useState<string | null>(null);
  const [refreshedReport, setRefreshedReport] = useState<WineReport | undefined>();

  const wine = item?.wine;
  const displayReport = refreshedReport ?? wine?.report;
  const busy = search.isPending;
  const hasFallback = Boolean(wine?.tastingNotes || wine?.pairingNotes);
  const hasAnyContent = Boolean(displayReport || hasFallback);
  // Fichas sem as três análises (visual/olfativa/paladar) precisam ser regeradas.
  const needsRefresh = !displayReport?.visualAnalysis?.trim();

  useEffect(() => {
    if (!visible) {
      setError(null);
      setRefreshedReport(undefined);
    }
  }, [visible, item?.id]);

  async function onRefreshReport() {
    if (!wine?.name) return;
    setError(null);
    try {
      const data = await search.mutateAsync(wine.name);
      if (data.wine.metadata?.report) {
        setRefreshedReport(mapApiReport(data.wine.metadata.report));
      }
      onReportUpdated();
    } catch (e) {
      setError(
        e instanceof ApiError
          ? e.message
          : 'Não foi possível atualizar a ficha.',
      );
    }
  }

  function handleClose() {
    if (busy) return;
    onClose();
  }

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent
      onRequestClose={handleClose}
    >
      <View style={styles.backdrop}>
        <View style={styles.sheet}>
          <ScrollView
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.scrollContent}
          >
            <Text style={styles.title}>{wine?.name ?? 'Vinho'}</Text>
            <Text style={styles.meta}>
              {[
                wine?.vintage ? `Safra ${wine.vintage}` : null,
                wine?.producer,
              ]
                .filter(Boolean)
                .join(' · ')}
            </Text>
            <Text style={styles.region}>
              {[wine?.region, wine?.country].filter(Boolean).join(', ') || '—'}
            </Text>

            {item ? (
              <Text style={styles.qty}>
                {item.quantity === 1
                  ? '1 garrafa na adega'
                  : `${item.quantity} garrafas na adega`}
              </Text>
            ) : null}

            {item?.notes ? (
              <>
                <Text style={styles.section}>Suas notas</Text>
                <Text style={styles.body}>{item.notes}</Text>
              </>
            ) : null}

            {error ? <ErrorBanner message={error} /> : null}

            {hasAnyContent ? (
              <WineReportView
                report={displayReport}
                tastingNotes={wine?.tastingNotes}
                pairingNotes={wine?.pairingNotes}
              />
            ) : (
              <View style={styles.missing}>
                <Text style={styles.missingTitle}>Ficha incompleta</Text>
                <Text style={styles.missingBody}>
                  Este vinho foi cadastrado antes do relatório comercial. Atualize
                  para gerar a ficha completa.
                </Text>
              </View>
            )}

            {needsRefresh ? (
              <Pressable
                style={[
                  hasAnyContent ? styles.refreshBtnSecondary : styles.refreshBtn,
                  busy && styles.disabled,
                ]}
                onPress={() => void onRefreshReport()}
                disabled={busy}
              >
                {busy ? (
                  <ActivityIndicator
                    color={hasAnyContent ? colors.bordoux : colors.cream}
                  />
                ) : (
                  <Text
                    style={
                      hasAnyContent
                        ? styles.refreshBtnSecondaryText
                        : styles.refreshBtnText
                    }
                  >
                    {hasAnyContent
                      ? 'Atualizar ficha completa'
                      : 'Atualizar ficha'}
                  </Text>
                )}
              </Pressable>
            ) : null}

            <Pressable
              style={styles.closeBtn}
              onPress={handleClose}
              disabled={busy}
            >
              <Text style={styles.closeText}>Fechar</Text>
            </Pressable>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(42,18,22,0.45)',
    justifyContent: 'flex-end',
  },
  sheet: {
    maxHeight: '92%',
    backgroundColor: colors.paper,
    paddingHorizontal: 24,
    paddingTop: 28,
    paddingBottom: 36,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: '#D9CBC2',
  },
  scrollContent: {
    paddingBottom: 12,
  },
  title: {
    fontFamily: 'CormorantGaramond_600SemiBold',
    fontSize: 32,
    color: colors.ink,
  },
  meta: {
    marginTop: 8,
    fontFamily: 'DMSans_400Regular',
    fontSize: 14,
    color: colors.bordoux,
  },
  region: {
    marginTop: 4,
    fontFamily: 'DMSans_400Regular',
    fontSize: 13,
    color: colors.muted,
  },
  qty: {
    marginTop: 16,
    fontFamily: 'DMSans_500Medium',
    fontSize: 12,
    letterSpacing: 1.2,
    textTransform: 'uppercase',
    color: colors.ink,
  },
  section: {
    marginTop: 24,
    fontFamily: 'DMSans_500Medium',
    fontSize: 11,
    letterSpacing: 1.6,
    textTransform: 'uppercase',
    color: colors.muted,
  },
  body: {
    marginTop: 8,
    fontFamily: 'DMSans_400Regular',
    fontSize: 15,
    lineHeight: 24,
    color: colors.ink,
  },
  missing: {
    marginTop: 28,
    padding: 16,
    backgroundColor: 'rgba(255,255,255,0.55)',
  },
  missingTitle: {
    fontFamily: 'CormorantGaramond_600SemiBold',
    fontSize: 22,
    color: colors.ink,
  },
  missingBody: {
    marginTop: 8,
    fontFamily: 'DMSans_400Regular',
    fontSize: 14,
    lineHeight: 22,
    color: colors.muted,
  },
  refreshBtn: {
    marginTop: 18,
    backgroundColor: colors.bordoux,
    paddingVertical: 14,
    alignItems: 'center',
  },
  refreshBtnText: {
    color: colors.cream,
    fontFamily: 'DMSans_500Medium',
    fontSize: 12,
    letterSpacing: 1.4,
    textTransform: 'uppercase',
  },
  refreshBtnSecondary: {
    marginTop: 24,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.bordoux,
    paddingVertical: 14,
    alignItems: 'center',
  },
  refreshBtnSecondaryText: {
    color: colors.bordoux,
    fontFamily: 'DMSans_500Medium',
    fontSize: 12,
    letterSpacing: 1.4,
    textTransform: 'uppercase',
  },
  closeBtn: {
    marginTop: 20,
    paddingVertical: 14,
    alignItems: 'center',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: '#C9B8AE',
  },
  closeText: {
    color: colors.muted,
    fontFamily: 'DMSans_500Medium',
    fontSize: 12,
    letterSpacing: 1.4,
    textTransform: 'uppercase',
  },
  disabled: { opacity: 0.6 },
});
