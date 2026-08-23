import { StyleSheet, Text, View } from 'react-native';
import { colors } from '@/core/theme/colors';
import type { WineReport as DomainWineReport } from '@/domain/entities/Cellar';
import type { WineReport as ApiWineReport } from '@/data/schemas/wine';
import { SensoryGlyph } from '@/presentation/components/SensoryGlyph';
import { ReportErrorButton } from '@/presentation/components/ReportErrorButton';

type DisplayReport = {
  producerStory: string;
  terroir: string;
  vintageStory: string;
  labelStory: string;
  technicalSheet: string;
  sensoryAnalysis?: string;
  visualAnalysis?: string;
  olfactoryAnalysis?: string;
  palateAnalysis?: string;
  oakInfluence?: string;
  tanninLevel?: string;
  agingPotential: string;
  drinkingWindow: string;
  pairings: string[];
  buyingRationale: string;
};

type ReportTextKey = Exclude<
  keyof DisplayReport,
  | 'pairings'
  | 'sensoryAnalysis'
  | 'visualAnalysis'
  | 'olfactoryAnalysis'
  | 'palateAnalysis'
>;

const REPORT_SECTIONS: { key: ReportTextKey; title: string }[] = [
  { key: 'producerStory', title: 'O Produtor' },
  { key: 'terroir', title: 'O Terroir' },
  { key: 'vintageStory', title: 'A Safra' },
  { key: 'labelStory', title: 'O Rótulo' },
  { key: 'technicalSheet', title: 'Ficha Técnica' },
  { key: 'oakInfluence', title: 'Passagem por Madeira' },
  { key: 'tanninLevel', title: 'Nível de Tanino' },
  { key: 'agingPotential', title: 'Potencial de Guarda' },
  { key: 'drinkingWindow', title: 'Janela Ideal de Consumo' },
  { key: 'buyingRationale', title: 'Racional de Compra' },
];

const BEFORE_SENSORY: ReportTextKey[] = [
  'producerStory',
  'terroir',
  'vintageStory',
  'labelStory',
  'technicalSheet',
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
      sensoryAnalysis: report.sensory_analysis,
      visualAnalysis: report.visual_analysis,
      olfactoryAnalysis: report.olfactory_analysis,
      palateAnalysis: report.palate_analysis,
      oakInfluence: report.oak_influence,
      tanninLevel: report.tannin_level,
      agingPotential: report.aging_potential,
      drinkingWindow: report.drinking_window,
      pairings: report.pairings,
      buyingRationale: report.buying_rationale,
    };
  }
  return report;
}

function Section({ title, text }: { title: string; text?: string }) {
  if (!text?.trim()) return null;
  return (
    <View>
      <Text style={styles.section}>{title}</Text>
      <Text style={styles.body}>{text}</Text>
    </View>
  );
}

function SensoryBlock({
  kind,
  label,
  text,
}: {
  kind: 'visual' | 'olfactory' | 'palate';
  label: string;
  text?: string;
}) {
  if (!text?.trim()) return null;
  return (
    <View style={styles.sensoryRow}>
      <SensoryGlyph kind={kind} />
      <View style={styles.sensoryCopy}>
        <Text style={styles.sensoryLabel}>{label}</Text>
        <Text style={styles.body}>{text}</Text>
      </View>
    </View>
  );
}

type Props = {
  report?: DomainWineReport | ApiWineReport | null;
  tastingNotes?: string | null;
  pairingNotes?: string | null;
  wineName?: string;
  wineCacheId?: string | null;
  grapeVariety?: string | null;
};

export function WineReportView({
  report,
  tastingNotes,
  pairingNotes,
  wineName,
  wineCacheId,
  grapeVariety,
}: Props) {
  if (report) {
    const display = toDisplay(report);
    const hasSplitSensory = Boolean(
      display.visualAnalysis?.trim() ||
        display.olfactoryAnalysis?.trim() ||
        display.palateAnalysis?.trim(),
    );
    const hasSensory =
      hasSplitSensory || Boolean(display.sensoryAnalysis?.trim());

    return (
      <View>
        {REPORT_SECTIONS.filter((s) => BEFORE_SENSORY.includes(s.key)).map(
          ({ key, title }) => (
            <Section key={key} title={title} text={display[key]} />
          ),
        )}

        {hasSensory ? (
          <View>
            <Text style={styles.section}>Análise Sensorial</Text>
            {hasSplitSensory ? (
              <>
                <SensoryBlock
                  kind="visual"
                  label="Visual"
                  text={display.visualAnalysis}
                />
                <SensoryBlock
                  kind="olfactory"
                  label="Olfativa"
                  text={display.olfactoryAnalysis}
                />
                <SensoryBlock
                  kind="palate"
                  label="Paladar"
                  text={display.palateAnalysis}
                />
              </>
            ) : (
              <Text style={styles.body}>{display.sensoryAnalysis}</Text>
            )}
          </View>
        ) : null}

        {REPORT_SECTIONS.filter((s) => !BEFORE_SENSORY.includes(s.key)).map(
          ({ key, title }) => (
            <Section key={key} title={title} text={display[key]} />
          ),
        )}

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

        {wineName ? (
          <ReportErrorButton
            wineName={wineName}
            wineCacheId={wineCacheId}
            grapeVariety={grapeVariety}
          />
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
      {wineName ? (
        <ReportErrorButton
          wineName={wineName}
          wineCacheId={wineCacheId}
          grapeVariety={grapeVariety}
        />
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
  sensoryRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    marginTop: 16,
  },
  sensoryCopy: {
    flex: 1,
  },
  sensoryLabel: {
    fontFamily: 'DMSans_500Medium',
    fontSize: 12,
    letterSpacing: 1.2,
    textTransform: 'uppercase',
    color: colors.bordoux,
  },
});
