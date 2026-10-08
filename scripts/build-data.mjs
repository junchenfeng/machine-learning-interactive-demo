// ABOUTME: 将 Palmer Penguins CSV 转为前端 JSON，并计算物种统计表
// 用法: node scripts/build-data.mjs
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, '..');
const csv = readFileSync(join(root, 'scripts', 'penguins.csv'), 'utf-8');

const numOrNull = (v) => {
  const t = String(v ?? '').trim();
  if (!t || t === 'NA' || t === 'na' || Number.isNaN(Number(t))) return null;
  return Number(t);
};
const strOrNull = (v) => {
  const t = String(v ?? '').trim();
  return !t || t === 'NA' ? null : t;
};

const lines = csv.trim().split('\n');
const header = lines[0].split(',').map((h) => h.trim());
const idx = (name) => header.indexOf(name);

const records = [];
for (let i = 1; i < lines.length; i++) {
  const cols = lines[i].split(',').map((c) => c.trim());
  if (cols.length < header.length) continue;
  const rec = {
    species: strOrNull(cols[idx('species')]),
    island: strOrNull(cols[idx('island')]),
    billLength: numOrNull(cols[idx('bill_length_mm')]),
    billDepth: numOrNull(cols[idx('bill_depth_mm')]),
    flipper: numOrNull(cols[idx('flipper_length_mm')]),
    mass: numOrNull(cols[idx('body_mass_g')]),
    sex: strOrNull(cols[idx('sex')]),
    year: numOrNull(cols[idx('year')]),
  };
  if (rec.species && rec.year) records.push(rec);
}

const SPECIES = ['Adelie', 'Chinstrap', 'Gentoo'];
const FEATURES = [
  { key: 'billLength', field: 'bill_length_mm' },
  { key: 'billDepth', field: 'bill_depth_mm' },
  { key: 'flipper', field: 'flipper_length_mm' },
  { key: 'mass', field: 'body_mass_g' },
];

const meanSd = (arr) => {
  const vals = arr.filter((v) => v !== null);
  const n = vals.length;
  if (n === 0) return { mean: null, sd: null, n: 0 };
  const mean = vals.reduce((a, b) => a + b, 0) / n;
  const variance = n > 1 ? vals.reduce((a, b) => a + (b - mean) ** 2, 0) / (n - 1) : 0;
  return { mean, sd: Math.sqrt(variance), n };
};

const stats = {};
for (const sp of SPECIES) {
  const rows = records.filter((r) => r.species === sp);
  const item = {
    n: rows.length,
    female: rows.filter((r) => r.sex === 'female').length,
    male: rows.filter((r) => r.sex === 'male').length,
  };
  for (const f of FEATURES) {
    const m = meanSd(rows.map((r) => r[f.key]));
    item[f.key] = {
      mean: m.mean !== null ? Number(m.mean.toFixed(1)) : null,
      sd: m.sd !== null ? Number(m.sd.toFixed(1)) : null,
      n: m.n,
    };
  }
  stats[sp] = item;
}

const yearCount = (y) => records.filter((r) => r.year === y).length;
const counts = {
  total: records.length,
  train: records.filter((r) => r.year === 2007 || r.year === 2008).length,
  test: yearCount(2009),
  y2007: yearCount(2007),
  y2008: yearCount(2008),
  y2009: yearCount(2009),
  bySpecies: Object.fromEntries(SPECIES.map((sp) => [sp, records.filter((r) => r.species === sp).length])),
  sexMissing: records.filter((r) => r.sex === null).length,
};

const out = { records, stats, counts };
const outDir = join(root, 'src', 'data');
mkdirSync(outDir, { recursive: true });
writeFileSync(join(outDir, 'penguins.json'), JSON.stringify(out));

console.log(`records: ${records.length}`);
console.log(`counts: ${JSON.stringify(counts)}`);
console.log(`stats: ${JSON.stringify(stats)}`);
