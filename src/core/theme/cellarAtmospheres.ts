import type { CellarType } from '@/domain/entities/Cellar';

export interface CellarAtmosphere {
  gradient: readonly [string, string, string];
  overlay: string;
  eyebrow: string;
}

/**
 * Atmosferas visuais por tipo de adega — tons claros que combinam com a logo bordô.
 */
export const CELLAR_ATMOSPHERES: Record<CellarType, CellarAtmosphere> = {
  climatizada: {
    gradient: ['#F7F1EB', '#E8D4D0', '#EFE6DE'],
    overlay: 'rgba(247,241,235,0.15)',
    eyebrow: 'Controle térmico preciso',
  },
  subterranea: {
    gradient: ['#F4F1EB', '#D8E0D6', '#EFE6DE'],
    overlay: 'rgba(247,241,235,0.2)',
    eyebrow: 'Frescura da terra',
  },
  armario: {
    gradient: ['#F7F1EB', '#E5D8C8', '#EFE6DE'],
    overlay: 'rgba(247,241,235,0.18)',
    eyebrow: 'Proximidade e ritual',
  },
  adega_natural: {
    gradient: ['#F4F6F0', '#D6E0D0', '#EFE6DE'],
    overlay: 'rgba(247,241,235,0.2)',
    eyebrow: 'Envelhecimento orgânico',
  },
  garrafeira: {
    gradient: ['#F6F0F4', '#E0D0DC', '#EFE6DE'],
    overlay: 'rgba(247,241,235,0.18)',
    eyebrow: 'Coleção de raridades',
  },
};
