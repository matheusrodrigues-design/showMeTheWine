import { useEffect } from 'react';
import { View, StyleSheet } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
  interpolate,
} from 'react-native-reanimated';
import { colors } from '@/core/theme/colors';

interface ShimmerProps {
  height?: number;
  width?: number | `${number}%`;
  borderRadius?: number;
  style?: object;
}

export function Shimmer({
  height = 16,
  width = '100%',
  borderRadius = 6,
  style,
}: ShimmerProps) {
  const progress = useSharedValue(0);

  useEffect(() => {
    progress.value = withRepeat(withTiming(1, { duration: 1400 }), -1, true);
  }, [progress]);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: interpolate(progress.value, [0, 1], [0.35, 0.85]),
  }));

  return (
    <Animated.View
      style={[
        styles.base,
        { height, width, borderRadius },
        animatedStyle,
        style,
      ]}
    />
  );
}

export function CellarListSkeleton() {
  return (
    <View style={styles.skeletonWrap}>
      <Shimmer height={28} width="45%" />
      <Shimmer height={14} width="70%" style={{ marginTop: 10 }} />
      {[0, 1, 2].map((i) => (
        <View key={i} style={styles.cardSkeleton}>
          <Shimmer height={18} width="55%" />
          <Shimmer height={12} width="80%" style={{ marginTop: 10 }} />
          <Shimmer height={12} width="40%" style={{ marginTop: 8 }} />
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  base: {
    backgroundColor: colors.paperDeep,
  },
  skeletonWrap: {
    padding: 24,
    gap: 4,
  },
  cardSkeleton: {
    marginTop: 20,
    padding: 20,
    borderRadius: 4,
    backgroundColor: 'rgba(255,255,255,0.5)',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: '#D9CBC2',
  },
});
