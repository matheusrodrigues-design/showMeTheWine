import { useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import * as ImagePicker from 'expo-image-picker';
import Animated, { FadeIn } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  useLabelOcr,
  useWineSearch,
} from '@/presentation/hooks/useSommelier';
import {
  useAddWineToCellar,
  useCellars,
} from '@/presentation/hooks/useCellars';
import { compressLabelImage } from '@/presentation/utils/compressLabelImage';
import { sanitizeUserText } from '@/core/security/sanitize';
import { ErrorBanner } from '@/presentation/components/ErrorBanner';
import { Shimmer } from '@/presentation/components/Shimmer';
import { BrandMark } from '@/presentation/components/BrandMark';
import { colors } from '@/core/theme/colors';
import { ApiError } from '@/data/datasources/edgeFunctionClient';
import type { WineReport, WineSearchResponse } from '@/data/schemas/wine';

type ReportTextKey = Exclude<keyof WineReport, 'pairings'>;

const REPORT_SECTIONS: { key: ReportTextKey; title: string }[] = [
  { key: 'producer_story', title: 'O Produtor' },
  { key: 'terroir', title: 'O Terroir' },
  { key: 'vintage_story', title: 'A Safra' },
  { key: 'label_story', title: 'O Rótulo' },
  { key: 'technical_sheet', title: 'Ficha Técnica' },
  { key: 'aging_potential', title: 'Potencial de Guarda' },
  { key: 'drinking_window', title: 'Janela Ideal de Consumo' },
  { key: 'buying_rationale', title: 'Racional de Compra' },
];

export function SommelierScreen() {
  const insets = useSafeAreaInsets();
  const [query, setQuery] = useState('');
  const [result, setResult] = useState<WineSearchResponse | null>(null);
  const [localError, setLocalError] = useState<string | null>(null);
  const [addSuccess, setAddSuccess] = useState<string | null>(null);
  const [selectedCellarId, setSelectedCellarId] = useState<string | undefined>();
  const [quantity, setQuantity] = useState(1);

  const search = useWineSearch();
  const ocr = useLabelOcr();
  const { data: cellars } = useCellars();
  const addWine = useAddWineToCellar();
  const busy = search.isPending || ocr.isPending || addWine.isPending;

  const activeCellarId = selectedCellarId ?? cellars?.[0]?.id;

  async function onAddToCellar() {
    if (!result?.wine.id || !activeCellarId) {
      setLocalError('Crie uma adega antes de cadastrar vinhos.');
      return;
    }
    setLocalError(null);
    setAddSuccess(null);
    try {
      await addWine.mutateAsync({
        cellarId: activeCellarId,
        wineCacheId: result.wine.id,
        quantity,
      });
      const cellarName =
        cellars?.find((c) => c.id === activeCellarId)?.name ?? 'sua adega';
      setAddSuccess(`Adicionado a “${cellarName}”.`);
    } catch (e) {
      setLocalError(
        e instanceof Error ? e.message : 'Falha ao cadastrar na adega.',
      );
    }
  }

  async function onSearch() {
    setLocalError(null);
    setAddSuccess(null);
    setResult(null);
    const cleaned = sanitizeUserText(query, 200);
    if (cleaned.length < 2) {
      setLocalError('Informe ao menos 2 caracteres para buscar.');
      return;
    }
    try {
      const data = await search.mutateAsync(cleaned);
      setResult(data);
    } catch (e) {
      setLocalError(
        e instanceof ApiError ? e.message : 'Falha na busca do vinho.',
      );
    }
  }

  async function onOcr() {
    setLocalError(null);
    setAddSuccess(null);
    setResult(null);
    try {
      const isWeb = Platform.OS === 'web';

      if (isWeb) {
        const permission =
          await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (!permission.granted) {
          setLocalError('Permissão de fotos negada.');
          return;
        }

        const photo = await ImagePicker.launchImageLibraryAsync({
          quality: 0.8,
          allowsEditing: true,
          aspect: [3, 4],
          base64: false,
        });

        if (photo.canceled || !photo.assets[0]?.uri) return;

        const base64 = await compressLabelImage(photo.assets[0].uri);
        const data = await ocr.mutateAsync(base64);
        setResult(data);
        return;
      }

      const permission = await ImagePicker.requestCameraPermissionsAsync();
      if (!permission.granted) {
        setLocalError('Permissão de câmera negada.');
        return;
      }

      const photo = await ImagePicker.launchCameraAsync({
        quality: 0.8,
        allowsEditing: true,
        aspect: [3, 4],
      });

      if (photo.canceled || !photo.assets[0]?.uri) return;

      const base64 = await compressLabelImage(photo.assets[0].uri);
      const data = await ocr.mutateAsync(base64);
      setResult(data);
    } catch (e) {
      setLocalError(
        e instanceof ApiError
          ? e.message
          : 'Não foi possível ler o rótulo. Tente novamente.',
      );
    }
  }

  return (
    <LinearGradient
      colors={[colors.paper, '#F4EBE6', colors.paperWarm]}
      locations={[0, 0.5, 1]}
      style={styles.root}
    >
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          contentContainerStyle={{
            paddingTop: insets.top + 24,
            paddingBottom: insets.bottom + 120,
            paddingHorizontal: 24,
          }}
          keyboardShouldPersistTaps="handled"
        >
          <BrandMark variant="bottle" style={styles.logoMark} />
          <Text style={styles.brand}>Show Me The Wine</Text>
          <Text style={styles.subtitle}>
            Cache inteligente primeiro. Relatório comercial completo quando a IA
            precisa gerar.
          </Text>

          <View style={styles.searchBox}>
            <TextInput
              style={styles.input}
              value={query}
              onChangeText={setQuery}
              placeholder="Busque um vinho — ex: Dom Pérignon 2012"
              placeholderTextColor="#9A8F88"
              maxLength={200}
              returnKeyType="search"
              onSubmitEditing={() => void onSearch()}
              editable={!busy}
            />
          </View>

          <View style={styles.actions}>
            <Pressable
              style={[styles.primaryBtn, busy && styles.disabled]}
              onPress={() => void onSearch()}
              disabled={busy}
            >
              {search.isPending ? (
                <ActivityIndicator color={colors.cream} />
              ) : (
                <Text style={styles.primaryBtnText}>Buscar</Text>
              )}
            </Pressable>

            <Pressable
              style={[styles.secondaryBtn, busy && styles.disabled]}
              onPress={() => void onOcr()}
              disabled={busy}
            >
              {ocr.isPending ? (
                <ActivityIndicator color={colors.bordoux} />
              ) : (
                <Text style={styles.secondaryBtnText}>Ler Rótulo</Text>
              )}
            </Pressable>
          </View>

          {localError ? <ErrorBanner message={localError} /> : null}

          {busy ? (
            <View style={styles.loading}>
              <Shimmer height={28} width="60%" />
              <Shimmer height={14} width="90%" style={{ marginTop: 14 }} />
              <Shimmer height={14} width="75%" style={{ marginTop: 10 }} />
              <Shimmer height={90} width="100%" style={{ marginTop: 22 }} />
            </View>
          ) : null}

          {result ? (
            <Animated.View entering={FadeIn.duration(400)} style={styles.card}>
              <View style={styles.badgeRow}>
                <Text style={styles.badge}>
                  {result.fromCache ? 'Cache · custo zero' : 'IA · novo registro'}
                </Text>
              </View>
              <Text style={styles.wineName}>{result.wine.name}</Text>
              <Text style={styles.meta}>
                {[
                  result.wine.vintage ? `Safra ${result.wine.vintage}` : null,
                  result.wine.producer,
                ]
                  .filter(Boolean)
                  .join(' · ')}
              </Text>
              <Text style={styles.region}>
                {[result.wine.region, result.wine.country]
                  .filter(Boolean)
                  .join(', ')}
              </Text>

              {result.wine.metadata?.report ? (
                <>
                  {REPORT_SECTIONS.map(({ key, title }) => {
                    const text = result.wine.metadata?.report?.[key];
                    if (typeof text !== 'string' || !text.trim()) return null;
                    return (
                      <View key={key}>
                        <Text style={styles.section}>{title}</Text>
                        <Text style={styles.body}>{text}</Text>
                      </View>
                    );
                  })}

                  <Text style={styles.section}>Harmonizações</Text>
                  {result.wine.metadata.report.pairings.map((pairing, i) => (
                    <Text key={`pairing-${i}`} style={styles.pairingItem}>
                      {i + 1}. {pairing}
                    </Text>
                  ))}
                </>
              ) : (
                <>
                  {result.wine.tasting_notes ? (
                    <>
                      <Text style={styles.section}>Notas de prova</Text>
                      <Text style={styles.body}>
                        {result.wine.tasting_notes}
                      </Text>
                    </>
                  ) : null}

                  {result.wine.pairing_notes ? (
                    <>
                      <Text style={styles.section}>Harmonização</Text>
                      <Text style={styles.body}>
                        {result.wine.pairing_notes}
                      </Text>
                    </>
                  ) : null}
                </>
              )}

              <Text style={styles.section}>Cadastrar na adega</Text>
              {(cellars?.length ?? 0) === 0 ? (
                <Text style={styles.body}>
                  Crie uma adega na aba Adegas para registrar este vinho.
                </Text>
              ) : (
                <>
                  <ScrollView
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    contentContainerStyle={styles.cellarPickRow}
                  >
                    {cellars?.map((c) => {
                      const selected = c.id === activeCellarId;
                      return (
                        <Pressable
                          key={c.id}
                          onPress={() => setSelectedCellarId(c.id)}
                          style={[
                            styles.cellarChip,
                            selected && styles.cellarChipActive,
                          ]}
                        >
                          <Text
                            style={[
                              styles.cellarChipText,
                              selected && styles.cellarChipTextActive,
                            ]}
                          >
                            {c.name}
                          </Text>
                        </Pressable>
                      );
                    })}
                  </ScrollView>

                  <View style={styles.qtyRow}>
                    <Pressable
                      style={styles.qtyBtn}
                      onPress={() =>
                        setQuantity((q) => Math.max(1, q - 1))
                      }
                      disabled={busy || quantity <= 1}
                    >
                      <Text style={styles.qtyBtnText}>−</Text>
                    </Pressable>
                    <Text style={styles.qtyValue}>{quantity}</Text>
                    <Pressable
                      style={styles.qtyBtn}
                      onPress={() =>
                        setQuantity((q) => Math.min(10000, q + 1))
                      }
                      disabled={busy}
                    >
                      <Text style={styles.qtyBtnText}>+</Text>
                    </Pressable>
                  </View>

                  <Pressable
                    style={[styles.addCellarBtn, busy && styles.disabled]}
                    onPress={() => void onAddToCellar()}
                    disabled={busy}
                  >
                    {addWine.isPending ? (
                      <ActivityIndicator color={colors.cream} />
                    ) : (
                      <Text style={styles.addCellarBtnText}>
                        Adicionar à adega
                      </Text>
                    )}
                  </Pressable>
                </>
              )}

              {addSuccess ? (
                <Text style={styles.success}>{addSuccess}</Text>
              ) : null}
            </Animated.View>
          ) : null}
        </ScrollView>
      </KeyboardAvoidingView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  brand: {
    fontFamily: 'CormorantGaramond_600SemiBold',
    fontSize: 42,
    color: colors.bordoux,
  },
  logoMark: {
    marginBottom: 8,
  },
  subtitle: {
    marginTop: 8,
    marginBottom: 28,
    fontFamily: 'DMSans_400Regular',
    fontSize: 14,
    lineHeight: 21,
    color: colors.muted,
  },
  searchBox: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#C9B8AE',
  },
  input: {
    color: colors.ink,
    fontFamily: 'DMSans_400Regular',
    fontSize: 16,
    paddingVertical: 14,
  },
  actions: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 24,
    marginBottom: 8,
  },
  primaryBtn: {
    flex: 1,
    backgroundColor: colors.bordoux,
    paddingVertical: 15,
    alignItems: 'center',
  },
  primaryBtnText: {
    color: colors.cream,
    fontFamily: 'DMSans_500Medium',
    fontSize: 12,
    letterSpacing: 1.6,
    textTransform: 'uppercase',
  },
  secondaryBtn: {
    flex: 1,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.bordoux,
    paddingVertical: 15,
    alignItems: 'center',
  },
  secondaryBtnText: {
    color: colors.bordoux,
    fontFamily: 'DMSans_500Medium',
    fontSize: 12,
    letterSpacing: 1.6,
    textTransform: 'uppercase',
  },
  disabled: { opacity: 0.55 },
  loading: { marginTop: 32 },
  card: {
    marginTop: 28,
    paddingTop: 8,
  },
  badgeRow: { marginBottom: 14 },
  badge: {
    alignSelf: 'flex-start',
    color: colors.bordoux,
    fontFamily: 'DMSans_500Medium',
    fontSize: 11,
    letterSpacing: 1.4,
    textTransform: 'uppercase',
  },
  wineName: {
    fontFamily: 'CormorantGaramond_600SemiBold',
    fontSize: 34,
    color: colors.ink,
  },
  meta: {
    marginTop: 8,
    fontFamily: 'DMSans_400Regular',
    fontSize: 14,
    color: colors.bordoux,
  },
  region: {
    marginTop: 6,
    fontFamily: 'DMSans_400Regular',
    fontSize: 13,
    color: colors.muted,
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
  pairingItem: {
    marginTop: 8,
    fontFamily: 'DMSans_400Regular',
    fontSize: 15,
    lineHeight: 24,
    color: colors.ink,
  },
  cellarPickRow: {
    gap: 10,
    marginTop: 12,
    paddingBottom: 4,
  },
  cellarChip: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: '#C9B8AE',
  },
  cellarChipActive: {
    borderColor: colors.bordoux,
    backgroundColor: 'rgba(74,14,23,0.06)',
  },
  cellarChipText: {
    color: colors.muted,
    fontFamily: 'DMSans_500Medium',
    fontSize: 12,
  },
  cellarChipTextActive: { color: colors.bordoux },
  qtyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 18,
    marginTop: 18,
  },
  qtyBtn: {
    width: 40,
    height: 40,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.bordoux,
    alignItems: 'center',
    justifyContent: 'center',
  },
  qtyBtnText: {
    color: colors.bordoux,
    fontSize: 22,
    lineHeight: 24,
  },
  qtyValue: {
    minWidth: 36,
    textAlign: 'center',
    color: colors.ink,
    fontFamily: 'CormorantGaramond_600SemiBold',
    fontSize: 28,
  },
  addCellarBtn: {
    marginTop: 20,
    backgroundColor: colors.bordoux,
    paddingVertical: 15,
    alignItems: 'center',
  },
  addCellarBtnText: {
    color: colors.cream,
    fontFamily: 'DMSans_500Medium',
    fontSize: 12,
    letterSpacing: 1.4,
    textTransform: 'uppercase',
  },
  success: {
    marginTop: 14,
    color: colors.success,
    fontFamily: 'DMSans_400Regular',
    fontSize: 14,
  },
});
