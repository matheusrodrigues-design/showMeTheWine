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
import {
  CELLAR_TYPES,
  CELLAR_TYPE_LABELS,
  type CellarType,
} from '@/domain/entities/Cellar';
import { colors } from '@/core/theme/colors';
import { useCreateCellar } from '@/presentation/hooks/useCellars';
import { ErrorBanner } from '@/presentation/components/ErrorBanner';

interface Props {
  visible: boolean;
  onClose: () => void;
  onCreated: (cellarId: string) => void;
}

export function CreateCellarModal({ visible, onClose, onCreated }: Props) {
  const createCellar = useCreateCellar();
  const [name, setName] = useState('');
  const [type, setType] = useState<CellarType>('climatizada');
  const [error, setError] = useState<string | null>(null);

  function reset() {
    setName('');
    setType('climatizada');
    setError(null);
  }

  function handleClose() {
    if (createCellar.isPending) return;
    reset();
    onClose();
  }

  async function submit() {
    setError(null);
    try {
      const cellar = await createCellar.mutateAsync({
        name: name.trim(),
        type,
      });
      reset();
      onCreated(cellar.id);
      onClose();
    } catch (e) {
      setError(
        e instanceof Error ? e.message : 'Não foi possível criar a adega.',
      );
    }
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
          <Text style={styles.title}>Nova Adega</Text>
          <Text style={styles.subtitle}>
            Nomeie o espaço e escolha o estilo de conservação.
          </Text>

          {error ? <ErrorBanner message={error} /> : null}

          <Text style={styles.label}>Nome</Text>
          <TextInput
            style={styles.input}
            value={name}
            onChangeText={setName}
            placeholder="Ex: Adega Principal"
            placeholderTextColor="#6A6560"
            maxLength={80}
            editable={!createCellar.isPending}
            autoFocus
          />

          <Text style={[styles.label, { marginTop: 22 }]}>Tipo</Text>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.typeRow}
          >
            {CELLAR_TYPES.map((item) => {
              const selected = type === item;
              return (
                <Pressable
                  key={item}
                  onPress={() => setType(item)}
                  disabled={createCellar.isPending}
                  style={[styles.typeChip, selected && styles.typeChipActive]}
                >
                  <Text
                    style={[
                      styles.typeChipText,
                      selected && styles.typeChipTextActive,
                    ]}
                  >
                    {CELLAR_TYPE_LABELS[item]}
                  </Text>
                </Pressable>
              );
            })}
          </ScrollView>

          <View style={styles.actions}>
            <Pressable
              style={styles.cancelBtn}
              onPress={handleClose}
              disabled={createCellar.isPending}
            >
              <Text style={styles.cancelText}>Cancelar</Text>
            </Pressable>
            <Pressable
              style={[
                styles.createBtn,
                createCellar.isPending && styles.disabled,
              ]}
              onPress={() => void submit()}
              disabled={createCellar.isPending}
            >
              {createCellar.isPending ? (
                <ActivityIndicator color={colors.cream} />
              ) : (
                <Text style={styles.createText}>Criar adega</Text>
              )}
            </Pressable>
          </View>
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
    marginBottom: 20,
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
  typeRow: {
    gap: 10,
    paddingVertical: 4,
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
  },
  typeChipTextActive: { color: colors.bordoux },
  actions: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 32,
  },
  cancelBtn: {
    flex: 1,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: '#C9B8AE',
    paddingVertical: 15,
    alignItems: 'center',
  },
  cancelText: {
    color: colors.muted,
    fontFamily: 'DMSans_500Medium',
    fontSize: 12,
    letterSpacing: 1.4,
    textTransform: 'uppercase',
  },
  createBtn: {
    flex: 1,
    backgroundColor: colors.bordoux,
    paddingVertical: 15,
    alignItems: 'center',
  },
  createText: {
    color: colors.cream,
    fontFamily: 'DMSans_500Medium',
    fontSize: 12,
    letterSpacing: 1.4,
    textTransform: 'uppercase',
  },
  disabled: { opacity: 0.6 },
});
