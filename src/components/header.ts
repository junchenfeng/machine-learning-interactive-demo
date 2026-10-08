// ABOUTME: 页面外壳：顶部横幅、Tab 导航（吸顶）、主内容容器与页脚
export type TabId = 'species' | 'dataset' | 'explore' | 'classify' | 'model';

export interface TabDef {
  id: TabId;
  label: string;
  step: string;
}

export const TABS: TabDef[] = [
  { id: 'species', label: '认识企鹅', step: '01' },
  { id: 'dataset', label: '认识数据集', step: '02' },
  { id: 'explore', label: '探索分析', step: '03' },
  { id: 'classify', label: '初步分类', step: '04' },
  { id: 'model', label: '训练决策树', step: '05' },
];

function iconPenguin(): string {
  return `<svg viewBox="0 0 24 24" class="h-4 w-4" aria-hidden="true">
    <path d="M12 2.6c-2.9 0-4.7 3.3-4.7 7.8 0 3.5 1 7 2.4 9.1.4.6 1.2.6 1.6 0l.7-1.1.7 1.1c.4.6 1.2.6 1.6 0 1.4-2.1 2.4-5.6 2.4-9.1 0-4.5-1.8-7.8-4.7-7.8z" fill="currentColor"/>
    <circle cx="10.2" cy="8" r="1.05" fill="#fff"/>
    <circle cx="13.8" cy="8" r="1.05" fill="#fff"/>
  </svg>`;
}

function iconTable(): string {
  return `<svg viewBox="0 0 24 24" class="h-4 w-4" fill="none" aria-hidden="true">
    <rect x="3" y="4" width="18" height="16" rx="2" stroke="currentColor" stroke-width="1.8"/>
    <path d="M3 9.5h18M3 15h18M9.5 9.5V20M15.5 9.5V20" stroke="currentColor" stroke-width="1.8"/>
  </svg>`;
}

function iconScatter(): string {
  return `<svg viewBox="0 0 24 24" class="h-4 w-4" fill="none" aria-hidden="true">
    <path d="M4 4v16h16" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/>
    <circle cx="9" cy="9" r="1.7" fill="currentColor"/>
    <circle cx="14" cy="13" r="1.7" fill="currentColor"/>
    <circle cx="17.5" cy="7.5" r="1.7" fill="currentColor"/>
  </svg>`;
}

function iconClassify(): string {
  return `<svg viewBox="0 0 24 24" class="h-4 w-4" fill="none" aria-hidden="true">
    <path d="M4 4v16h16" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/>
    <path d="M7.5 18.5 20 6" stroke="currentColor" stroke-width="1.8" stroke-dasharray="2.5 2.2" stroke-linecap="round"/>
    <circle cx="9.5" cy="9" r="1.7" fill="currentColor"/>
    <circle cx="12.5" cy="12" r="1.7" fill="currentColor"/>
    <circle cx="17.5" cy="16.5" r="1.7" fill="currentColor"/>
    <circle cx="18.5" cy="9.5" r="1.7" fill="currentColor"/>
  </svg>`;
}

function iconTree(): string {
  return `<svg viewBox="0 0 24 24" class="h-4 w-4" fill="none" aria-hidden="true">
    <path d="M12 3v5m0 0-5.5 4.5V19M12 8l5.5 4.5V19" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/>
    <circle cx="6.5" cy="20.4" r="1.6" fill="currentColor"/>
    <circle cx="17.5" cy="20.4" r="1.6" fill="currentColor"/>
    <rect x="10.4" y="2" width="3.2" height="3.2" rx="0.8" fill="currentColor"/>
  </svg>`;
}

export function tabIcon(id: TabId): string {
  if (id === 'species') return iconPenguin();
  if (id === 'dataset') return iconTable();
  if (id === 'classify') return iconClassify();
  if (id === 'model') return iconTree();
  return iconScatter();
}

export function renderShell(root: HTMLElement): void {
  root.innerHTML = `
    <header class="relative overflow-hidden bg-gradient-to-br from-polar-900 via-polar-800 to-polar-700 text-white">
      <div class="pointer-events-none absolute inset-0" aria-hidden="true">
        <svg class="absolute -right-10 -top-16 h-72 w-[36rem] text-polar-500/40" viewBox="0 0 400 240" fill="none">
          <path d="M-20 150c60-70 120-40 170-85s110-40 170 10 90 20 100 5" stroke="currentColor" stroke-width="26" stroke-linecap="round" opacity="0.35"/>
          <path d="M-20 190c70-60 130-30 180-70s105-35 165 5" stroke="currentColor" stroke-width="14" stroke-linecap="round" opacity="0.25"/>
        </svg>
        <svg class="absolute bottom-0 left-0 h-20 w-full text-polar-50" viewBox="0 0 1440 90" preserveAspectRatio="none" aria-hidden="true">
          <path d="M0 90V55C240 15 480 5 720 30s480 40 720 10v50z" fill="currentColor"/>
        </svg>
      </div>
      <div class="relative mx-auto max-w-6xl px-5 pb-14 pt-10 md:pt-14">
        <span class="inline-flex items-center gap-2 rounded-full border border-white/25 bg-white/10 px-3.5 py-1.5 text-xs font-bold tracking-wider">
          <span class="h-2 w-2 rounded-full bg-beak"></span>
          PALMER STATION · 南极长期生态观测计划（LTER）
        </span>
        <h1 class="mt-4 text-3xl font-black leading-tight md:text-[2.6rem]">企鹅数据观测站</h1>
        <p class="mt-2 max-w-2xl text-sm leading-relaxed text-polar-100 md:text-base">
          欢迎加入见习科考队！南极帕默群岛住着三种企鹅，我们收集了它们三年间
          <b class="text-white">344 份</b>体检记录。一步步来：先认识朋友，再读懂数据，像科学家一样探索，最后让 AI 自己学规则。
        </p>
        <div class="mono-num mt-5 flex flex-wrap gap-2 text-xs">
          <span class="rounded-md bg-white/10 px-2.5 py-1.5">344 只企鹅</span>
          <span class="rounded-md bg-white/10 px-2.5 py-1.5">2007 - 2009 三次科考季</span>
          <span class="rounded-md bg-white/10 px-2.5 py-1.5">3 座繁殖岛</span>
          <span class="rounded-md bg-white/10 px-2.5 py-1.5">4 个身体特征</span>
        </div>
      </div>
    </header>

    <nav id="tab-nav" class="sticky top-0 z-30 border-b border-white/10 bg-polar-900/95 shadow-[0_4px_16px_rgba(7,28,51,0.25)] backdrop-blur">
      <div class="mx-auto flex max-w-6xl items-center gap-1.5 px-5 py-2.5 md:gap-2">
        ${TABS.map((t) => `
          <button type="button" data-tab="${t.id}" aria-pressed="false"
            class="tab-btn flex flex-1 items-center justify-center gap-2 rounded-xl px-3 py-2.5 text-sm font-bold text-polar-200 transition-colors hover:bg-white/10 md:flex-none md:px-5">
            <span class="tab-icon">${tabIcon(t.id)}</span>
            <span class="hidden sm:inline mono-num text-[10px] font-bold text-polar-400">${t.step}</span>
            <span>${t.label}</span>
          </button>
        `).join('')}
        <a href="/notes.html"
          class="ml-auto hidden shrink-0 items-center gap-2 rounded-xl border border-beak/40 bg-beak-soft px-3.5 py-2.5 text-sm font-black text-beak-dark transition-all hover:-translate-y-0.5 hover:bg-beak hover:text-white md:inline-flex">
          <svg viewBox="0 0 24 24" class="h-4 w-4" fill="none" aria-hidden="true">
            <path d="M7 4h7l4 4v12H7z" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"/>
            <path d="M9.6 12.5h5M9.6 16h3.4" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/>
          </svg>
          研究笔记
        </a>
      </div>
    </nav>

    <main class="mx-auto max-w-6xl px-5 py-8 md:py-10">
      <section id="panel-species"></section>
      <section id="panel-dataset" class="hidden"></section>
      <section id="panel-explore" class="hidden"></section>
      <section id="panel-classify" class="hidden"></section>
      <section id="panel-model" class="hidden"></section>
    </main>

    <footer class="border-t border-polar-100 bg-white">
      <div class="mx-auto max-w-6xl px-5 py-6 text-xs leading-relaxed text-mist">
        <p class="font-bold text-ink">数据来源与致谢</p>
        <p class="mt-1">
          企鹅数据来自美国长期生态观测计划（PAL-LTER），由 Kristen Gorman 博士与帕默科考站整理；
          企鹅插画出自 Allison Horst（CC-BY 许可），仅用于课堂教学。本站为教学脚手架，非商业用途。
        </p>
      </div>
    </footer>
  `;
}

export function activateTab(root: HTMLElement, active: TabId): void {
  const buttons = root.querySelectorAll<HTMLButtonElement>('#tab-nav .tab-btn');
  for (const btn of buttons) {
    const isActive = btn.dataset.tab === active;
    btn.setAttribute('aria-pressed', String(isActive));
    btn.classList.toggle('bg-white', isActive);
    btn.classList.toggle('text-polar-800', isActive);
    btn.classList.toggle('shadow-card', isActive);
    btn.classList.toggle('hover:bg-white/10', !isActive);
  }
}
