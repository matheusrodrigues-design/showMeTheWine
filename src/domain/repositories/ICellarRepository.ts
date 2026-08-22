import type { Cellar, CellarType, CellarWine } from '@/domain/entities/Cellar';

export interface CreateCellarInput {
  name: string;
  type: CellarType;
  capacity?: number;
}

export interface AddWineToCellarInput {
  cellarId: string;
  wineCacheId: string;
  quantity: number;
  notes?: string | null;
}

export interface ICellarRepository {
  listCellars(): Promise<Cellar[]>;
  createCellar(input: CreateCellarInput): Promise<Cellar>;
  updateCellarType(cellarId: string, type: CellarType): Promise<Cellar>;
  listCellarWines(cellarId: string): Promise<CellarWine[]>;
  addWineToCellar(input: AddWineToCellarInput): Promise<CellarWine>;
}
