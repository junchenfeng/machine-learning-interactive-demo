import penguinsJson from './penguins.json';
import type { FeatureKey, PenguinData, PenguinRecord, Sex, Species } from './types';

const raw = penguinsJson as unknown as PenguinData;
export const data = raw;

/** 训练数据：2007 + 2008 年（2009 年为测试集，本阶段仅展示训练数据） */
export const trainRecords: PenguinRecord[] = raw.records.filter(
  (r) => r.year === 2007 || r.year === 2008,
);

/**
 * 初步分类页模型子集：与预计算脚本（scripts/precompute-classifiers.mjs）的过滤与顺序严格一致，
 * classifier-models.json 中的 misIds（被判错序号）按此数组对位。
 */
export const classifySpeciesRows: PenguinRecord[] = trainRecords.filter(
  (r) =>
    (r.species === 'Adelie' || r.species === 'Chinstrap') &&
    r.billLength !== null &&
    r.billDepth !== null &&
    r.flipper !== null &&
    r.mass !== null,
);

export const classifySexRows: PenguinRecord[] = trainRecords.filter(
  (r) =>
    r.sex !== null &&
    r.billLength !== null &&
    r.billDepth !== null &&
    r.flipper !== null &&
    r.mass !== null,
);

export const ALL_SPECIES: Species[] = ['Adelie', 'Chinstrap', 'Gentoo'];

export interface SpeciesMeta {
  cn: string;
  color: string;
  symbol: 'circle' | 'triangle' | 'rect';
  symbolLabel: string;
  latin: string;
  tagline: string;
  traits: string[];
  fact: string;
  islands: string;
  image: string;
}

export const SPECIES_META: Record<Species, SpeciesMeta> = {
  Adelie: {
    cn: '阿德利企鹅',
    color: '#3D6FB4',
    symbol: 'circle',
    symbolLabel: '圆点',
    latin: 'Pygoscelis adeliae',
    tagline: '戴着白色"眼圈"的小个子',
    traits: [
      '整个头部纯黑，只有一圈白色眼环，像画了白色眼线',
      '嘴短，通体黑色；体型是三种中最小的',
      '性情活泼好奇，常主动靠近科考队员',
    ],
    fact: '筑巢时会精心挑选小石子，还会偷偷从邻居家"借"石头。',
    islands: '三座岛上都能见到',
    image: '/adelie.jpg',
  },
  Chinstrap: {
    cn: '帽带企鹅',
    color: '#16A34A',
    symbol: 'triangle',
    symbolLabel: '三角',
    latin: 'Pygoscelis antarcticus',
    tagline: '下巴系着一条黑色"帽带"',
    traits: [
      '白色脸颊上有一条细黑线横过下巴，像系紧的安全帽带',
      '因此得名"帽带企鹅"（也叫纹颊企鹅）',
      '喜欢在陡峭的岩石坡上筑巢',
    ],
    fact: '叫声嘈杂，一群聚在一起像热闹的集市，所以英文昵称"stonecracker"。',
    islands: '主要分布在 Dream 岛',
    image: '/chinstrap.jpg',
  },
  Gentoo: {
    cn: '巴布亚企鹅',
    color: '#7FA53C',
    symbol: 'rect',
    symbolLabel: '方块',
    latin: 'Pygoscelis papua',
    tagline: '顶着白色"头巾"的大块头',
    traits: [
      '头顶有一条白色宽带，像戴了白色头巾（或白眉）',
      '橙红色的嘴和脚蹼，在三种中最醒目',
      '体型最大，体重明显超过另外两种',
    ],
    fact: '水下冲刺速度可达 36 km/h，是企鹅家族中的"游泳冠军"。',
    islands: '主要分布在 Biscoe 岛',
    image: '/gentoo.jpg',
  },
};

export interface FeatureMeta {
  key: FeatureKey;
  label: string;
  field: string;
  unit: string;
  axis: string;
  decimals: number;
}

export const FEATURES: FeatureMeta[] = [
  { key: 'billLength', label: '嘴的长度', field: 'bill_length_mm', unit: '毫米', axis: '嘴的长度（毫米）', decimals: 1 },
  { key: 'billDepth', label: '嘴的厚度', field: 'bill_depth_mm', unit: '毫米', axis: '嘴的厚度（毫米）', decimals: 1 },
  { key: 'flipper', label: '翅膀长度', field: 'flipper_length_mm', unit: '毫米', axis: '翅膀长度（毫米）', decimals: 0 },
  { key: 'mass', label: '体重', field: 'body_mass_g', unit: '克', axis: '体重（克）', decimals: 0 },
];

export const SEX_META: Record<Sex, { label: string; color: string }> = {
  female: { label: '母企鹅', color: '#16A34A' },
  male: { label: '公企鹅', color: '#2F5D8A' },
};

export function getFeatureValue(r: PenguinRecord, key: FeatureKey): number | null {
  return r[key];
}

export function formatNumber(v: number, decimals = 0): string {
  return v.toLocaleString('en-US', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
}
