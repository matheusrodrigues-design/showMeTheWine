import { StyleSheet, Text, View } from 'react-native';
import { colors } from '@/core/theme/colors';
import type { WineReport as DomainWineReport } from '@/domain/entities/Cellar';
import type { WineReport as ApiWineReport } from '@/data/schemas/wine';

type DisplayReport = {
  producerStory: string;
  terroir: string;
  vintageStory: string;
  labelStory: string;
  technicalSheet: string;
  agingPotential: string;
  drinkingWindow: string;
  pairings: string[];
  buyingRationale: string;
};

type ReportTextKey = Exclude<keyof DisplayReport, 'pairings'>;

const REPORT_SECTIONS: { key: ReportTextKey; title: string }[] = [
  { key: 'producerStory', title: 'O Produtor' },
  { key: 'terroir', title: 'O Terroir' },
  { key: 'vintageStory', title: 'A Safra' },
  { key: 'labelStory', title: 'O Rótulo' },
  { key: 'technicalSheet', title: 'Ficha Técnica' },
  { key: 'agingPotential', title: 'Potencial de Guarda' },
  { key: 'drinkingWindow', title: 'Janela Ideal de Consumo' },
  { key: 'buyingRationale', title: 'Racional de Compra' },
];

function toDisplay(
  report: DomainWineReport | ApiWineReport,
): DisplayReport {
  if ('producer_story' in report) {
    return {
      producerStory: report.producer_story,
      terroir: report.terroir,
      vintageStory: report.vintage_story,
      labelStory: report.label_story,
      technicalSheet: report.technical_sheet,
      agingPotential: report.aging_potential,
      drinkingWindow: report.drinking_window,
      pairings: report.pairings,
      buyingRationale: report.buying_rationale,
    };
  }
  return report;
}

type Props = {
  report?: DomainWineReport | ApiWineReport | null;
  tastingNotes?: string | null;
  pairingNotes?: string | null;
};

export function WineReportView({
  report,
  tastingNotes,
  pairingNotes,
}: Props) {
  if (report) {
    const display = toDisplay(report);
    return (
      <View>
        {REPORT_SECTIONS.map(({ key, title }) => {
          const text = display[key];
          if (!text?.trim()) return null;
          return (
            <View key={key}>
              <Text style={styles.section}>{title}</Text>
              <Text style={styles.body}>{text}</Text>
            </View>
          );
        })}

        {display.pairings.length > 0 ? (
          <>
            <Text style={styles.section}>Harmonizações</Text>
            {display.pairings.map((pairing, i) => (
              <Text key={`pairing-${i}`} style={styles.pairingItem}>
                {i + 1}. {pairing}
              </Text>
            ))}
          </>
        ) : null}
      </View>
    );
  }

  return (
    <View>
      {tastingNotes ? (
        <>
          <Text style={styles.section}>Notas de prova</Text>
          <Text style={styles.body}>{tastingNotes}</Text>
        </>
      ) : null}
      {pairingNotes ? (
        <>
          <Text style={styles.section}>Harmonização</Text>
          <Text style={styles.body}>{pairingNotes}</Text>
        </>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  section: {
    marginTop: 24,
    fontFamily: 'DMSans_500Medium',
    fontSize: 11,
    letterSpacing: 1.6,
    textTransform: 'uppercase',
    color: colors.muted,
  },
  body: {
    marginTop: 8,
    fontFamily: 'DMSans_400Regular',
    fontSize: 15,
    lineHeight: 24,
    color: colors.ink,
  },
  pairingItem: {
    marginTop: 8,
    fontFamily: 'DMSans_400Regular',
    fontSize: 15,
    lineHeight: 24,
    color: colors.ink,
  },
});
