import { useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
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

export function AuthScreen() {
  const { signIn, signUp } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [mode, setMode] = useState<'signin' | 'signup'>('signin');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit() {
    setBusy(true);
    setError(null);
    try {
      if (mode === 'signin') await signIn(email.trim(), password);
      else await signUp(email.trim(), password);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Falha na autenticação');
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
            placeholder="Mínimo 8 caracteres"
            placeholderTextColor="#9A8F88"
          />

          <Pressable
            style={[styles.cta, busy && styles.ctaDisabled]}
            onPress={() => void submit()}
            disabled={busy}
          >
            {busy ? (
              <ActivityIndicator color={colors.cream} />
            ) : (
              <Text style={styles.ctaText}>
                {mode === 'signin' ? 'Entrar' : 'Criar acesso'}
              </Text>
            )}
          </Pressable>

          <Pressable
            onPress={() =>
              setMode((m) => (m === 'signin' ? 'signup' : 'signin'))
            }
            style={styles.switch}
          >
            <Text style={styles.switchText}>
              {mode === 'signin'
                ? 'Novo membro? Solicitar acesso'
                : 'Já possui acesso? Entrar'}
            </Text>
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </LinearGradient>
  );
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
  brand: {
    fontFamily: 'CormorantGaramond_600SemiBold',
    fontSize: 36,
    color: colors.bordoux,
    letterSpacing: 0.5,
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
});
