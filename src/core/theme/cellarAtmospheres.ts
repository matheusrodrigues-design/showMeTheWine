import type { CellarType } from '@/domain/entities/Cellar';

export interface CellarAtmosphere {
  gradient: readonly [string, string, string];
  overlay: string;
  eyebrow: string;
}

/**
 * Atmosferas visuais por tipo de adega.
 * Gradientes premium locais (sem dependência de CDN) para transição suave e offline-safe.
 */
export const CELLAR_ATMOSPHERES: Record<CellarType, CellarAtmosphere> = {
  climatizada: {
    gradient: ['#1A0A0E', '#4A0E17', '#0D0D0D'],
    overlay: 'rgba(18,18,18,0.35)',
    eyebrow: 'Controle térmico preciso',
  },
  subterranea: {
    gradient: ['#0B1210', '#1A2A22', '#0A0A0A'],
    overlay: 'rgba(18,18,18,0.4)',
    eyebrow: 'Frescura da terra',
  },
  armario: {
    gradient: ['#1C1410', '#3A2A1C', '#121212'],
    overlay: 'rgba(18,18,18,0.45)',
    eyebrow: 'Proximidade e ritual',
  },
  adega_natural: {
    gradient: ['#101810', '#24301C', '#0E0E0E'],
    overlay: 'rgba(18,18,18,0.4)',
    eyebrow: 'Envelhecimento orgânico',
  },
  garrafeira: {
    gradient: ['#141018', '#2A1830', '#121212'],
    overlay: 'rgba(18,18,18,0.42)',
    eyebrow: 'Coleção de raridades',
  },
};
