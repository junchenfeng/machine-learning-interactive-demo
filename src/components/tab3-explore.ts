// ABOUTME: Tab3 探索分析：两个研究问题 + 特征选择（最多 2 个）+ 预设散点图（仅训练数据）
import { SPECIES_META, SEX_META, trainRecords, data } from '../data/dataset';
import { ExploreChart, legendHTML, symbolSvg } from '../charts/penguin-chart';
import { featureKeys, featureRowHtml, handleFeatureClick } from './feature-picker';
import type { ExploreMode } from '../charts/penguin-chart';
import type { FeatureKey } from '../data/types';

interface ExploreState {
  mode: ExploreMode;
  /** 特征1：必选，radio 语义，当作横轴／分行依据 */
  f1: FeatureKey;
  /** 特征2：可选，当作纵轴；不选则为单特征图 */
  f2: FeatureKey | null;
  chart: ExploreChart | null;
}

export interface ExploreTab {
  onShow: () => void;
}

const QA_CLASSES = ['border-beak', 'bg-beak-soft', 'shadow-card-hover'];
const QI_CLASSES = ['border-polar-200', 'bg-white', 'hover:border-polar-300'];

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

export function renderExplore(container: HTMLElement): ExploreTab {
  const state: ExploreState = { mode: 'species', f1: 'billLength', f2: null, chart: null };
  const counts = data.counts;

  container.innerHTML = `
    <div class="fade-up mb-7 flex items-start gap-4">
      <span class="mono-num flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-polar-800 text-sm font-bold text-white shadow-card">03</span>
      <div>
        <h2 class="text-xl font-black md:text-2xl">像科学家一样探索数据</h2>
        <p class="mt-1 max-w-3xl text-sm leading-relaxed text-mist">
          先选 1 个身体特征，看看数据点能不能"分成两堆"；再加上第 2 个特征，就能画成散点图。这正是很多分类模型做的事——先用眼睛找规律，再让算法来验证。
        </p>
      </div>
    </div>

    <!-- 研究问题 -->
    <div class="fade-up mt-7 grid gap-4 md:grid-cols-2">
      ${questionCardHtml(
        'species',
        '问题一 · 区分 Adelie 和 Chinstrap',
        '这两种企鹅体型相仿、羽色相似，科学家靠什么区分它们？选特征画图，找找"分界线"。',
        `<span class="flex items-center gap-0.5">${symbolSvg('circle', SPECIES_META.Adelie.color, 15)}${symbolSvg('triangle', SPECIES_META.Chinstrap.color, 15)}</span>`,
        '图中只显示这两种企鹅',
      )}
      ${questionCardHtml(
        'sex',
        '问题二 · 区分公企鹅和母企鹅',
        '同一种企鹅里，公的和母的身材差别不大。三种企鹅混在一起，你能一眼分出它们吗？',
        `<span class="flex items-center gap-0.5">${symbolSvg('triangle', SEX_META.female.color, 15)}${symbolSvg('circle', SEX_META.male.color, 15)}</span>`,
        '绿三角 = 母 · 蓝圆 = 公',
      )}
    </div>

    <!-- 特征选择 -->
    <div class="card fade-up mt-6 p-5 md:p-6">
      <div class="mb-4 flex flex-wrap items-center justify-between gap-2">
        <h3 class="text-[15px] font-black">选择要对比的身体特征</h3>
        <span class="text-xs text-mist">特征1 必选、特征2 可不选：只选特征1 时按类别分行，加上特征2 就画成散点图</span>
      </div>
      <div class="flex flex-col gap-4">
        <div>
          <div class="mb-2 flex flex-wrap items-center gap-2">
            <span class="rounded-md bg-beak-soft px-2 py-0.5 text-[11px] font-black text-beak-dark">特征1 · 必选</span>
            <span class="text-[11.5px] text-mist">当作横轴；只选它时，用来把点按类别分成几行</span>
          </div>
          <div id="feature-row-1" class="grid grid-cols-2 gap-2.5 md:grid-cols-4"></div>
        </div>
        <div>
          <div class="mb-2 flex flex-wrap items-center gap-2">
            <span class="rounded-md bg-polar-100 px-2 py-0.5 text-[11px] font-black text-polar-700">特征2 · 可选</span>
            <span class="text-[11.5px] text-mist">当作纵轴；不选就是单特征图，注意不能和特征1 相同</span>
          </div>
          <div id="feature-row-2" class="grid grid-cols-2 gap-2.5 md:grid-cols-4"></div>
        </div>
      </div>
    </div>

    <!-- 图表 -->
    <div class="card fade-up mt-6 p-5 md:p-6">
      <div id="explore-legend" class="legend-bar mb-4"></div>
      <div id="explore-chart" class="w-full" style="height:380px"></div>
      <div class="mt-4 flex items-start gap-2.5 rounded-xl border border-dashed border-polar-300 bg-polar-50 px-4 py-3">
        <span class="mt-0.5 shrink-0 text-polar-500">
          <svg viewBox="0 0 24 24" class="h-4.5 w-4.5" fill="none" aria-hidden="true"><circle cx="10.5" cy="10.5" r="6" stroke="currentColor" stroke-width="2"/><path d="m15.5 15.5 4.5 4.5" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>
        </span>
        <p id="explore-hint" class="text-[13px] leading-relaxed text-polar-700"></p>
      </div>
      <p class="mt-3 text-xs text-mist">
        图中每个点是一只企鹅（部分点做了轻微上下抖动，便于看到重叠的数据）。数据：2007-2008 年科考记录，共 ${counts.train} 条。
      </p>
    </div>
  `;

  const chartEl = container.querySelector<HTMLElement>('#explore-chart');
  const legendEl = container.querySelector<HTMLElement>('#explore-legend');
  const hintEl = container.querySelector<HTMLElement>('#explore-hint');
  const row1El = container.querySelector<HTMLElement>('#feature-row-1');
  const row2El = container.querySelector<HTMLElement>('#feature-row-2');

  const qButtons: Record<ExploreMode, HTMLElement | null> = {
    species: container.querySelector<HTMLElement>('[data-question="species"]'),
    sex: container.querySelector<HTMLElement>('[data-question="sex"]'),
  };

  function hintText(): string {
    const two = state.f2 !== null;
    if (state.mode === 'species') {
      return two
        ? '观察蓝色圆点和橙色三角：能画一条直线把它们大致分开吗？选了嘴的长度时，留意 45 mm 附近发生了什么。'
        : '每一行代表一种企鹅。看看哪种特征上两行点堆"分得最开"？再把它保留为特征1，加选一个特征2 试试。';
    }
    return two
      ? '同一物种里，蓝色圆点（公）和绿色三角（母）在哪些特征上错开？哪个物种的公母最好分？'
      : '每一行代表一种性别（上公下母）：绿三角是母、蓝圆是公。看看哪种特征上两行点堆"分得最开"？记住这比区分物种更难。';
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
      if (note) note.style.display = active ? 'inline-flex' : 'none';
    }
  }

  function updateChips(): void {
    if (row1El) row1El.innerHTML = featureRowHtml('data-feature-1', state);
    if (row2El) row2El.innerHTML = featureRowHtml('data-feature-2', state);
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
    state.chart.update({ mode: state.mode, features, records: trainRecords });
  }

  function updateAll(): void {
    updateQuestions();
    updateChips();
    if (legendEl) legendEl.innerHTML = legendHTML(state.mode);
    if (hintEl) hintEl.textContent = hintText();
    updateChart();
  }

  // 事件：研究问题切换 / 特征选择
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
