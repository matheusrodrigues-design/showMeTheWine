import { useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useAuth } from '@/presentation/providers/AuthProvider';
import { colors } from '@/core/theme/colors';
import { ErrorBanner } from '@/presentation/components/ErrorBanner';
import { BrandMark } from '@/presentation/components/BrandMark';
import { ApiError } from '@/data/datasources/apiClient';

export function AuthScreen() {
  const { signIn, signUp } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [signupOpen, setSignupOpen] = useState(false);

  async function submitLogin() {
    setBusy(true);
    setError(null);
    try {
      await signIn(email.trim(), password);
    } catch (e) {
      if (e instanceof ApiError && e.code === 'ACCOUNT_MIGRATED') {
        setSignupOpen(true);
        return;
      }
      setError(
        friendlyAuthError(e, 'Não foi possível entrar. Confira e-mail e senha.'),
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <LinearGradient
      colors={[colors.paper, '#F3E8E4', colors.paperWarm]}
      locations={[0, 0.45, 1]}
      style={styles.root}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.inner}
      >
        <BrandMark variant="full" style={styles.logo} />
        <Text style={styles.subtitle}>
          Sua adega privada, curada com inteligência e discrição.
        </Text>

        {error ? <ErrorBanner message={error} /> : null}

        <View style={styles.form}>
          <Text style={styles.label}>E-mail</Text>
          <TextInput
            style={styles.input}
            autoCapitalize="none"
            keyboardType="email-address"
            autoComplete="email"
            value={email}
            onChangeText={setEmail}
            placeholder="voce@exemplo.com"
            placeholderTextColor="#9A8F88"
          />

          <Text style={[styles.label, { marginTop: 18 }]}>Senha</Text>
          <TextInput
            style={styles.input}
            secureTextEntry
            autoComplete="password"
            value={password}
            onChangeText={setPassword}
            placeholder="Sua senha"
            placeholderTextColor="#9A8F88"
          />

          <Pressable
            style={[styles.cta, busy && styles.ctaDisabled]}
            onPress={() => void submitLogin()}
            disabled={busy}
          >
            {busy ? (
              <ActivityIndicator color={colors.cream} />
            ) : (
              <Text style={styles.ctaText}>Entrar</Text>
            )}
          </Pressable>

          <Pressable onPress={() => setSignupOpen(true)} style={styles.switch}>
            <Text style={styles.switchText}>Novo membro? Solicitar acesso</Text>
          </Pressable>
        </View>
      </KeyboardAvoidingView>

      <CreateAccessModal
        visible={signupOpen}
        initialEmail={email}
        onClose={() => setSignupOpen(false)}
        onCreate={signUp}
      />
    </LinearGradient>
  );
}

function CreateAccessModal({
  visible,
  initialEmail,
  onClose,
  onCreate,
}: {
  visible: boolean;
  initialEmail: string;
  onClose: () => void;
  onCreate: (email: string, password: string) => Promise<void>;
}) {
  const [email, setEmail] = useState(initialEmail);
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function handleClose() {
    if (busy) return;
    setPassword('');
    setConfirm('');
    setError(null);
    onClose();
  }

  async function submit() {
    if (password !== confirm) {
      setError('As senhas não coincidem.');
      return;
    }
    setBusy(true);
    setError(null);
    try {
      await onCreate(email.trim(), password);
      setPassword('');
      setConfirm('');
      onClose();
    } catch (e) {
      setError(
        friendlyAuthError(e, 'Não foi possível criar o acesso. Confira e-mail e senha.'),
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent
      onRequestClose={handleClose}
      onShow={() => {
        setEmail(initialEmail);
        setPassword('');
        setConfirm('');
        setError(null);
      }}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.backdrop}
      >
        <Pressable style={styles.backdropTap} onPress={handleClose} />
        <View style={styles.sheet}>
          <Text style={styles.sheetTitle}>Criar seu acesso</Text>
          <Text style={styles.sheetBody}>
            Isto não é um pedido para alguém aprovar. Você está criando a sua
            conta agora. Escolha um e-mail e uma senha de pelo menos 8
            caracteres. Ao confirmar, a entrada é imediata.
          </Text>
          <Text style={styles.sheetNote}>
            Se você já usou o aplicativo, use o mesmo e-mail e defina uma senha
            nova. A adega continua ligada a esse e-mail.
          </Text>

          {error ? <ErrorBanner message={error} /> : null}

          <Text style={styles.label}>E-mail</Text>
          <TextInput
            style={styles.input}
            autoCapitalize="none"
            keyboardType="email-address"
            autoComplete="email"
            value={email}
            onChangeText={setEmail}
            placeholder="voce@exemplo.com"
            placeholderTextColor="#9A8F88"
          />

          <Text style={[styles.label, { marginTop: 18 }]}>Senha</Text>
          <TextInput
            style={styles.input}
            secureTextEntry
            autoComplete="new-password"
            value={password}
            onChangeText={setPassword}
            placeholder="Mínimo 8 caracteres"
            placeholderTextColor="#9A8F88"
          />

          <Text style={[styles.label, { marginTop: 18 }]}>Confirmar senha</Text>
          <TextInput
            style={styles.input}
            secureTextEntry
            autoComplete="new-password"
            value={confirm}
            onChangeText={setConfirm}
            placeholder="Repita a senha"
            placeholderTextColor="#9A8F88"
          />

          <View style={styles.actions}>
            <Pressable
              style={styles.cancelBtn}
              onPress={handleClose}
              disabled={busy}
            >
              <Text style={styles.cancelText}>Cancelar</Text>
            </Pressable>
            <Pressable
              style={[styles.createBtn, busy && styles.ctaDisabled]}
              onPress={() => void submit()}
              disabled={busy}
            >
              {busy ? (
                <ActivityIndicator color={colors.cream} />
              ) : (
                <Text style={styles.createText}>Criar acesso</Text>
              )}
            </Pressable>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

function friendlyAuthError(error: unknown, fallback: string): string {
  if (error instanceof ApiError) return error.message;
  if (error instanceof Error && error.message.includes('8')) {
    return 'A senha precisa ter pelo menos 8 caracteres.';
  }
  if (error instanceof Error && /email/i.test(error.message)) {
    return 'Informe um e-mail válido.';
  }
  return fallback;
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  inner: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: 28,
  },
  logo: {
    marginBottom: 20,
  },
  subtitle: {
    marginTop: 10,
    marginBottom: 36,
    fontFamily: 'DMSans_400Regular',
    fontSize: 15,
    lineHeight: 22,
    color: colors.muted,
    maxWidth: 300,
  },
  form: { marginTop: 8 },
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
  cta: {
    marginTop: 32,
    backgroundColor: colors.bordoux,
    paddingVertical: 16,
    alignItems: 'center',
  },
  ctaDisabled: { opacity: 0.6 },
  ctaText: {
    color: colors.cream,
    fontFamily: 'DMSans_500Medium',
    fontSize: 13,
    letterSpacing: 2,
    textTransform: 'uppercase',
  },
  switch: { marginTop: 20, alignItems: 'center' },
  switchText: {
    color: colors.muted,
    fontFamily: 'DMSans_400Regular',
    fontSize: 13,
  },
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(42,18,22,0.45)',
    justifyContent: 'flex-end',
  },
  backdropTap: { flex: 1 },
  sheet: {
    backgroundColor: colors.paper,
    paddingHorizontal: 24,
    paddingTop: 28,
    paddingBottom: 36,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: '#D9CBC2',
  },
  sheetTitle: {
    fontFamily: 'CormorantGaramond_600SemiBold',
    fontSize: 32,
    color: colors.ink,
  },
  sheetBody: {
    marginTop: 10,
    fontFamily: 'DMSans_400Regular',
    fontSize: 15,
    lineHeight: 22,
    color: colors.ink,
  },
  sheetNote: {
    marginTop: 10,
    marginBottom: 20,
    fontFamily: 'DMSans_400Regular',
    fontSize: 13,
    lineHeight: 20,
    color: colors.muted,
  },
  actions: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 28,
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
});
