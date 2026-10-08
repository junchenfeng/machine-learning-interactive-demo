// ABOUTME: Tab4 初步分类：复用探索分析布局，左散点图（含决策虚线）+ 右准确率/混淆矩阵
// 模型全部为预计算结果（scripts/precompute-classifiers.mjs 生成），页面不做任何训练计算
import { FEATURES, SPECIES_META, trainRecords } from '../data/dataset';
import modelsJson from '../data/classifier-models.json';
import { ExploreChart, legendHTML, symbolSvg } from '../charts/penguin-chart';
import type { DecisionLine, ExploreMode } from '../charts/penguin-chart';
import type { FeatureKey } from '../data/types';

interface Cell {
  n: number;
  correct: number;
  accuracy: number;
  cm: [[number, number], [number, number]];
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

interface ClassifyState {
  mode: ExploreMode;
  selected: FeatureKey[];
  chart: ExploreChart | null;
}

export interface ClassifyTab {
  onShow: () => void;
}

const QA_CLASSES = ['border-beak', 'bg-beak-soft', 'shadow-card-hover'];
const QI_CLASSES = ['border-polar-200', 'bg-white', 'hover:border-polar-300'];
const FEATURE_ORDER = FEATURES.map((f) => f.key);

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

/** 类别中文名（短） */
function shortName(mode: ExploreMode, ci: 0 | 1): string {
  if (mode === 'species') return ci === 0 ? '阿德利' : '帽带';
  return ci === 0 ? '母' : '公';
}

/** 类别中文名（全称） */
function fullName(mode: ExploreMode, ci: 0 | 1): string {
  if (mode === 'species') return ci === 0 ? '阿德利企鹅' : '帽带企鹅';
  return ci === 0 ? '母企鹅' : '公企鹅';
}

/** 系数紧凑格式：3 位有效数字（0.0761 / -0.0944 / 3.2e-5） */
function coef(v: number): string {
  return String(Number(v.toPrecision(3)));
}

/** OLS 决策线线段：b + w1*x + w2*y = 0.5，裁剪到数据范围（扩 12%）内；不相交返回 null */
function olsSegment(model: OlsModel, fx: FeatureKey, fy: FeatureKey): { x1: number; y1: number; x2: number; y2: number } | null {
  const rows = trainRecords;
  const xs = rows.map((r) => r[fx]).filter((v): v is number => v !== null);
  const ys = rows.map((r) => r[fy]).filter((v): v is number => v !== null);
  if (xs.length === 0 || ys.length === 0) return null;
  const span = (arr: number[]) => ({ min: Math.min(...arr), max: Math.max(...arr) });
  const pad = (s: { min: number; max: number }) => (s.max - s.min) * 0.12;
  const x0 = span(xs).min - pad(span(xs));
  const x1 = span(xs).max + pad(span(xs));
  const y0 = span(ys).min - pad(span(ys));
  const y1 = span(ys).max + pad(span(ys));
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
  const state: ClassifyState = { mode: 'species', selected: ['billLength'], chart: null };

  container.innerHTML = `
    <div class="fade-up mb-7 flex items-start gap-4">
      <span class="mono-num flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-polar-800 text-sm font-bold text-white shadow-card">04</span>
      <div>
        <h2 class="text-xl font-black md:text-2xl">初步分类：让一条规则替我们判断</h2>
        <p class="mt-1 max-w-3xl text-sm leading-relaxed text-mist">
          上一页我们用眼睛找规律，现在交给最简单的模型：选 <b class="text-ink">1 个特征</b>，决策树自动找"一刀切"的位置；
          选 <b class="text-ink">2 个特征</b>，OLS 拟合一条分类线，分数过 0.5 就判另一类。右侧立即汇报它判对了多少。
        </p>
      </div>
    </div>

    <!-- 研究问题 -->
    <div class="fade-up grid gap-4 md:grid-cols-2">
      ${questionCardHtml(
        'species',
        '问题一 · 训练区分器：Adelie 和 Chinstrap',
        '把上一页观察到的规律交给模型：让它自动画下决策线，看看切得准不准。',
        `<span class="flex items-center gap-0.5">${symbolSvg('circle', SPECIES_META.Adelie.color, 15)}${symbolSvg('triangle', SPECIES_META.Chinstrap.color, 15)}</span>`,
        '只用这两种企鹅训练',
      )}
      ${questionCardHtml(
        'sex',
        '问题二 · 训练区分器：公企鹅和母企鹅',
        '同种企鹅公母身材差别不大，三种企鹅混在一起判。模型还能对多少？',
        `<span class="flex items-center gap-0.5">${symbolSvg('circle', '#E15A85', 15)}${symbolSvg('circle', '#2F5D8A', 15)}</span>`,
        '三种企鹅一起判',
      )}
    </div>

    <!-- 特征选择 -->
    <div class="card fade-up mt-6 p-5 md:p-6">
      <div class="mb-3.5 flex flex-wrap items-center justify-between gap-2">
        <h3 class="text-[15px] font-black">给模型喂哪个特征？</h3>
        <span class="text-xs text-mist">最多同时选 2 个：选 1 个 → 决策树一刀切；选 2 个 → OLS 分类线</span>
      </div>
      <div id="feature-chips" class="grid grid-cols-2 gap-2.5 md:grid-cols-4"></div>
    </div>

    <!-- 主体：左图 + 右指标 -->
    <div class="card fade-up mt-6 p-5 md:p-6">
      <div id="classify-legend" class="legend-bar mb-4"></div>
      <div class="grid gap-6 lg:grid-cols-[minmax(0,1fr)_330px]">
        <div class="min-w-0">
          <div id="classify-chart" class="w-full" style="height:380px"></div>
          <p class="mt-3 text-xs text-mist">
            图中每个点是一只企鹅（单特征图做了轻微上下抖动，便于看到重叠的数据）。橙色虚线 = 模型学到的决策线。数据：训练集（2007-2008）。
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
  const chipsEl = container.querySelector<HTMLElement>('#feature-chips');
  const ruleEl = container.querySelector<HTMLElement>('#model-rule');
  const accEl = container.querySelector<HTMLElement>('#accuracy-box');
  const confusionEl = container.querySelector<HTMLElement>('#confusion-box');

  const qButtons: Record<ExploreMode, HTMLElement | null> = {
    species: container.querySelector<HTMLElement>('[data-question="species"]'),
    sex: container.querySelector<HTMLElement>('[data-question="sex"]'),
  };

  function currentModel():
    | { kind: 'tree'; model: TreeModel; feature: FeatureKey }
    | { kind: 'ols'; model: OlsModel; fx: FeatureKey; fy: FeatureKey; olsKey: string } {
    const task = MODELS[state.mode];
    if (state.selected.length === 1) {
      const feature = state.selected[0];
      return { kind: 'tree', model: task.tree[feature], feature };
    }
    const sorted = [...state.selected].sort(
      (a, b) => FEATURE_ORDER.indexOf(a) - FEATURE_ORDER.indexOf(b),
    );
    const olsKey = `${sorted[0]}+${sorted[1]}`;
    return { kind: 'ols', model: task.ols[olsKey], fx: sorted[0], fy: sorted[1], olsKey };
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
      if (note) note.textContent = `只用这两种企鹅训练 · n=${MODELS[mode].n}`;
    }
  }

  function updateChips(): void {
    if (!chipsEl) return;
    const full = state.selected.length >= 2;
    chipsEl.innerHTML = FEATURES.map((f) => {
      const selected = state.selected.includes(f.key);
      const disabled = !selected && full;
      const base = 'chip-btn flex flex-col items-start gap-1 rounded-xl border-2 px-3.5 py-2.5 text-left transition-all';
      const look = selected
        ? ' border-beak bg-beak text-white shadow-card-hover'
        : ' border-polar-200 bg-white text-ink hover:border-polar-400';
      return `
        <button type="button" data-feature="${f.key}" ${disabled ? 'disabled' : ''}
          class="${base}${look}${disabled ? ' chip-disabled' : ''}" aria-pressed="${selected}">
          <span class="text-sm font-black">${f.label}</span>
          <span class="mono-num text-[10.5px] leading-tight ${selected ? 'text-white/75' : 'text-mist'}">${f.field} · ${f.unit}</span>
        </button>`;
    }).join('');
  }

  function accuracyColor(acc: number): { bar: string; text: string } {
    if (acc >= 0.9) return { bar: 'bg-emerald-500', text: 'text-emerald-600' };
    if (acc >= 0.7) return { bar: 'bg-polar-500', text: 'text-polar-600' };
    return { bar: 'bg-beak', text: 'text-beak-dark' };
  }

  function renderRule(): void {
    if (!ruleEl) return;
    const task = MODELS[state.mode];
    const cur = currentModel();
    const fMeta = (key: FeatureKey) => FEATURES.find((f) => f.key === key);
    let title = '';
    let body = '';
    if (cur.kind === 'tree') {
      const meta = fMeta(cur.feature);
      const m = cur.model;
      const dec = Math.max(meta?.decimals ?? 0, 1);
      const cutoffText = m.cutoff.toLocaleString('en-US', { minimumFractionDigits: dec, maximumFractionDigits: dec });
      title = '一层决策树 · 找最佳一刀切';
      if (m.leftClass === m.rightClass) {
        body = `
          <p class="mono-num text-[13px] leading-relaxed text-ink">${meta?.label} ≤/＞ ${cutoffText} ${meta?.unit ?? ''}</p>
          <p class="mt-1.5 text-[12.5px] leading-relaxed text-mist">无论切在哪，两边都判为 <b>${fullName(state.mode, m.leftClass)}</b>——这个特征分不开这两种企鹅。</p>`;
      } else {
        body = `
          <p class="mono-num text-[13px] leading-relaxed text-ink">${meta?.label} ≤ ${cutoffText} ${meta?.unit ?? ''} → ${fullName(state.mode, m.leftClass)}</p>
          <p class="mono-num text-[13px] leading-relaxed text-ink">${meta?.label} ＞ ${cutoffText} ${meta?.unit ?? ''} → ${fullName(state.mode, m.rightClass)}</p>
          <p class="mt-1.5 text-[12.5px] leading-relaxed text-mist">树在所有可能的切口里，挑了让两边"最纯"的那一个。</p>`;
      }
    } else {
      const mx = fMeta(cur.fx);
      const my = fMeta(cur.fy);
      const m = cur.model;
      const [w1, w2] = m.w;
      const term = (w: number, label: string | undefined) =>
        `${w >= 0 ? '+' : '−'} ${coef(Math.abs(w))}×${label ?? ''}`;
      title = 'OLS 分类线 · 拟合 0/1 分数';
      body = `
        <p class="mono-num text-[13px] leading-relaxed text-ink">分数 = ${coef(m.b)} ${term(w1, mx?.label)} ${term(w2, my?.label)}</p>
        <p class="mono-num mt-1 text-[13px] leading-relaxed text-ink">分数 ≥ 0.5 → ${fullName(state.mode, 1)}，否则 → ${fullName(state.mode, 0)}</p>
        <p class="mt-1.5 text-[12.5px] leading-relaxed text-mist">把 0/1 当成普通数字做线性回归，再在 0.5 处"一刀两断"。</p>`;
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
        <span class="text-xs font-black text-mist">训练集准确率</span>
        <span class="mono-num text-[26px] font-black leading-none ${color.text}">${pct}<span class="text-sm">%</span></span>
      </div>
      <div class="mt-2.5 h-2 overflow-hidden rounded-full bg-polar-100">
        <div class="h-full rounded-full ${color.bar} transition-all duration-500" style="width:${pct}%"></div>
      </div>
      <p class="mono-num mt-1.5 text-[11px] text-mist">${m.correct} / ${m.n} 只判对 · n=${m.n}</p>`;
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
      `<th class="w-[74px] pr-1.5 text-right text-[11px] font-bold text-mist">${text}</th>`;
    confusionEl.innerHTML = `
      <div class="flex items-center justify-between gap-2">
        <h4 class="text-[13px] font-black">混淆矩阵</h4>
        <span class="text-[10.5px] text-mist">行 = 真实 · 列 = 预测</span>
      </div>
      <table class="mt-2 w-full border-separate border-spacing-0">
        <thead><tr>${rowHead('')} ${head(`判${shortName(state.mode, 0)}`)} ${head(`判${shortName(state.mode, 1)}`)}</tr></thead>
        <tbody>
          <tr>${rowHead(`真实<br>${shortName(state.mode, 0)}`)}${cell(tn, true)}${cell(fp, false)}</tr>
          <tr>${rowHead(`真实<br>${shortName(state.mode, 1)}`)}${cell(fn, false)}${cell(tp, true)}</tr>
        </tbody>
      </table>
      <p class="mt-2 text-[11.5px] leading-relaxed text-mist">绿色 = 判对（对角线）；红色 = 判错。两个红格相加就是全部错误。</p>`;
  }

  function hintText(): string {
    const cur = currentModel();
    if (cur.kind === 'tree') {
      const meta = FEATURES.find((f) => f.key === cur.feature);
      const m = cur.model;
      if (m.leftClass === m.rightClass) {
        return `橙色虚线两侧全被判为${fullName(state.mode, m.leftClass)}（准确率只剩"猜多数类"的水平）。换个特征试试，比如嘴的长度或嘴的厚度。`;
      }
      return `橙色虚线是决策树找到的最佳切口：${meta?.label} ≤ ${m.cutoff} ${meta?.unit ?? ''} 判为${fullName(state.mode, m.leftClass)}，超过则判为${fullName(state.mode, m.rightClass)}。对照点的颜色，看看这条线切丢了谁。`;
    }
    return `橙色虚线是 OLS 学到的分类线：虚线两侧分别判为${fullName(state.mode, 0)}和${fullName(state.mode, 1)}（分数 0.5 为界）。对照右侧混淆矩阵，数一数被切错的点。`;
  }

  function updateChart(): void {
    if (!chartEl) return;
    const is1D = state.selected.length === 1;
    chartEl.style.height = is1D ? '380px' : '460px';
    if (!state.chart) {
      state.chart = new ExploreChart(chartEl);
      window.addEventListener('resize', () => state.chart?.resize());
    }
    state.chart.resize();

    const cur = currentModel();
    let decisionLine: DecisionLine | null = null;
    if (cur.kind === 'tree') {
      const meta = FEATURES.find((f) => f.key === cur.feature);
      const dec = Math.max(meta?.decimals ?? 0, 1);
      const cutoffText = cur.model.cutoff.toLocaleString('en-US', { minimumFractionDigits: dec, maximumFractionDigits: dec });
      decisionLine = { vertical: { x: cur.model.cutoff, label: `决策线 ${cutoffText} ${meta?.unit ?? ''}` } };
    } else {
      const seg = olsSegment(cur.model, cur.fx, cur.fy);
      decisionLine = seg ? { segment: { ...seg, label: 'OLS 分类线' } } : null;
    }

    state.chart.update({
      mode: state.mode,
      features: state.selected,
      records: trainRecords,
      decisionLine,
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
    const chipBtn = (e.target as HTMLElement).closest<HTMLButtonElement>('[data-feature]');
    if (chipBtn && !chipBtn.disabled) {
      const key = chipBtn.dataset.feature as FeatureKey | undefined;
      if (!key) return;
      if (state.selected.includes(key)) {
        if (state.selected.length > 1) state.selected = state.selected.filter((k) => k !== key);
      } else if (state.selected.length < 2) {
        state.selected = [...state.selected, key];
      }
      updateAll();
    }
  });

  updateAll();

  return {
    onShow: () => state.chart?.resize(),
  };
}
