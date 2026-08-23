import type { ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';
import Svg, { Path } from 'react-native-svg';
import { colors } from '@/core/theme/colors';

type SensoryKind = 'visual' | 'olfactory' | 'palate';

const ink = colors.ink;

function StrokeIcon({
  children,
  label,
}: {
  children: ReactNode;
  label: string;
}) {
  return (
    <View style={styles.wrap} accessibilityLabel={label} accessibilityRole="image">
      <Svg width={22} height={22} viewBox="0 0 24 24" fill="none">
        {children}
      </Svg>
    </View>
  );
}

function EyeIcon() {
  return (
    <StrokeIcon label="olho">
      {/* Iconoir eye — linha fina, reconhece de imediato */}
      <Path
        d="M3 13C6.6 5 17.4 5 21 13"
        stroke={ink}
        strokeWidth={1.5}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <Path
        d="M12 17a3 3 0 1 0 0-6 3 3 0 0 0 0 6Z"
        stroke={ink}
        strokeWidth={1.5}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </StrokeIcon>
  );
}

function NoseIcon() {
  return (
    <StrokeIcon label="nariz">
      <Path
        d="M9.2 4.8c.15 3.4-.15 6.6-.95 9.15-.7 2.2-.35 4.05 1.55 4.85 1.15.5 2.35.7 3.2.7s2.05-.2 3.2-.7c1.9-.8 2.25-2.65 1.55-4.85-.8-2.55-1.1-5.75-.95-9.15"
        stroke={ink}
        strokeWidth={1.5}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <Path
        d="M8.6 16.15h2.15M13.25 16.15H15.4"
        stroke={ink}
        strokeWidth={1.5}
        strokeLinecap="round"
      />
    </StrokeIcon>
  );
}

function MouthIcon() {
  return (
    <StrokeIcon label="boca">
      <Path
        d="M4.4 12.6c2.7-2.15 5.3-2.85 7.6-2.85s4.9.7 7.6 2.85"
        stroke={ink}
        strokeWidth={1.5}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <Path
        d="M4.4 12.6c2.5 2.9 5.2 4.05 7.6 4.05s5.1-1.15 7.6-4.05"
        stroke={ink}
        strokeWidth={1.5}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <Path
        d="M7.1 13.15c1.6 1.35 3.25 1.9 4.9 1.9s3.3-.55 4.9-1.9"
        stroke={ink}
        strokeWidth={1.5}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </StrokeIcon>
  );
}

export function SensoryGlyph({ kind }: { kind: SensoryKind }) {
  if (kind === 'visual') return <EyeIcon />;
  if (kind === 'olfactory') return <NoseIcon />;
  return <MouthIcon />;
}

const styles = StyleSheet.create({
  wrap: {
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: ink,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'transparent',
  },
});
