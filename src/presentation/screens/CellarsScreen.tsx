import { useEffect, useMemo, useState } from 'react';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, {
  FadeIn,
  FadeOut,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  CELLAR_TYPES,
  CELLAR_TYPE_LABELS,
  type CellarType,
} from '@/domain/entities/Cellar';
import { CELLAR_ATMOSPHERES } from '@/core/theme/cellarAtmospheres';
import { colors } from '@/core/theme/colors';
import {
  useCellars,
  useCellarWines,
  useUpdateCellarType,
} from '@/presentation/hooks/useCellars';
import { CellarListSkeleton } from '@/presentation/components/Shimmer';
import { ErrorBanner } from '@/presentation/components/ErrorBanner';
import { WineRow } from '@/presentation/components/WineRow';
import { CreateCellarModal } from '@/presentation/components/CreateCellarModal';
import { AddWineModal } from '@/presentation/components/AddWineModal';
import { WineDetailModal } from '@/presentation/components/WineDetailModal';
import { BrandMark } from '@/presentation/components/BrandMark';
import type { CellarWine } from '@/domain/entities/Cellar';

export function CellarsScreen() {
  const insets = useSafeAreaInsets();
  const { data: cellars, isLoading, isError, refetch, isRefetching } =
    useCellars();
  const [activeCellarId, setActiveCellarId] = useState<string | undefined>();
  const [createOpen, setCreateOpen] = useState(false);
  const [addWineOpen, setAddWineOpen] = useState(false);
  const [selectedWine, setSelectedWine] = useState<CellarWine | null>(null);

  const activeCellar = useMemo(
    () => cellars?.find((c) => c.id === activeCellarId) ?? cellars?.[0],
    [cellars, activeCellarId],
  );

  useEffect(() => {
    if (!activeCellarId && cellars?.[0]?.id) {
      setActiveCellarId(cellars[0].id);
    }
  }, [cellars, activeCellarId]);

  const winesQuery = useCellarWines(activeCellar?.id);
  const updateType = useUpdateCellarType();
  const fade = useSharedValue(1);

  const atmosphere = CELLAR_ATMOSPHERES[activeCellar?.type ?? 'climatizada'];
  const hasCellars = (cellars?.length ?? 0) > 0;

  const overlayStyle = useAnimatedStyle(() => ({
    opacity: fade.value,
  }));

  function changeType(type: CellarType) {
    if (!activeCellar || activeCellar.type === type) return;
    fade.value = withTiming(0.35, { duration: 220 }, () => {
      fade.value = withTiming(1, { duration: 420 });
    });
    updateType.mutate({ cellarId: activeCellar.id, type });
  }

  const totalBottles =
    winesQuery.data?.reduce((acc, w) => acc + w.quantity, 0) ?? 0;

  return (
    <View style={styles.root}>
      <Animated.View style={[StyleSheet.absoluteFill, overlayStyle]}>
        <LinearGradient
          colors={[...atmosphere.gradient]}
          start={{ x: 0.1, y: 0 }}
          end={{ x: 0.9, y: 1 }}
          style={StyleSheet.absoluteFill}
        />
        <View
          style={[StyleSheet.absoluteFill, { backgroundColor: atmosphere.overlay }]}
        />
      </Animated.View>

      <ScrollView
        contentContainerStyle={{
          paddingTop: insets.top + 20,
          paddingBottom: insets.bottom + 120,
        }}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.headerRow}>
          <BrandMark variant="bottle" showWordmark style={styles.brandMark} />
          <Pressable
            onPress={() => setCreateOpen(true)}
            style={styles.newBtn}
            accessibilityRole="button"
            accessibilityLabel="Criar nova adega"
          >
            <Text style={styles.newBtnText}>Nova adega</Text>
          </Pressable>
        </View>

        {hasCellars ? (
          <>
            <Animated.Text
              key={activeCellar?.type ?? 'default'}
              entering={FadeIn.duration(400)}
              exiting={FadeOut.duration(200)}
              style={styles.eyebrow}
            >
              {atmosphere.eyebrow}
            </Animated.Text>

            <Text style={styles.title}>
              {activeCellar?.name ?? 'Minha Adega'}
            </Text>
            <Text style={styles.inventory}>
              {winesQuery.isLoading
                ? 'Sincronizando inventário…'
                : `${totalBottles} garrafas em seu inventário pessoal`}
            </Text>

            <Pressable
              style={styles.addWineBtn}
              onPress={() => setAddWineOpen(true)}
              accessibilityRole="button"
              accessibilityLabel="Adicionar vinho à adega"
            >
              <Text style={styles.addWineBtnText}>Adicionar vinho</Text>
            </Pressable>

            {(cellars?.length ?? 0) >= 1 ? (
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.cellarTabs}
              >
                {cellars?.map((c) => (
                  <Pressable
                    key={c.id}
                    onPress={() => setActiveCellarId(c.id)}
                    style={[
                      styles.tab,
                      c.id === activeCellar?.id && styles.tabActive,
                    ]}
                  >
                    <Text
                      style={[
                        styles.tabText,
                        c.id === activeCellar?.id && styles.tabTextActive,
                      ]}
                    >
                      {c.name}
                    </Text>
                  </Pressable>
                ))}
              </ScrollView>
            ) : null}

            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.typeRow}
            >
              {CELLAR_TYPES.map((type) => {
                const selected = activeCellar?.type === type;
                return (
                  <Pressable
                    key={type}
                    onPress={() => changeType(type)}
                    style={[styles.typeChip, selected && styles.typeChipActive]}
                  >
                    <Text
                      style={[
                        styles.typeChipText,
                        selected && styles.typeChipTextActive,
                      ]}
                    >
                      {CELLAR_TYPE_LABELS[type]}
                    </Text>
                  </Pressable>
                );
              })}
            </ScrollView>
          </>
        ) : !isLoading ? (
          <View style={styles.emptyCellars}>
            <Text style={styles.emptyTitle}>Nenhuma adega ainda</Text>
            <Text style={styles.emptyBody}>
              Crie sua primeira adega para começar a organizar o inventário.
            </Text>
            <Pressable
              style={styles.emptyCta}
              onPress={() => setCreateOpen(true)}
            >
              <Text style={styles.emptyCtaText}>Criar adega</Text>
            </Pressable>
          </View>
        ) : null}

        {isLoading ? <CellarListSkeleton /> : null}

        {isError ? (
          <ErrorBanner
            message="Não foi possível carregar suas adegas."
            onRetry={() => void refetch()}
          />
        ) : null}

        {hasCellars && winesQuery.isError ? (
          <ErrorBanner
            message="Falha ao carregar o inventário desta adega."
            onRetry={() => void winesQuery.refetch()}
          />
        ) : null}

        {hasCellars &&
        !isLoading &&
        !winesQuery.isLoading &&
        (winesQuery.data?.length ?? 0) === 0 ? (
          <View style={styles.empty}>
            <Text style={styles.emptyTitle}>Adega em silêncio</Text>
            <Text style={styles.emptyBody}>
              Toque em “Adicionar vinho” para buscar e cadastrar sua primeira
              garrafa nesta adega.
            </Text>
            <Pressable
              style={styles.emptyCta}
              onPress={() => setAddWineOpen(true)}
            >
              <Text style={styles.emptyCtaText}>Adicionar vinho</Text>
            </Pressable>
          </View>
        ) : null}

        {winesQuery.data?.map((item) => (
          <WineRow
            key={item.id}
            item={item}
            onPress={() => setSelectedWine(item)}
          />
        ))}

        {isRefetching || updateType.isPending ? (
          <Text style={styles.sync}>Atualizando…</Text>
        ) : null}
      </ScrollView>

      <CreateCellarModal
        visible={createOpen}
        onClose={() => setCreateOpen(false)}
        onCreated={(id) => setActiveCellarId(id)}
      />

      {activeCellar ? (
        <AddWineModal
          visible={addWineOpen}
          cellarId={activeCellar.id}
          cellarName={activeCellar.name}
          onClose={() => setAddWineOpen(false)}
        />
      ) : null}

      <WineDetailModal
        visible={selectedWine != null}
        item={selectedWine}
        onClose={() => setSelectedWine(null)}
        onReportUpdated={() => void winesQuery.refetch()}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.paper },
  headerRow: {
    marginHorizontal: 24,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  brandMark: {
    flex: 1,
    flexShrink: 1,
  },
  newBtn: {
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.bordoux,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  newBtnText: {
    color: colors.bordoux,
    fontFamily: 'DMSans_500Medium',
    fontSize: 11,
    letterSpacing: 1.2,
    textTransform: 'uppercase',
  },
  eyebrow: {
    marginHorizontal: 24,
    marginTop: 28,
    fontFamily: 'DMSans_400Regular',
    fontSize: 12,
    letterSpacing: 1.4,
    textTransform: 'uppercase',
    color: colors.muted,
  },
  title: {
    marginHorizontal: 24,
    marginTop: 8,
    fontFamily: 'CormorantGaramond_600SemiBold',
    fontSize: 44,
    color: colors.ink,
  },
  inventory: {
    marginHorizontal: 24,
    marginTop: 8,
    fontFamily: 'DMSans_400Regular',
    fontSize: 14,
    color: colors.muted,
  },
  addWineBtn: {
    marginHorizontal: 24,
    marginTop: 18,
    alignSelf: 'flex-start',
    backgroundColor: colors.bordoux,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  addWineBtnText: {
    color: colors.cream,
    fontFamily: 'DMSans_500Medium',
    fontSize: 11,
    letterSpacing: 1.3,
    textTransform: 'uppercase',
  },
  cellarTabs: {
    paddingHorizontal: 20,
    paddingTop: 24,
    gap: 10,
  },
  tab: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: 'transparent',
  },
  tabActive: { borderBottomColor: colors.bordoux },
  tabText: {
    color: colors.muted,
    fontFamily: 'DMSans_400Regular',
    fontSize: 13,
  },
  tabTextActive: { color: colors.bordoux },
  typeRow: {
    paddingHorizontal: 20,
    paddingVertical: 22,
    gap: 10,
  },
  typeChip: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: '#C9B8AE',
  },
  typeChipActive: {
    borderColor: colors.bordoux,
    backgroundColor: 'rgba(74,14,23,0.06)',
  },
  typeChipText: {
    color: colors.muted,
    fontFamily: 'DMSans_500Medium',
    fontSize: 12,
    letterSpacing: 0.4,
  },
  typeChipTextActive: { color: colors.bordoux },
  emptyCellars: {
    marginHorizontal: 24,
    marginTop: 48,
  },
  empty: {
    marginHorizontal: 24,
    marginTop: 40,
    paddingVertical: 28,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: '#C9B8AE',
  },
  emptyTitle: {
    fontFamily: 'CormorantGaramond_600SemiBold',
    fontSize: 28,
    color: colors.ink,
  },
  emptyBody: {
    marginTop: 8,
    fontFamily: 'DMSans_400Regular',
    fontSize: 14,
    lineHeight: 22,
    color: colors.muted,
  },
  emptyCta: {
    marginTop: 24,
    alignSelf: 'flex-start',
    backgroundColor: colors.bordoux,
    paddingHorizontal: 20,
    paddingVertical: 14,
  },
  emptyCtaText: {
    color: colors.cream,
    fontFamily: 'DMSans_500Medium',
    fontSize: 12,
    letterSpacing: 1.4,
    textTransform: 'uppercase',
  },
  sync: {
    textAlign: 'center',
    marginTop: 16,
    color: colors.bordoux,
    fontFamily: 'DMSans_400Regular',
    fontSize: 12,
  },
});
