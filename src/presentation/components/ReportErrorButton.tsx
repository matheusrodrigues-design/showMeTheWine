import { useState } from 'react';
import {
  ActivityIndicator,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { colors } from '@/core/theme/colors';
import { useReportWineError } from '@/presentation/hooks/useReportErrors';
import { ErrorBanner } from '@/presentation/components/ErrorBanner';

type Props = {
  wineName: string;
  wineCacheId?: string | null;
  grapeVariety?: string | null;
};

export function ReportErrorButton({
  wineName,
  wineCacheId,
  grapeVariety,
}: Props) {
  const report = useReportWineError();
  const [open, setOpen] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  function close() {
    if (report.isPending) return;
    setOpen(false);
    setMessage('');
    setError(null);
    setDone(false);
  }

  async function onSubmit() {
    setError(null);
    try {
      await report.mutateAsync({
        wineName,
        wineCacheId,
        grapeVariety,
        message,
      });
      setDone(true);
    } catch (e) {
      setError(
        e instanceof Error ? e.message : 'Não foi possível enviar o relato.',
      );
    }
  }

  return (
    <>
      <Pressable
        style={styles.trigger}
        onPress={() => setOpen(true)}
        accessibilityRole="button"
        accessibilityLabel="Reportar erro no relatório"
      >
        <Text style={styles.triggerText}>Reportar erro no relatório</Text>
      </Pressable>

      <Modal
        visible={open}
        animationType="fade"
        transparent
        onRequestClose={close}
      >
        <View style={styles.backdrop}>
          <View style={styles.sheet}>
            <Text style={styles.title}>Reportar erro</Text>
            <Text style={styles.subtitle}>
              Conte o que está incorreto em “{wineName}”. O administrador do app
              recebe o relato.
            </Text>

            {done ? (
              <Text style={styles.success}>
                Relato enviado. Obrigado por ajudar a corrigir a ficha.
              </Text>
            ) : (
              <>
                <TextInput
                  style={styles.input}
                  value={message}
                  onChangeText={setMessage}
                  placeholder="Ex.: o rótulo é Sauvignon Blanc, não Syrah"
                  placeholderTextColor="#9A8F88"
                  multiline
                  maxLength={2000}
                  editable={!report.isPending}
                />
                {error ? <ErrorBanner message={error} /> : null}
                <Pressable
                  style={[styles.send, report.isPending && styles.disabled]}
                  onPress={() => void onSubmit()}
                  disabled={report.isPending}
                >
                  {report.isPending ? (
                    <ActivityIndicator color={colors.cream} />
                  ) : (
                    <Text style={styles.sendText}>Enviar</Text>
                  )}
                </Pressable>
              </>
            )}

            <Pressable style={styles.cancel} onPress={close} disabled={report.isPending}>
              <Text style={styles.cancelText}>{done ? 'Fechar' : 'Cancelar'}</Text>
            </Pressable>
          </View>
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  trigger: {
    marginTop: 28,
    paddingVertical: 12,
    alignItems: 'center',
  },
  triggerText: {
    color: colors.danger,
    fontFamily: 'DMSans_500Medium',
    fontSize: 11,
    letterSpacing: 1.4,
    textTransform: 'uppercase',
  },
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(42,18,22,0.45)',
    justifyContent: 'center',
    padding: 24,
  },
  sheet: {
    backgroundColor: colors.paper,
    paddingHorizontal: 22,
    paddingTop: 24,
    paddingBottom: 20,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: '#D9CBC2',
  },
  title: {
    fontFamily: 'CormorantGaramond_600SemiBold',
    fontSize: 28,
    color: colors.ink,
  },
  subtitle: {
    marginTop: 8,
    fontFamily: 'DMSans_400Regular',
    fontSize: 14,
    lineHeight: 20,
    color: colors.muted,
  },
  input: {
    marginTop: 18,
    minHeight: 110,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: '#C9B8AE',
    padding: 12,
    color: colors.ink,
    fontFamily: 'DMSans_400Regular',
    fontSize: 15,
    textAlignVertical: 'top',
  },
  send: {
    marginTop: 16,
    backgroundColor: colors.bordoux,
    paddingVertical: 14,
    alignItems: 'center',
  },
  sendText: {
    color: colors.cream,
    fontFamily: 'DMSans_500Medium',
    fontSize: 12,
    letterSpacing: 1.4,
    textTransform: 'uppercase',
  },
  cancel: {
    marginTop: 12,
    paddingVertical: 12,
    alignItems: 'center',
  },
  cancelText: {
    color: colors.muted,
    fontFamily: 'DMSans_500Medium',
    fontSize: 12,
    letterSpacing: 1.4,
    textTransform: 'uppercase',
  },
  success: {
    marginTop: 18,
    fontFamily: 'DMSans_400Regular',
    fontSize: 15,
    lineHeight: 22,
    color: colors.ink,
  },
  disabled: { opacity: 0.6 },
});
