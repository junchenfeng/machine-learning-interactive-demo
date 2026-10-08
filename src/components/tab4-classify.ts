// ABOUTME: Tab4 初步分类：复用探索分析布局，左散点图（含分界线与误判红圈）+ 右准确率/混淆矩阵
// 全部参数来自预计算（scripts/precompute-classifiers.mjs），页面只查表渲染；教学上不出现任何算法名词
import { FEATURES, SPECIES_META, SEX_META, classifySexRows, classifySpeciesRows } from '../data/dataset';
import modelsJson from '../data/classifier-models.json';
import { ExploreChart, legendHTML, symbolSvg } from '../charts/penguin-chart';
import { featureKeys, featureRowHtml, handleFeatureClick } from './feature-picker';
import type { DecisionLine, ExploreMode } from '../charts/penguin-chart';
import type { FeatureKey, PenguinRecord } from '../data/types';

interface Cell {
  n: number;
  correct: number;
  accuracy: number;
  cm: [[number, number], [number, number]];
  /** 被判错记录在模型子集内的序号 */
  misIds: number[];
}

interface TreeModel extends Cell {
  cutoff: number;
  leftClass: 0 | 1;
  rightClass: 0 | 1;
}

interface OlsModel extends Cell {
  w: [number, number];
  b: number;
}

interface TaskModels {
  classes: string[];
  n: number;
  tree: Record<FeatureKey, TreeModel>;
  ols: Record<string, OlsModel>;
}

interface ClassifierModels {
  species: TaskModels;
  sex: TaskModels;
}

const MODELS = modelsJson as unknown as ClassifierModels;

/** 与预计算脚本严格对应的模型子集 */
const TASK_ROWS: Record<ExploreMode, PenguinRecord[]> = {
  species: classifySpeciesRows,
  sex: classifySexRows,
};

interface ClassifyState {
  mode: ExploreMode;
  /** 特征1：必选，radio 语义，当作横轴 */
  f1: FeatureKey;
  /** 特征2：可选，当作纵轴；不选则只做"一刀切" */
  f2: FeatureKey | null;
  chart: ExploreChart | null;
}

export interface ClassifyTab {
  onShow: () => void;
}

const QA_CLASSES = ['border-beak', 'bg-beak-soft', 'shadow-card-hover'];
const QI_CLASSES = ['border-polar-200', 'bg-white', 'hover:border-polar-300'];
const FEATURE_ORDER = FEATURES.map((f) => f.key);
const MIS_COLOR = '#E11D48';

function questionCardHtml(id: string, title: string, desc: string, marks: string, note: string): string {
  return `
    <button type="button" data-question="${id}" aria-pressed="false"
      class="question-btn w-full rounded-2xl border-2 p-4 text-left transition-all md:p-5">
      <div class="flex items-start gap-3">
        <span class="mt-0.5 shrink-0">${marks}</span>
        <div class="min-w-0">
          <div class="text-[15px] font-black leading-snug">${title}</div>
          <div class="mt-1 text-[13px] leading-relaxed text-mist">${desc}</div>
        </div>
      </div>
      <div data-note class="mt-3 inline-flex rounded-md bg-polar-100 px-2 py-1 text-[11px] font-bold text-polar-700">${note}</div>
    </button>`;
}

/** 类别中文名（短，用于矩阵表头） */
function shortName(mode: ExploreMode, ci: 0 | 1): string {
  if (mode === 'species') return ci === 0 ? '阿德利' : '帽带';
  return ci === 0 ? '母' : '公';
}

/** 类别中文名（全称） */
function fullName(mode: ExploreMode, ci: 0 | 1): string {
  if (mode === 'species') return ci === 0 ? '阿德利企鹅' : '帽带企鹅';
  return ci === 0 ? '母企鹅' : '公企鹅';
}

/** 当前研究问题要分开的两类（连称） */
function pairName(mode: ExploreMode): string {
  return mode === 'species' ? '阿德利企鹅和帽带企鹅' : '母企鹅和公企鹅';
}

/** 分界线线段：b + w1*x + w2*y = 0.5，裁剪到数据范围（扩 12%）内；不相交返回 null */
function olsSegment(
  model: OlsModel,
  fx: FeatureKey,
  fy: FeatureKey,
  rows: PenguinRecord[],
): { x1: number; y1: number; x2: number; y2: number } | null {
  const xs = rows.map((r) => r[fx]).filter((v): v is number => v !== null);
  const ys = rows.map((r) => r[fy]).filter((v): v is number => v !== null);
  if (xs.length === 0 || ys.length === 0) return null;
  const span = (arr: number[]) => ({ min: Math.min(...arr), max: Math.max(...arr) });
  const sx = span(xs);
  const sy = span(ys);
  const pad = (s: { min: number; max: number }) => (s.max - s.min) * 0.12;
  const x0 = sx.min - pad(sx);
  const x1 = sx.max + pad(sx);
  const y0 = sy.min - pad(sy);
  const y1 = sy.max + pad(sy);
  const [w1, w2] = model.w;

  let px1: number;
  let py1: number;
  let px2: number;
  let py2: number;
  if (Math.abs(w2) < 1e-12) {
    px1 = (0.5 - model.b) / w1;
    py1 = y0;
    px2 = px1;
    py2 = y1;
  } else {
    px1 = x0;
    py1 = (0.5 - model.b - w1 * x0) / w2;
    px2 = x1;
    py2 = (0.5 - model.b - w1 * x1) / w2;
  }

  // Liang-Barsky 线段裁剪
  const dx = px2 - px1;
  const dy = py2 - py1;
  let t0 = 0;
  let t1 = 1;
  const checks: Array<[number, number]> = [
    [-dx, px1 - x0],
    [dx, x1 - px1],
    [-dy, py1 - y0],
    [dy, y1 - py1],
  ];
  for (const [p, q] of checks) {
    if (p === 0) {
      if (q < 0) return null;
      continue;
    }
    const t = q / p;
    if (p < 0) {
      if (t > t1) return null;
      if (t > t0) t0 = t;
    } else {
      if (t < t0) return null;
      if (t < t1) t1 = t;
    }
  }
  return { x1: px1 + t0 * dx, y1: py1 + t0 * dy, x2: px1 + t1 * dx, y2: py1 + t1 * dy };
}

export function renderClassify(container: HTMLElement): ClassifyTab {
  const state: ClassifyState = { mode: 'species', f1: 'billLength', f2: null, chart: null };

  container.innerHTML = `
    <div class="fade-up mb-7 flex items-start gap-4">
      <span class="mono-num flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-polar-800 text-sm font-bold text-white shadow-card">04</span>
      <div>
        <h2 class="text-xl font-black md:text-2xl">初步分类：让 AI 画一条分界线</h2>
        <p class="mt-1 max-w-3xl text-sm leading-relaxed text-mist">
          上一页我们用眼睛找规律，这一页换成 AI 来画：选 <b class="text-ink">1 个特征</b>，它自动找"一刀切"的位置；
          选 <b class="text-ink">2 个特征</b>，它自动画一条直线。画完马上汇报——<b class="text-ink">判对了多少</b>、
          <b class="text-ink">谁被判错了</b>。
        </p>
      </div>
    </div>

    <!-- 研究问题 -->
    <div class="fade-up grid gap-4 md:grid-cols-2">
      ${questionCardHtml(
        'species',
        '问题一 · 用一条线分开 Adelie 和 Chinstrap',
        '上一页我们用眼睛找规律；现在让 AI 自动画一条分界线，数数它分对了多少。',
        `<span class="flex items-center gap-0.5">${symbolSvg('circle', SPECIES_META.Adelie.color, 15)}${symbolSvg('triangle', SPECIES_META.Chinstrap.color, 15)}</span>`,
        '只用这两种企鹅',
      )}
      ${questionCardHtml(
        'sex',
        '问题二 · 用一条线分开公企鹅和母企鹅',
        '同种企鹅公母差别不大，三种企鹅混在一起分。这条线还能分对多少？',
        `<span class="flex items-center gap-0.5">${symbolSvg('triangle', SEX_META.female.color, 15)}${symbolSvg('circle', SEX_META.male.color, 15)}</span>`,
        '绿三角 = 母 · 蓝圆 = 公',
      )}
    </div>

    <!-- 特征选择 -->
    <div class="card fade-up mt-6 p-5 md:p-6">
      <div class="mb-4 flex flex-wrap items-center justify-between gap-2">
        <h3 class="text-[15px] font-black">用哪些特征来分？</h3>
        <span class="text-xs text-mist">特征1 必选、特征2 可不选：只选特征1 自动找"一刀切"，加上特征2 自动画直线</span>
      </div>
      <div class="flex flex-col gap-4">
        <div>
          <div class="mb-2 flex flex-wrap items-center gap-2">
            <span class="rounded-md bg-beak-soft px-2 py-0.5 text-[11px] font-black text-beak-dark">特征1 · 必选</span>
            <span class="text-[11.5px] text-mist">当作横轴；只选它时，AI 会在这条轴上找"一刀切"的位置</span>
          </div>
          <div id="feature-row-1" class="grid grid-cols-2 gap-2.5 md:grid-cols-4"></div>
        </div>
        <div>
          <div class="mb-2 flex flex-wrap items-center gap-2">
            <span class="rounded-md bg-polar-100 px-2 py-0.5 text-[11px] font-black text-polar-700">特征2 · 可选</span>
            <span class="text-[11.5px] text-mist">当作纵轴；不选就只有"一刀切"，注意不能和特征1 相同</span>
          </div>
          <div id="feature-row-2" class="grid grid-cols-2 gap-2.5 md:grid-cols-4"></div>
        </div>
      </div>
    </div>

    <!-- 主体：左图 + 右指标 -->
    <div class="card fade-up mt-6 p-5 md:p-6">
      <div id="classify-legend" class="legend-bar mb-4"></div>
      <div class="grid grid-cols-[minmax(0,1fr)_300px] gap-4">
        <div class="min-w-0">
          <div id="classify-chart" class="w-full" style="height:380px"></div>
          <p class="mt-3 text-xs leading-relaxed text-mist">
            图中每个点是一只企鹅（单特征图做了轻微上下抖动，便于看到重叠的数据）。
            <span class="font-bold text-beak-dark">橙色虚线 = AI 画的分界线</span>；
            <span class="font-bold" style="color:${MIS_COLOR}">红圈 = 被分错的企鹅</span>。数据：训练集（2007-2008）。
          </p>
        </div>
        <aside class="flex min-w-0 flex-col gap-4">
          <div id="model-rule" class="rounded-xl border border-polar-200 bg-polar-50 p-4"></div>
          <div id="accuracy-box" class="rounded-xl border border-polar-200 bg-white p-4"></div>
          <div id="confusion-box" class="rounded-xl border border-polar-200 bg-white p-4"></div>
        </aside>
      </div>
      <div class="mt-4 flex items-start gap-2.5 rounded-xl border border-dashed border-polar-300 bg-polar-50 px-4 py-3">
        <span class="mt-0.5 shrink-0 text-polar-500">
          <svg viewBox="0 0 24 24" class="h-4.5 w-4.5" fill="none" aria-hidden="true"><circle cx="10.5" cy="10.5" r="6" stroke="currentColor" stroke-width="2"/><path d="m15.5 15.5 4.5 4.5" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>
        </span>
        <p id="classify-hint" class="text-[13px] leading-relaxed text-polar-700"></p>
      </div>
    </div>
  `;

  const chartEl = container.querySelector<HTMLElement>('#classify-chart');
  const legendEl = container.querySelector<HTMLElement>('#classify-legend');
  const hintEl = container.querySelector<HTMLElement>('#classify-hint');
  const row1El = container.querySelector<HTMLElement>('#feature-row-1');
  const row2El = container.querySelector<HTMLElement>('#feature-row-2');
  const ruleEl = container.querySelector<HTMLElement>('#model-rule');
  const accEl = container.querySelector<HTMLElement>('#accuracy-box');
  const confusionEl = container.querySelector<HTMLElement>('#confusion-box');

  const qButtons: Record<ExploreMode, HTMLElement | null> = {
    species: container.querySelector<HTMLElement>('[data-question="species"]'),
    sex: container.querySelector<HTMLElement>('[data-question="sex"]'),
  };

  function currentModel():
    | { kind: 'tree'; model: TreeModel; feature: FeatureKey }
    | {
        kind: 'ols';
        model: OlsModel;
        fx: FeatureKey;
        fy: FeatureKey;
        hasLine: boolean;
        segment: { x1: number; y1: number; x2: number; y2: number } | null;
      } {
    const task = MODELS[state.mode];
    if (state.f2 === null) {
      const feature = state.f1;
      return { kind: 'tree', model: task.tree[feature], feature };
    }
    // 查表 key 必须用预计算脚本的 canonical 顺序（FEATURES 顺序）；
    // 但分界线要画在实际坐标轴上（特征1 = x、特征2 = y），
    // 因此显示顺序与 canonical 相反时交换 w 的两个分量，避免线与散点错位。
    const fx = state.f1;
    const fy = state.f2;
    const canonical = FEATURE_ORDER.indexOf(fx) < FEATURE_ORDER.indexOf(fy) ? [fx, fy] : [fy, fx];
    const raw = task.ols[`${canonical[0]}+${canonical[1]}`];
    const model: OlsModel = canonical[0] === fx ? raw : { ...raw, w: [raw.w[1], raw.w[0]] };
    const segment = olsSegment(model, fx, fy, TASK_ROWS[state.mode]);
    return { kind: 'ols', model, fx, fy, hasLine: segment !== null, segment };
  }

  function updateQuestions(): void {
    for (const mode of ['species', 'sex'] as ExploreMode[]) {
      const btn = qButtons[mode];
      if (!btn) continue;
      const active = state.mode === mode;
      btn.setAttribute('aria-pressed', String(active));
      for (const cls of QA_CLASSES) btn.classList.toggle(cls, active);
      for (const cls of QI_CLASSES) btn.classList.toggle(cls, !active);
      const note = btn.querySelector<HTMLElement>('[data-note]');
      if (note) {
        note.textContent =
          mode === 'species' ? `只用这两种企鹅 · n=${MODELS.species.n}` : `三种企鹅一起分 · n=${MODELS.sex.n}`;
      }
    }
  }

  function updateChips(): void {
    if (row1El) row1El.innerHTML = featureRowHtml('data-feature-1', state);
    if (row2El) row2El.innerHTML = featureRowHtml('data-feature-2', state);
  }

  function accuracyColor(acc: number): { bar: string; text: string } {
    if (acc >= 0.9) return { bar: 'bg-emerald-500', text: 'text-emerald-600' };
    if (acc >= 0.7) return { bar: 'bg-polar-500', text: 'text-polar-600' };
    return { bar: 'bg-beak', text: 'text-beak-dark' };
  }

  function renderRule(): void {
    if (!ruleEl) return;
    const cur = currentModel();
    const fMeta = (key: FeatureKey) => FEATURES.find((f) => f.key === key);
    const title = 'AI 的规则';
    let body = '';
    if (cur.kind === 'tree') {
      const meta = fMeta(cur.feature);
      const m = cur.model;
      const dec = Math.max(meta?.decimals ?? 0, 1);
      const cutoffText = m.cutoff.toLocaleString('en-US', { minimumFractionDigits: dec, maximumFractionDigits: dec });
      if (m.leftClass === m.rightClass) {
        body = `
          <p class="text-[13px] leading-relaxed text-ink">无论从哪里切，两边都判成 <b>${fullName(state.mode, m.leftClass)}</b>——用 <b>${meta?.label ?? ''}</b> 分不开它们。</p>`;
      } else {
        body = `
          <p class="mono-num text-[13px] leading-relaxed text-ink">${meta?.label} ≤ ${cutoffText} ${meta?.unit ?? ''} → ${fullName(state.mode, m.leftClass)}</p>
          <p class="mono-num text-[13px] leading-relaxed text-ink">${meta?.label} ＞ ${cutoffText} ${meta?.unit ?? ''} → ${fullName(state.mode, m.rightClass)}</p>
          <p class="mt-1.5 text-[12.5px] leading-relaxed text-mist">AI 试遍了所有能"一刀切"的位置，挑出分得最开的那一个。</p>`;
      }
    } else {
      const mx = fMeta(cur.fx);
      const my = fMeta(cur.fy);
      const m = cur.model;
      if (!cur.hasLine) {
        body = `
          <p class="text-[13px] leading-relaxed text-ink">用 <b>${mx?.label ?? ''} + ${my?.label ?? ''}</b> 画出的直线，把所有企鹅都判成了 <b>${fullName(state.mode, 0)}</b>——这两个特征分不开。</p>`;
      } else {
        body = `
          <p class="text-[13px] leading-relaxed text-ink">AI 根据 <b>${mx?.label ?? ''} + ${my?.label ?? ''}</b> 自动画一条直线：</p>
          <p class="mt-1 text-[13px] leading-relaxed text-ink">直线的一侧判成 <b>${fullName(state.mode, 0)}</b>，另一侧判成 <b>${fullName(state.mode, 1)}</b>。</p>`;
      }
      if (m.misIds.length > 0) {
        body += `<p class="mt-1.5 text-[12.5px] leading-relaxed text-mist">被线切错的企鹅已在图上画了红圈。</p>`;
      }
    }
    ruleEl.innerHTML = `
      <div class="flex items-center gap-2">
        <span class="flex h-7 w-7 items-center justify-center rounded-lg bg-polar-500/15 text-polar-600">
          <svg viewBox="0 0 24 24" class="h-4 w-4" fill="none" aria-hidden="true"><path d="M4 19 20 5" stroke="currentColor" stroke-width="2" stroke-dasharray="3 2.4" stroke-linecap="round"/><circle cx="8" cy="15.5" r="1.8" fill="currentColor"/><circle cx="16.5" cy="8.5" r="1.8" fill="currentColor"/></svg>
        </span>
        <h4 class="text-[13px] font-black">${title}</h4>
      </div>
      <div class="mt-2.5">${body}</div>`;
  }

  function renderAccuracy(): void {
    if (!accEl) return;
    const cur = currentModel();
    const m = cur.model;
    const pct = (m.accuracy * 100).toFixed(1);
    const color = accuracyColor(m.accuracy);
    accEl.innerHTML = `
      <div class="flex items-baseline justify-between gap-2">
        <span class="text-xs font-black text-mist">它判对了多少？</span>
        <span class="mono-num text-[26px] font-black leading-none ${color.text}">${pct}<span class="text-sm">%</span></span>
      </div>
      <div class="mt-2.5 h-2 overflow-hidden rounded-full bg-polar-100">
        <div class="h-full rounded-full ${color.bar} transition-all duration-500" style="width:${pct}%"></div>
      </div>
      <p class="mono-num mt-1.5 text-[11px] text-mist">${m.correct} / ${m.n} 只判对 · n=${m.n}</p>
      <p class="mt-1 text-[11px] leading-relaxed text-mist">准确率 = 判对的 ÷ 总数。企鹅越多、分得越准，这个数就越大。</p>`;
  }

  function renderConfusion(): void {
    if (!confusionEl) return;
    const cur = currentModel();
    const m = cur.model;
    const [[tn, fp], [fn, tp]] = m.cm;
    const cell = (v: number, good: boolean): string =>
      `<td class="p-1.5"><div class="mono-num flex h-11 items-center justify-center rounded-lg border text-[15px] font-black ${
        good ? 'border-emerald-200 bg-emerald-50 text-emerald-700' : 'border-rose-200 bg-rose-50 text-rose-600'
      }">${v}</div></td>`;
    const head = (text: string): string =>
      `<th class="pb-2 text-center text-[11px] font-bold text-mist">${text}</th>`;
    const rowHead = (text: string): string =>
      `<th class="w-[70px] pr-1.5 text-right text-[11px] font-bold leading-tight text-mist">${text}</th>`;
    confusionEl.innerHTML = `
      <div class="flex items-center justify-between gap-2">
        <h4 class="text-[13px] font-black">谁被判错了？</h4>
        <span class="text-[10.5px] text-mist">行 = 真实 · 列 = 判成</span>
      </div>
      <table class="mt-2 w-full border-separate border-spacing-0">
        <thead><tr>${rowHead('')} ${head(`判成<br>${shortName(state.mode, 0)}`)} ${head(`判成<br>${shortName(state.mode, 1)}`)}</tr></thead>
        <tbody>
          <tr>${rowHead(`真实<br>${shortName(state.mode, 0)}`)}${cell(tn, true)}${cell(fp, false)}</tr>
          <tr>${rowHead(`真实<br>${shortName(state.mode, 1)}`)}${cell(fn, false)}${cell(tp, true)}</tr>
        </tbody>
      </table>
      <p class="mt-2 text-[11.5px] leading-relaxed text-mist">
        绿格 = 判对；红格 = 判错。这张表叫<b class="text-ink">混淆矩阵</b>——
        <b style="color:${MIS_COLOR}">红格里的数字，就是图上红圈企鹅的个数</b>！
      </p>`;
  }

  function hintText(): string {
    const cur = currentModel();
    if (cur.kind === 'tree') {
      const meta = FEATURES.find((f) => f.key === cur.feature);
      const m = cur.model;
      const dec = Math.max(meta?.decimals ?? 0, 1);
      const cutoffText = m.cutoff.toLocaleString('en-US', { minimumFractionDigits: dec, maximumFractionDigits: dec });
      if (m.leftClass === m.rightClass) {
        return `用「${meta?.label}」分不开${pairName(state.mode)}：无论从哪里切，所有企鹅都被判成${fullName(state.mode, m.leftClass)}。换个特征试试，比如嘴的长度。`;
      }
      return `橙色虚线是 AI 找到的最佳分界线：${meta?.label} ≤ ${cutoffText} ${meta?.unit ?? ''} 判成${fullName(state.mode, m.leftClass)}，超过判成${fullName(state.mode, m.rightClass)}。红圈是被分错的企鹅——对照右边红格的数字数一数。`;
    }
    if (!cur.hasLine) {
      return `这两个特征分不开${pairName(state.mode)}：直线把所有企鹅都判成了${fullName(state.mode, 0)}。试试「嘴的长度 + 嘴的厚度」，看看红圈会不会变少。`;
    }
    return `橙色虚线是 AI 根据两个特征画出的分界线，线的一侧判成${fullName(state.mode, 0)}、另一侧判成${fullName(state.mode, 1)}。鼠标点开红圈企鹅，看看它们错在哪里——是不是正好长在分界线附近？`;
  }

  function updateChart(): void {
    if (!chartEl) return;
    const features = featureKeys(state);
    const is1D = features.length === 1;
    chartEl.style.height = is1D ? '380px' : '460px';
    if (!state.chart) {
      state.chart = new ExploreChart(chartEl);
      window.addEventListener('resize', () => state.chart?.resize());
    }
    state.chart.resize();

    const cur = currentModel();
    const rows = TASK_ROWS[state.mode];
    const misSet = new Set<PenguinRecord>(cur.model.misIds.map((i) => rows[i]));

    let decisionLine: DecisionLine | null = null;
    if (cur.kind === 'tree') {
      const meta = FEATURES.find((f) => f.key === cur.feature);
      const dec = Math.max(meta?.decimals ?? 0, 1);
      const cutoffText = cur.model.cutoff.toLocaleString('en-US', { minimumFractionDigits: dec, maximumFractionDigits: dec });
      decisionLine = { vertical: { x: cur.model.cutoff, label: `分界线 ${cutoffText} ${meta?.unit ?? ''}` } };
    } else if (cur.segment) {
      decisionLine = { segment: { ...cur.segment, label: '分界线' } };
    }

    state.chart.update({
      mode: state.mode,
      features,
      records: rows,
      decisionLine,
      misSet,
    });
  }

  function updateAll(): void {
    updateQuestions();
    updateChips();
    if (legendEl) legendEl.innerHTML = legendHTML(state.mode);
    renderRule();
    renderAccuracy();
    renderConfusion();
    if (hintEl) hintEl.textContent = hintText();
    updateChart();
  }

  container.addEventListener('click', (e: Event) => {
    const qBtn = (e.target as HTMLElement).closest<HTMLElement>('[data-question]');
    if (qBtn) {
      const mode = qBtn.dataset.question as ExploreMode | undefined;
      if (mode && mode !== state.mode) {
        state.mode = mode;
        updateAll();
      }
      return;
    }
    if (handleFeatureClick(e.target as HTMLElement, state)) updateAll();
  });

  updateAll();

  return {
    onShow: () => state.chart?.resize(),
  };
}
