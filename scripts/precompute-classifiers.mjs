// ABOUTME: 预计算初步分类页的全部模型参数（固定数据集，一次性运行）
// 运行：node scripts/precompute-classifiers.mjs
// 产物：src/data/classifier-models.json
// 模型定义：
//   单特征 → 1 层决策树：遍历相邻值中点，选加权 gini 最小的切分；x<=cutoff 走左叶(多数类)。
//   双特征 → OLS：最小二乘拟合 0/1 标签 ŷ = b + w1*x1 + w2*x2；ŷ>=0.5 判为类 1。
// 评估：全部在训练数据（2007+2008）上完成，并输出训练集准确率与混淆矩阵。
import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const raw = JSON.parse(readFileSync(join(ROOT, 'src/data/penguins.json'), 'utf8'));
const train = raw.records.filter((r) => r.year === 2007 || r.year === 2008);
const FEATURES = ['billLength', 'billDepth', 'flipper', 'mass'];

const round = (v, d) => Number(v.toFixed(d));
const pairs = () => {
  const out = [];
  for (let i = 0; i < FEATURES.length; i++) {
    for (let j = i + 1; j < FEATURES.length; j++) out.push([FEATURES[i], FEATURES[j]]);
  }
  return out;
};

function gini(rows) {
  const n = rows.length;
  if (n === 0) return 0;
  const p1 = rows.reduce((s, r) => s + r.y, 0) / n;
  return 1 - p1 * p1 - (1 - p1) * (1 - p1);
}

function confusion(rows, predict) {
  // cm[真实][预测]，类 0 / 类 1；misIds = 被判错记录在模型子集内的序号（供前端在图上标红圈）
  const cm = [
    [0, 0],
    [0, 0],
  ];
  let correct = 0;
  const misIds = [];
  for (let i = 0; i < rows.length; i++) {
    const r = rows[i];
    const p = predict(r);
    cm[r.y][p] += 1;
    if (p === r.y) correct += 1;
    else misIds.push(i);
  }
  const n = rows.length;
  return { n, correct, accuracy: round(correct / n, 4), cm, misIds };
}

/** 1 层决策树：返回 cutoff / 左右叶类别 / 训练准确率 / 混淆矩阵 */
function tree(rows, feat) {
  const pts = rows.map((r) => ({ x: r[feat], y: r.y })).sort((a, b) => a.x - b.x);
  const vals = [...new Set(pts.map((p) => p.x))];
  let best = null;
  for (let i = 0; i < vals.length - 1; i++) {
    const t = (vals[i] + vals[i + 1]) / 2;
    const L = pts.filter((p) => p.x <= t);
    const R = pts.filter((p) => p.x > t);
    const g = (L.length * gini(L) + R.length * gini(R)) / pts.length;
    if (!best || g < best.g) best = { t, g };
  }
  const L = pts.filter((p) => p.x <= best.t);
  const R = pts.filter((p) => p.x > best.t);
  const maj = (arr) => {
    const ones = arr.reduce((s, p) => s + p.y, 0);
    return ones >= arr.length / 2 ? 1 : 0;
  };
  const leftClass = maj(L);
  const rightClass = maj(R);
  const res = confusion(pts, (p) => (p.x <= best.t ? leftClass : rightClass));
  return {
    cutoff: round(best.t, 2),
    leftClass,
    rightClass,
    ...res,
  };
}

/** 3x3 高斯消元（部分主元），返回解向量；奇异返回 null */
function solve3(A, b) {
  const M = A.map((row, i) => [...row, b[i]]);
  for (let c = 0; c < 3; c++) {
    let piv = c;
    for (let r = c + 1; r < 3; r++) if (Math.abs(M[r][c]) > Math.abs(M[piv][c])) piv = r;
    if (Math.abs(M[piv][c]) < 1e-10) return null;
    [M[c], M[piv]] = [M[piv], M[c]];
    for (let r = 0; r < 3; r++) {
      if (r === c) continue;
      const f = M[r][c] / M[c][c];
      for (let k = c; k <= 3; k++) M[r][k] -= f * M[c][k];
    }
  }
  return M.map((row, i) => row[3] / row[i]);
}

/** 双特征 OLS 分类器（最小二乘拟合 0/1 标签，0.5 cutoff） */
function ols(rows, f1, f2) {
  const pts = rows.map((r) => ({ a: r[f1], b: r[f2], y: r.y }));
  const s = (fn) => pts.reduce((acc, p) => acc + fn(p), 0);
  const A = [
    [pts.length, s((p) => p.a), s((p) => p.b)],
    [s((p) => p.a), s((p) => p.a * p.a), s((p) => p.a * p.b)],
    [s((p) => p.b), s((p) => p.a * p.b), s((p) => p.b * p.b)],
  ];
  const bv = [s((p) => p.y), s((p) => p.a * p.y), s((p) => p.b * p.y)];
  const sol = solve3(A, bv);
  if (!sol) throw new Error(`OLS singular for ${f1}+${f2}`);
  const [b0, w1, w2] = sol;
  const pred = (p) => (b0 + w1 * p.a + w2 * p.b >= 0.5 ? 1 : 0);
  const res = confusion(pts, pred);
  return { w: [round(w1, 6), round(w2, 6)], b: round(b0, 6), ...res };
}

function buildTask(name, classes, pickRows) {
  const rows = pickRows();
  const treeOut = {};
  for (const f of FEATURES) treeOut[f] = tree(rows, f);
  const olsOut = {};
  for (const [f1, f2] of pairs()) olsOut[`${f1}+${f2}`] = ols(rows, f1, f2);
  console.log(`\n[${name}] 样本 n=${rows.length} 类别=${classes.join(' / ')}`);
  for (const f of FEATURES) {
    const t = treeOut[f];
    console.log(
      `  tree ${f.padEnd(10)} cutoff=${String(t.cutoff).padStart(8)}  left=${t.leftClass} right=${t.rightClass}  acc=${t.accuracy}  cm=${JSON.stringify(t.cm)}`,
    );
  }
  for (const k of Object.keys(olsOut)) {
    const m = olsOut[k];
    console.log(`  ols  ${k.padEnd(24)} w=[${m.w}] b=${m.b}  acc=${m.accuracy}  cm=${JSON.stringify(m.cm)}`);
  }
  return { classes, n: rows.length, tree: treeOut, ols: olsOut };
}

const result = {
  meta: {
    source: 'Palmer Penguins LTER（2007-2008 训练数据）',
    treeRule: 'x <= cutoff → 左叶类别；x > cutoff → 右叶类别',
    olsRule: 'ŷ = b + w1*x1 + w2*x2；ŷ >= 0.5 → 类别 1',
  },
  species: buildTask(
    'species（Adelie=0 vs Chinstrap=1）',
    ['Adelie', 'Chinstrap'],
    () =>
      train
        .filter((r) => (r.species === 'Adelie' || r.species === 'Chinstrap') && FEATURES.every((f) => r[f] !== null))
        .map((r) => ({ ...r, y: r.species === 'Chinstrap' ? 1 : 0 })),
  ),
  sex: buildTask(
    'sex（female=0 vs male=1，三物种混合）',
    ['female', 'male'],
    () =>
      train
        .filter((r) => r.sex !== null && FEATURES.every((f) => r[f] !== null))
        .map((r) => ({ ...r, y: r.sex === 'male' ? 1 : 0 })),
  ),
};

const outPath = join(ROOT, 'src/data/classifier-models.json');
writeFileSync(outPath, `${JSON.stringify(result, null, 2)}\n`);
console.log(`\nwritten -> ${outPath}`);
