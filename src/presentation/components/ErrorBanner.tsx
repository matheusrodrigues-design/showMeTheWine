import { Text, Pressable, StyleSheet, View } from 'react-native';
import { colors } from '@/core/theme/colors';

interface Props {
  message: string;
  onRetry?: () => void;
}

export function ErrorBanner({ message, onRetry }: Props) {
  return (
    <View style={styles.wrap} accessibilityRole="alert">
      <Text style={styles.text}>{message}</Text>
      {onRetry ? (
        <Pressable onPress={onRetry} style={styles.btn} accessibilityRole="button">
          <Text style={styles.btnText}>Tentar novamente</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    marginHorizontal: 20,
    marginVertical: 12,
    padding: 16,
    borderLeftWidth: 2,
    borderLeftColor: colors.bordoux,
    backgroundColor: '#F3E4E0',
  },
  text: {
    color: colors.ink,
    fontFamily: 'DMSans_400Regular',
    fontSize: 14,
    lineHeight: 20,
  },
  btn: {
    marginTop: 12,
    alignSelf: 'flex-start',
  },
  btnText: {
    color: colors.bordoux,
    fontFamily: 'DMSans_500Medium',
    fontSize: 13,
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
});
