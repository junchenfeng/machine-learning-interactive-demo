export type Species = 'Adelie' | 'Chinstrap' | 'Gentoo';
export type Sex = 'female' | 'male';
export type FeatureKey = 'billLength' | 'billDepth' | 'flipper' | 'mass';

export interface PenguinRecord {
  species: Species;
  island: string | null;
  billLength: number | null;
  billDepth: number | null;
  flipper: number | null;
  mass: number | null;
  sex: Sex | null;
  year: number;
}

export interface VarStat {
  mean: number | null;
  sd: number | null;
  n: number;
}

export interface SpeciesStat {
  n: number;
  female: number;
  male: number;
  billLength: VarStat;
  billDepth: VarStat;
  flipper: VarStat;
  mass: VarStat;
}

export interface DataCounts {
  total: number;
  train: number;
  test: number;
  y2007: number;
  y2008: number;
  y2009: number;
  bySpecies: Record<Species, number>;
  sexMissing: number;
}

export interface PenguinData {
  records: PenguinRecord[];
  stats: Record<Species, SpeciesStat>;
  counts: DataCounts;
}
