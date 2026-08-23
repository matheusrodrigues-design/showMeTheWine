import { StyleSheet, Text, View } from 'react-native';
import { colors } from '@/core/theme/colors';

type SensoryKind = 'visual' | 'olfactory' | 'palate';

const GLYPH: Record<SensoryKind, { symbol: string; label: string }> = {
  visual: { symbol: '👁', label: 'olho' },
  olfactory: { symbol: '👃', label: 'nariz' },
  palate: { symbol: '👄', label: 'boca' },
};

export function SensoryGlyph({ kind }: { kind: SensoryKind }) {
  const spec = GLYPH[kind];
  return (
    <View
      style={styles.wrap}
      accessibilityLabel={spec.label}
      accessibilityRole="image"
    >
      <Text style={styles.symbol}>{spec.symbol}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    width: 32,
    height: 32,
    borderRadius: 16,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.bordoux,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(74,14,23,0.05)',
  },
  symbol: {
    fontSize: 15,
    lineHeight: 18,
  },
});
