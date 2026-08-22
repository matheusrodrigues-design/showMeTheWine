import { StyleSheet, Text, View } from 'react-native';
import type { CellarWine } from '@/domain/entities/Cellar';
import { colors } from '@/core/theme/colors';

interface Props {
  item: CellarWine;
}

export function WineRow({ item }: Props) {
  const wine = item.wine;
  const qtyLabel =
    item.quantity === 1 ? '1 garrafa' : `${item.quantity} garrafas`;

  return (
    <View style={styles.row}>
      <View style={styles.accent} />
      <View style={styles.content}>
        <Text style={styles.name} numberOfLines={1}>
          {wine?.name ?? 'Vinho'}
        </Text>
        <Text style={styles.meta} numberOfLines={1}>
          {[
            wine?.vintage ? `Safra ${wine.vintage}` : null,
            wine?.producer,
          ]
            .filter(Boolean)
            .join(' · ') || 'Detalhes em breve'}
        </Text>
        <Text style={styles.region} numberOfLines={1}>
          {[wine?.region, wine?.country].filter(Boolean).join(', ') || '—'}
        </Text>
        <Text style={styles.qty}>{qtyLabel}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    marginHorizontal: 20,
    marginBottom: 14,
    backgroundColor: 'rgba(26,26,26,0.72)',
    overflow: 'hidden',
  },
  accent: {
    width: 3,
    backgroundColor: colors.gold,
  },
  content: {
    flex: 1,
    paddingVertical: 18,
    paddingHorizontal: 18,
  },
  name: {
    color: colors.cream,
    fontFamily: 'CormorantGaramond_600SemiBold',
    fontSize: 26,
    letterSpacing: 0.3,
  },
  meta: {
    marginTop: 4,
    color: colors.gold,
    fontFamily: 'DMSans_400Regular',
    fontSize: 13,
  },
  region: {
    marginTop: 6,
    color: colors.muted,
    fontFamily: 'DMSans_400Regular',
    fontSize: 13,
  },
  qty: {
    marginTop: 12,
    color: colors.cream,
    fontFamily: 'DMSans_500Medium',
    fontSize: 12,
    letterSpacing: 1.2,
    textTransform: 'uppercase',
  },
});
