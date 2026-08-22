import { Image, StyleSheet, Text, View, type StyleProp, type ViewStyle } from 'react-native';
import { colors } from '@/core/theme/colors';

const logo = require('../../../assets/brand/logo-transparent.png');
const bottle = require('../../../assets/brand/bottle.png');

type Props = {
  variant?: 'full' | 'bottle';
  style?: StyleProp<ViewStyle>;
  /** When true, show text name under/beside mark for accessibility on dense headers */
  showWordmark?: boolean;
};

export function BrandMark({
  variant = 'full',
  style,
  showWordmark = false,
}: Props) {
  if (variant === 'bottle') {
    return (
      <View style={[styles.row, style]}>
        <Image source={bottle} style={styles.bottle} resizeMode="contain" />
        {showWordmark ? (
          <Text style={styles.wordmarkCompact}>Show Me The Wine</Text>
        ) : null}
      </View>
    );
  }

  return (
    <View style={style}>
      <Image source={logo} style={styles.logo} resizeMode="contain" />
      {showWordmark ? (
        <Text style={styles.wordmarkSr}>Show Me The Wine</Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  logo: {
    width: 220,
    height: 72,
  },
  bottle: {
    width: 28,
    height: 56,
  },
  wordmarkCompact: {
    fontFamily: 'CormorantGaramond_600SemiBold',
    fontSize: 18,
    color: colors.bordoux,
    letterSpacing: 0.4,
    flexShrink: 1,
  },
  wordmarkSr: {
    position: 'absolute',
    width: 1,
    height: 1,
    opacity: 0,
  },
});
