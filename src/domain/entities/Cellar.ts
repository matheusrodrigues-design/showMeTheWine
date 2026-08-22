export const CELLAR_TYPES = [
  'climatizada',
  'subterranea',
  'armario',
  'adega_natural',
  'garrafeira',
] as const;

export type CellarType = (typeof CELLAR_TYPES)[number];

export interface Cellar {
  id: string;
  userId: string;
  name: string;
  type: CellarType;
  capacity: number;
  createdAt: string;
  updatedAt: string;
}

export interface CellarWine {
  id: string;
  cellarId: string;
  wineCacheId: string;
  quantity: number;
  notes: string | null;
  wine?: Wine;
}

export interface WineReport {
  producerStory: string;
  terroir: string;
  vintageStory: string;
  labelStory: string;
  technicalSheet: string;
  sensoryAnalysis?: string;
  oakInfluence?: string;
  tanninLevel?: string;
  agingPotential: string;
  drinkingWindow: string;
  pairings: string[];
  buyingRationale: string;
}

export interface Wine {
  id: string;
  name: string;
  normalizedName: string;
  producer: string | null;
  vintage: number | null;
  region: string | null;
  country: string | null;
  grapeVariety: string | null;
  wineType: string | null;
  tastingNotes: string | null;
  pairingNotes: string | null;
  alcoholPct: number | null;
  servingTempC: number | null;
  report?: WineReport;
}

export const CELLAR_TYPE_LABELS: Record<CellarType, string> = {
  climatizada: 'Climatizada',
  subterranea: 'Subterrânea',
  armario: 'Armário',
  adega_natural: 'Adega Natural',
  garrafeira: 'Garrafeira',
};
