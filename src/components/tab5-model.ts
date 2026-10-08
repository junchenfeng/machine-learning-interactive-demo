// ABOUTME: Tab4 决策树模型：100% 训练（不做 train-test 划分），学生选择 depth / min-leaf 参数，
// 查看 AI 自动学出的规则——准确率、混淆矩阵、sklearn 预生成树图与规则文本。
import treeModelsJson from '../data/tree-models.json';

export interface ModelTab {
  onShow: () => void;
}

interface TreeRule {
  if: string;
  predict: string;
  samples: number;
  nAdelie: number;
  nChinstrap: number;
}

interface TreeCombo {
  depth: number;
  minLeaf: number;
  n: number;
  correct: number;
  accuracy: number;
  cm: [number, number][];
  pickedFeatures: string[];
  rules: TreeRule[];
  image: string;
}

interface TreeMeta {
  source: string;
  model: string;
  trainRule: string;
  classes: string[];
  n: number;
  nAdelie: number;
  nChinstrap: number;
  features: string[];
  ruleDir: string;
  palette: { note: string; Adelie: string; Chinstrap: string };
}

interface TreeModelsData {
  meta: TreeMeta;
  combos: Record<string, TreeCombo>;
}

const treeData = treeModelsJson as unknown as TreeModelsData;

const PARAM_ACTIVE = 'border-beak bg-beak text-white shadow-card-hover';
const PARAM_IDLE = 'border-polar-200 bg-white text-ink hover:border-polar-400';

interface ModelParams {
  depth: 1 | 2;
  minLeaf: 10 | 60;
}

function comboKey(p: ModelParams): string {
  return `d${p.depth}-leaf${p.minLeaf}`;
}

function classColor(predict: string): string {
  return predict === '阿德利企鹅' ? treeData.meta.palette.Adelie : treeData.meta.palette.Chinstrap;
}

function percent(v: number): string {
  return `${(v * 100).toFixed(1)}%`;
}

function paramButton(group: 'depth' | 'leaf', value: number, label: string, sub: string, active: boolean): string {
  return `
    <button type="button" data-param="${group}" data-value="${value}" aria-pressed="${active}"
      class="param-btn flex flex-col items-start gap-0.5 rounded-xl border-2 px-4 py-2.5 text-left transition-all ${active ? PARAM_ACTIVE : PARAM_IDLE}">
      <span class="text-sm font-black">${label}</span>
      <span class="mono-num text-[10.5px] leading-tight ${active ? 'text-white/75' : 'text-mist'}">${sub}</span>
    </button>`;
}

function paramCardHtml(p: ModelParams): string {
  return `
    <div class="card fade-up delay-1 mt-6 p-5 md:p-6">
      <div class="mb-1.5 flex flex-wrap items-center justify-between gap-2">
        <h3 class="text-[15px] font-black">给模型下两个"指令"</h3>
        <span class="text-xs text-mist">改任何一个参数，下面的结果会立刻变</span>
      </div>
      <p class="mb-4 text-[13px] leading-relaxed text-mist">
        决策树就像"连连问"游戏：<b class="text-ink">depth</b> 是最多允许问几个问题（分几次叉）；
        <b class="text-ink">min-leaf</b> 是每片"答案叶子"至少要装多少只企鹅。模型拿到参数后，会自己决定每次问哪个特征。
      </p>
      <div class="grid gap-5 md:grid-cols-2">
        <div>
          <div class="mb-2 text-xs font-bold text-polar-700">树最多问几个问题（depth）</div>
          <div class="flex gap-2.5">
            ${paramButton('depth', 1, 'depth = 1', '只问 1 个问题', p.depth === 1)}
            ${paramButton('depth', 2, 'depth = 2', '最多问 2 个', p.depth === 2)}
          </div>
        </div>
        <div>
          <div class="mb-2 text-xs font-bold text-polar-700">每片叶子最少几只企鹅（min-leaf node）</div>
          <div class="flex gap-2.5">
            ${paramButton('leaf', 10, 'min-leaf = 10', '规则更细', p.minLeaf === 10)}
            ${paramButton('leaf', 60, 'min-leaf = 60', '规则更简单', p.minLeaf === 60)}
          </div>
        </div>
      </div>
    </div>`;
}

function pickedHtml(combo: TreeCombo): string {
  const chips = combo.pickedFeatures
    .map(
      (name) => `
        <span class="inline-flex items-center gap-1.5 rounded-full border border-polar-400/60 bg-white px-3 py-1 text-xs font-black text-polar-700">
          <svg viewBox="0 0 24 24" class="h-3.5 w-3.5" fill="none" aria-hidden="true">
            <path d="m5 13 4 4L19 7" stroke="#1FA9C9" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"/>
          </svg>
          ${name}
        </span>`,
    )
    .join('');
  const unused = treeData.meta.features.filter((f) => !combo.pickedFeatures.includes(f));
  const note =
    combo.depth === 1
      ? `depth = 1 时它只挑 1 个特征——另外 ${unused.length} 个全没用上！`
      : combo.pickedFeatures.length > 1
        ? `多给一层，它自动补挑了别的特征；没用上的：${unused.join('、') || '（无）'}。`
        : `即使多给一层，它依然只用这一个特征就够分了。`;
  return `
    <div class="rounded-xl border border-polar-200 bg-polar-50 p-4">
      <div class="flex items-center gap-2 text-[13px] font-black text-polar-800">
        <span class="flex h-6 w-6 items-center justify-center rounded-md bg-polar-500/15 text-polar-600">
          <svg viewBox="0 0 24 24" class="h-4 w-4" fill="none" aria-hidden="true"><path d="M12 3v6m0 0-5 4v8m5-8 5 4v8M7 13H4m13 0h3" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg>
        </span>
        模型自己挑的特征
      </div>
      <div class="mt-2.5 flex flex-wrap gap-2">${chips}</div>
      <p class="mt-2 text-[12.5px] leading-relaxed text-mist">${note}</p>
    </div>`;
}

function accuracyHtml(combo: TreeCombo): string {
  const barColor = combo.accuracy >= 0.9 ? 'bg-emerald-500' : combo.accuracy >= 0.7 ? 'bg-polar-500' : 'bg-beak';
  const numColor = combo.accuracy >= 0.9 ? 'text-emerald-600' : combo.accuracy >= 0.7 ? 'text-polar-600' : 'text-beak-dark';
  return `
    <div class="rounded-xl border border-polar-200 bg-white p-4">
      <div class="text-[13px] font-black text-polar-800">在 143 只企鹅上的答对率</div>
      <div class="mono-num mt-2 flex items-baseline gap-2">
        <span class="text-4xl font-black ${numColor}">${percent(combo.accuracy)}</span>
        <span class="text-xs text-mist">${combo.correct} / ${combo.n} 只</span>
      </div>
      <div class="mt-3 h-2 overflow-hidden rounded-full bg-polar-100">
        <div class="h-full rounded-full ${barColor}" style="width:${(combo.accuracy * 100).toFixed(1)}%"></div>
      </div>
      <p class="mt-2 text-[12.5px] text-mist">准确率 = 判对的 ÷ 总数。全部 143 只都参与了训练（100% 训练）。</p>
    </div>`;
}

function confusionHtml(combo: TreeCombo): string {
  const [a, b] = combo.cm;
  const [aa, ab] = a;
  const [ba, bb] = b;
  const cell = (hit: boolean, v: number): string =>
    `<td class="mono-num">
       <span class="inline-flex min-w-14 items-center justify-center rounded-lg border px-3 py-2 text-base font-black ${
         hit ? 'border-emerald-200 bg-emerald-50 text-emerald-700' : 'border-rose-200 bg-rose-50 text-rose-700'
       }">${v}</span>
       <span class="block text-[10.5px] ${hit ? 'text-mist' : 'text-rose-600'}">${hit ? '判对' : '判错'}</span>
     </td>`;
  return `
    <div class="rounded-xl border border-polar-200 bg-white p-4">
      <div class="mb-2.5 flex items-center gap-2 text-[13px] font-black text-polar-800">
        <span class="flex h-6 w-6 items-center justify-center rounded-md bg-polar-500/15 text-polar-600">
          <svg viewBox="0 0 24 24" class="h-4 w-4" fill="none" aria-hidden="true"><path d="M4 5h16M4 12h16M4 19h16" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/><path d="M10 3v18M16 3v18" stroke="currentColor" stroke-width="1.2" opacity="0.35"/></svg>
        </span>
        混淆矩阵 · 模型的"判卷记录"
      </div>
      <table class="stat-table max-w-md">
        <thead>
          <tr>
            <th></th>
            <th>判成 阿德利</th>
            <th>判成 帽带</th>
          </tr>
        </thead>
        <tbody>
          <tr><th>真是 阿德利（${aa + ab}）</th>${cell(true, aa)}${cell(false, ab)}</tr>
          <tr><th>真是 帽带（${ba + bb}）</th>${cell(false, ba)}${cell(true, bb)}</tr>
        </tbody>
      </table>
      <p class="mt-2.5 text-[12.5px] leading-relaxed text-mist">
        横看"真实身份"，竖看"模型判断"。<b class="text-ink">玫红色格子是模型犯的错</b>——数一数 ${ab + ba} 次错误里，它把谁认成了谁？
      </p>
    </div>`;
}

function rulesHtml(combo: TreeCombo): string {
  const items = combo.rules
    .map(
      (rule) => `
        <li class="flex items-start gap-3 rounded-xl border border-polar-100 bg-polar-50/70 px-4 py-3">
          <span class="mt-1 h-3 w-3 shrink-0 rounded-full ring-2 ring-white" style="background:${classColor(rule.predict)}"></span>
          <div class="min-w-0">
            <p class="text-[13.5px] font-bold leading-snug text-ink">
              如果 <span class="mono-num text-polar-700">${rule.if}</span>
              <span class="mx-1 text-polar-300">→</span>
              判为 <b style="color:${classColor(rule.predict)}">${rule.predict}</b>
            </p>
            <p class="mono-num mt-0.5 text-[11.5px] text-mist">
              叶子里 ${rule.samples} 只：${rule.nAdelie} 阿德利 / ${rule.nChinstrap} 帽带
            </p>
          </div>
        </li>`,
    )
    .join('');
  return `
    <div class="rounded-xl border border-polar-200 bg-white p-4">
      <div class="mb-2.5 text-[13px] font-black text-polar-800">模型学到的规则（人话版）</div>
      <ul class="grid gap-2">${items}</ul>
      <p class="mt-2.5 text-[12.5px] text-mist">规则方向：${treeData.meta.ruleDir}</p>
    </div>`;
}

function treeImageHtml(combo: TreeCombo): string {
  return `
    <div class="rounded-xl border border-polar-200 bg-white p-4">
      <div class="mb-2.5 flex flex-wrap items-center justify-between gap-2">
        <div class="text-[13px] font-black text-polar-800">AI 画出的决策树（sklearn 生成）</div>
        <span class="inline-flex items-center gap-1.5 rounded-full bg-polar-50 px-3 py-1 text-[11px] font-bold text-mist">
          <span class="h-2.5 w-2.5 rounded-full" style="background:${treeData.meta.palette.Adelie}"></span>偏阿德利
          <span class="ml-1.5 h-2.5 w-2.5 rounded-full" style="background:${treeData.meta.palette.Chinstrap}"></span>偏帽带
          颜色越深越确定
        </span>
      </div>
      <div class="overflow-x-auto rounded-lg bg-white ring-1 ring-polar-100">
        <img src="${combo.image}" alt="depth ${combo.depth}、min-leaf ${combo.minLeaf} 的决策树图" width="1300" height="720"
          class="h-auto w-full min-w-[560px]" loading="lazy" />
      </div>
      <p class="mt-2.5 text-[12.5px] leading-relaxed text-mist">
        从上往下读：每个方块是一次"提问"（挑哪个特征、阈值定在哪都是模型自己算的），gini 越小代表这一堆越"纯"，最下面一排是"答案叶子"。
      </p>
    </div>`;
}

function hintHtml(combo: TreeCombo): string {
  const combos = treeData.combos;
  const accOf = (d: number, l: number): number => combos[`d${d}-leaf${l}`]?.accuracy ?? -1;
  const lines: string[] = [];

  if (combo.depth === 1) {
    lines.push(
      '只许问 1 个问题，它就自动挑出了最有效的特征——和你在上一页找到的分界线接近吗？',
    );
  } else {
    const other = combos[`d1-leaf${combo.minLeaf}`];
    const accD1 = other?.accuracy ?? -1;
    lines.push(
      accD1 !== combo.accuracy
        ? `允许问第 2 个问题后，成绩从 ${percent(accD1)} 变成了 ${percent(combo.accuracy)}——多一层，边界就能画得更细。`
        : other && other.rules.length === combo.rules.length
          ? `depth 从 1 调到 2，两棵树完全一样：min-leaf = ${combo.minLeaf} 太大了，第一层切完每一堆都不够 ${combo.minLeaf} 只，第二层根本切不动。`
          : 'depth 从 1 调到 2，成绩一点没变：多出来的一层只是把叶子切得更"纯"，并没有改变判断——模型的"核心规则"其实就一条。',
    );
  }

  const otherLeaf = combo.minLeaf === 60 ? 10 : 60;
  const accOtherLeaf = accOf(combo.depth, otherLeaf);
  lines.push(
    accOtherLeaf === combo.accuracy
      ? `min-leaf = ${otherLeaf} 和 ${combo.minLeaf} 的成绩一模一样：两种参数学到的是同一条判断，差别只在树的样子和叶子的"纯度"（gini）。`
      : `每片叶子最少 ${combo.minLeaf} 只——对比 min-leaf = ${otherLeaf}（${percent(accOtherLeaf)}），看看规则变细后成绩怎么变。`,
  );

  return `
    <div class="mt-4 flex items-start gap-2.5 rounded-xl border border-dashed border-polar-300 bg-polar-50 px-4 py-3">
      <span class="mt-0.5 shrink-0 text-polar-500">
        <svg viewBox="0 0 24 24" class="h-4.5 w-4.5" fill="none" aria-hidden="true"><circle cx="10.5" cy="10.5" r="6" stroke="currentColor" stroke-width="2"/><path d="m15.5 15.5 4.5 4.5" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>
      </span>
      <p class="text-[13px] leading-relaxed text-polar-700">${lines.join('')}</p>
    </div>`;
}

function narrativeCardHtml(meta: TreeMeta): string {
  return `
    <div class="card fade-up p-5 md:p-6">
      <div class="grid gap-4 md:grid-cols-2">
        <div class="rounded-xl border border-polar-200 bg-polar-50 p-4">
          <div class="flex items-center gap-2 text-[13px] font-black text-polar-800">
            <span class="flex h-7 w-7 items-center justify-center rounded-lg bg-polar-200 text-polar-700">
              <svg viewBox="0 0 24 24" class="h-4 w-4" fill="none" aria-hidden="true"><path d="M9 12h6M9 16h6M9 8h6" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/><rect x="4" y="3" width="16" height="18" rx="2" stroke="currentColor" stroke-width="1.8"/></svg>
            </span>
            以前：人来写规则
          </div>
          <p class="mt-2 text-[13px] leading-relaxed text-mist">
            在上一页，你像科学家一样<b class="text-ink">自己挑特征、自己找分界线</b>（比如"嘴长 ≤ 45 mm 就算阿德利"）。规则越好用，越靠人的经验。
          </p>
        </div>
        <div class="rounded-xl border border-beak/40 bg-beak-soft p-4">
          <div class="flex items-center gap-2 text-[13px] font-black text-beak-dark">
            <span class="flex h-7 w-7 items-center justify-center rounded-lg bg-beak text-white">
              <svg viewBox="0 0 24 24" class="h-4 w-4" fill="none" aria-hidden="true"><path d="M12 3.5 13.9 9l5.6.2-4.4 3.4 1.6 5.4-4.7-3.2-4.7 3.2 1.6-5.4L4.5 9.2 10.1 9z" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round"/></svg>
            </span>
            现在：AI 自己学规则
          </div>
          <p class="mt-2 text-[13px] leading-relaxed text-mist">
            这一次我们<b class="text-ink">只给答案、不给规则</b>：${meta.n} 只企鹅（${meta.nAdelie} 阿德利 / ${meta.nChinstrap} 帽带）、${meta.features.length} 个特征全部交给模型。<b class="text-ink">挑哪个特征、阈值定多少，它自己算。</b>
          </p>
        </div>
      </div>
      <p class="mt-3.5 text-[13px] leading-relaxed text-mist">
        这就是机器学习带来的一大变化：从<b class="text-ink">"人想规则"</b>变成<b class="text-ink">"人给例子，机器找规则"</b>。本页采用 100% 训练——
        全部 ${meta.n} 只企鹅都用来学习，不做考试划分，允许模型把数据记得更牢；我们重点观察它学出了什么。
      </p>
    </div>`;
}

function resultHtml(combo: TreeCombo): string {
  return `
    <div class="fade-up">
      <div class="grid gap-4 md:grid-cols-2">
        ${pickedHtml(combo)}
        ${accuracyHtml(combo)}
      </div>
      <div class="mt-4 grid gap-4 md:grid-cols-2">
        ${confusionHtml(combo)}
        ${rulesHtml(combo)}
      </div>
      <div class="mt-4">${treeImageHtml(combo)}</div>
      ${hintHtml(combo)}
    </div>`;
}

export function renderModel(container: HTMLElement): ModelTab {
  const meta = treeData.meta;

  container.innerHTML = `
    <div class="fade-up mb-7 flex items-start gap-4">
      <span class="mono-num flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-polar-800 text-sm font-bold text-white shadow-card">04</span>
      <div>
        <h2 class="text-xl font-black md:text-2xl">让 AI 自己学规则</h2>
        <p class="mt-1 max-w-3xl text-sm leading-relaxed text-mist">
          把区分阿德利和帽带的任务交给决策树模型：我们只提供数据与答案，规则由它自己学出来。调一调参数，看看它给出的规则和成绩。
        </p>
      </div>
    </div>

    ${narrativeCardHtml(meta)}
    <div id="model-params"></div>
    <div id="model-result"></div>

    <p class="mt-5 text-xs text-mist">
      数据：${meta.source}；模型：${meta.model}。树图由 scikit-learn 预先生成。
    </p>
  `;

  const paramsEl = container.querySelector<HTMLElement>('#model-params');
  const resultEl = container.querySelector<HTMLElement>('#model-result');
  const state: ModelParams = { depth: 1, minLeaf: 10 };

  function updateParams(): void {
    if (paramsEl) paramsEl.innerHTML = paramCardHtml(state);
  }

  function updateResult(): void {
    const combo = treeData.combos[comboKey(state)];
    if (!resultEl || !combo) return;
    resultEl.innerHTML = resultHtml(combo);
  }

  function updateAll(): void {
    updateParams();
    updateResult();
  }

  container.addEventListener('click', (e: Event) => {
    const btn = (e.target as HTMLElement).closest<HTMLButtonElement>('[data-param]');
    if (!btn) return;
    const group = btn.dataset.param;
    const value = Number(btn.dataset.value);
    if (group === 'depth' && (value === 1 || value === 2) && state.depth !== value) {
      state.depth = value;
      updateAll();
    } else if (group === 'leaf' && (value === 10 || value === 60) && state.minLeaf !== value) {
      state.minLeaf = value;
      updateAll();
    }
  });

  updateAll();

  return {
    onShow: () => undefined,
  };
}
