import { StyleSheet, View } from 'react-native';
import { colors } from '@/core/theme/colors';

type SensoryKind = 'visual' | 'olfactory' | 'palate';

const ink = colors.ink;

function EyeIcon() {
  return (
    <View style={styles.iconBox}>
      <View style={styles.eyeAlmond}>
        <View style={styles.eyePupil} />
      </View>
    </View>
  );
}

function NoseIcon() {
  return (
    <View style={styles.iconBox}>
      <View style={styles.noseBridge} />
      <View style={styles.noseBase}>
        <View style={styles.nostril} />
        <View style={styles.nostril} />
      </View>
    </View>
  );
}

function MouthIcon() {
  return (
    <View style={styles.iconBox}>
      <View style={styles.lipUpper} />
      <View style={styles.lipGap} />
      <View style={styles.lipLower} />
    </View>
  );
}

export function SensoryGlyph({ kind }: { kind: SensoryKind }) {
  const label =
    kind === 'visual' ? 'olho' : kind === 'olfactory' ? 'nariz' : 'boca';

  return (
    <View
      style={styles.wrap}
      accessibilityLabel={label}
      accessibilityRole="image"
    >
      {kind === 'visual' ? <EyeIcon /> : null}
      {kind === 'olfactory' ? <NoseIcon /> : null}
      {kind === 'palate' ? <MouthIcon /> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    width: 32,
    height: 32,
    borderRadius: 16,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: ink,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'transparent',
  },
  iconBox: {
    width: 16,
    height: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  eyeAlmond: {
    width: 14,
    height: 8,
    borderRadius: 8,
    borderWidth: 1.4,
    borderColor: ink,
    alignItems: 'center',
    justifyContent: 'center',
  },
  eyePupil: {
    width: 3.5,
    height: 3.5,
    borderRadius: 2,
    backgroundColor: ink,
  },
  noseBridge: {
    width: 1.6,
    height: 7,
    backgroundColor: ink,
    borderRadius: 1,
    marginBottom: 1,
  },
  noseBase: {
    flexDirection: 'row',
    gap: 3,
  },
  nostril: {
    width: 4,
    height: 3,
    borderRadius: 2,
    borderWidth: 1.3,
    borderColor: ink,
  },
  lipUpper: {
    width: 13,
    height: 3.5,
    borderTopLeftRadius: 7,
    borderTopRightRadius: 7,
    borderWidth: 1.3,
    borderBottomWidth: 0,
    borderColor: ink,
  },
  lipGap: {
    height: 1,
  },
  lipLower: {
    width: 13,
    height: 3.5,
    borderBottomLeftRadius: 7,
    borderBottomRightRadius: 7,
    borderWidth: 1.3,
    borderTopWidth: 0,
    borderColor: ink,
  },
});
