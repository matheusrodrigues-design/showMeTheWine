import { useState } from 'react';
import {
  ActivityIndicator,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { colors } from '@/core/theme/colors';
import { sanitizeUserText } from '@/core/security/sanitize';
import { useWineSearch } from '@/presentation/hooks/useSommelier';
import { useAddWineToCellar } from '@/presentation/hooks/useCellars';
import { ErrorBanner } from '@/presentation/components/ErrorBanner';
import { ApiError } from '@/data/datasources/edgeFunctionClient';
import type { WineSearchResponse } from '@/data/schemas/wine';

interface Props {
  visible: boolean;
  cellarId: string;
  cellarName: string;
  onClose: () => void;
}

export function AddWineModal({
  visible,
  cellarId,
  cellarName,
  onClose,
}: Props) {
  const search = useWineSearch();
  const addWine = useAddWineToCellar();

  const [query, setQuery] = useState('');
  const [result, setResult] = useState<WineSearchResponse | null>(null);
  const [quantity, setQuantity] = useState(1);
  const [notes, setNotes] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const busy = search.isPending || addWine.isPending;

  function reset() {
    setQuery('');
    setResult(null);
    setQuantity(1);
    setNotes('');
    setError(null);
    setSuccess(null);
  }

  function handleClose() {
    if (busy) return;
    reset();
    onClose();
  }

  async function onSearch() {
    setError(null);
    setSuccess(null);
    setResult(null);
    const cleaned = sanitizeUserText(query, 200);
    if (cleaned.length < 2) {
      setError('Informe ao menos 2 caracteres para buscar.');
      return;
    }
    try {
      const data = await search.mutateAsync(cleaned);
      setResult(data);
    } catch (e) {
      setError(
        e instanceof ApiError ? e.message : 'Falha na busca do vinho.',
      );
    }
  }

  async function onAdd() {
    if (!result?.wine.id) return;
    setError(null);
    setSuccess(null);
    try {
      await addWine.mutateAsync({
        cellarId,
        wineCacheId: result.wine.id,
        quantity,
        notes: notes.trim() || null,
      });
      setSuccess(
        `${result.wine.name} adicionado a “${cellarName}” (${quantity} un.).`,
      );
      setResult(null);
      setQuery('');
      setQuantity(1);
      setNotes('');
    } catch (e) {
      setError(
        e instanceof Error ? e.message : 'Não foi possível cadastrar o vinho.',
      );
    }
  }

  function bumpQuantity(delta: number) {
    setQuantity((q) => Math.min(10000, Math.max(1, q + delta)));
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
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            <Text style={styles.title}>Adicionar vinho</Text>
            <Text style={styles.subtitle}>
              Busca com cache inteligente · adega “{cellarName}”
            </Text>

            {error ? <ErrorBanner message={error} /> : null}
            {success ? (
              <View style={styles.successBox}>
                <Text style={styles.successText}>{success}</Text>
              </View>
            ) : null}

            <Text style={styles.label}>Buscar vinho</Text>
            <TextInput
              style={styles.input}
              value={query}
              onChangeText={setQuery}
              placeholder="Ex: Catena Zapata Malbec 2019"
              placeholderTextColor="#6A6560"
              maxLength={200}
              editable={!busy}
              returnKeyType="search"
              onSubmitEditing={() => void onSearch()}
            />

            <Pressable
              style={[styles.searchBtn, busy && styles.disabled]}
              onPress={() => void onSearch()}
              disabled={busy}
            >
              {search.isPending ? (
                <ActivityIndicator color={colors.cream} />
              ) : (
                <Text style={styles.searchBtnText}>Buscar</Text>
              )}
            </Pressable>

            {result ? (
              <View style={styles.result}>
                <Text style={styles.badge}>
                  {result.fromCache ? 'Cache · custo zero' : 'IA · novo registro'}
                </Text>
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

                <Text style={[styles.label, { marginTop: 22 }]}>Quantidade</Text>
                <View style={styles.qtyRow}>
                  <Pressable
                    style={styles.qtyBtn}
                    onPress={() => bumpQuantity(-1)}
                    disabled={busy || quantity <= 1}
                  >
                    <Text style={styles.qtyBtnText}>−</Text>
                  </Pressable>
                  <Text style={styles.qtyValue}>{quantity}</Text>
                  <Pressable
                    style={styles.qtyBtn}
                    onPress={() => bumpQuantity(1)}
                    disabled={busy}
                  >
                    <Text style={styles.qtyBtnText}>+</Text>
                  </Pressable>
                </View>

                <Text style={[styles.label, { marginTop: 18 }]}>
                  Notas (opcional)
                </Text>
                <TextInput
                  style={styles.input}
                  value={notes}
                  onChangeText={setNotes}
                  placeholder="Ex: presente da safra 2019"
                  placeholderTextColor="#6A6560"
                  maxLength={500}
                  editable={!busy}
                />

                <Pressable
                  style={[styles.addBtn, busy && styles.disabled]}
                  onPress={() => void onAdd()}
                  disabled={busy}
                >
                  {addWine.isPending ? (
                    <ActivityIndicator color={colors.cream} />
                  ) : (
                    <Text style={styles.addBtnText}>Cadastrar na adega</Text>
                  )}
                </Pressable>
              </View>
            ) : null}

            <Pressable
              style={styles.cancelBtn}
              onPress={handleClose}
              disabled={busy}
            >
              <Text style={styles.cancelText}>Fechar</Text>
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
  title: {
    fontFamily: 'CormorantGaramond_600SemiBold',
    fontSize: 32,
    color: colors.ink,
  },
  subtitle: {
    marginTop: 6,
    marginBottom: 18,
    fontFamily: 'DMSans_400Regular',
    fontSize: 14,
    color: colors.muted,
    lineHeight: 20,
  },
  label: {
    color: colors.bordoux,
    fontFamily: 'DMSans_500Medium',
    fontSize: 11,
    letterSpacing: 1.6,
    textTransform: 'uppercase',
    marginBottom: 8,
  },
  input: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#C9B8AE',
    color: colors.ink,
    fontFamily: 'DMSans_400Regular',
    fontSize: 16,
    paddingVertical: 12,
  },
  searchBtn: {
    marginTop: 18,
    backgroundColor: colors.bordoux,
    paddingVertical: 14,
    alignItems: 'center',
  },
  searchBtnText: {
    color: colors.cream,
    fontFamily: 'DMSans_500Medium',
    fontSize: 12,
    letterSpacing: 1.4,
    textTransform: 'uppercase',
  },
  result: {
    marginTop: 28,
    paddingTop: 20,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: '#C9B8AE',
  },
  badge: {
    color: colors.bordoux,
    fontFamily: 'DMSans_500Medium',
    fontSize: 11,
    letterSpacing: 1.4,
    textTransform: 'uppercase',
    marginBottom: 10,
  },
  wineName: {
    fontFamily: 'CormorantGaramond_600SemiBold',
    fontSize: 28,
    color: colors.ink,
  },
  meta: {
    marginTop: 6,
    fontFamily: 'DMSans_400Regular',
    fontSize: 13,
    color: colors.bordoux,
  },
  region: {
    marginTop: 4,
    fontFamily: 'DMSans_400Regular',
    fontSize: 13,
    color: colors.muted,
  },
  qtyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 18,
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
  addBtn: {
    marginTop: 28,
    backgroundColor: colors.bordoux,
    paddingVertical: 15,
    alignItems: 'center',
  },
  addBtnText: {
    color: colors.cream,
    fontFamily: 'DMSans_500Medium',
    fontSize: 12,
    letterSpacing: 1.4,
    textTransform: 'uppercase',
  },
  cancelBtn: {
    marginTop: 16,
    paddingVertical: 14,
    alignItems: 'center',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: '#C9B8AE',
  },
  cancelText: {
    color: colors.muted,
    fontFamily: 'DMSans_500Medium',
    fontSize: 12,
    letterSpacing: 1.4,
    textTransform: 'uppercase',
  },
  successBox: {
    marginBottom: 14,
    padding: 14,
    borderLeftWidth: 2,
    borderLeftColor: colors.success,
    backgroundColor: '#E8F0E9',
  },
  successText: {
    color: colors.ink,
    fontFamily: 'DMSans_400Regular',
    fontSize: 14,
    lineHeight: 20,
  },
  disabled: { opacity: 0.6 },
});
