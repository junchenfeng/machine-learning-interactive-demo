// ABOUTME: 研究笔记独立页（/notes.html）：纸质笔记本 UI、笔记页签、未发布空态与 Markdown 渲染
import { marked } from 'marked';
import notesJson from '../data/research-notes.json';

export interface ResearchNote {
  id: number;
  title: string;
  subtitle: string;
  level: string;
  /** 发布时迁移的源文件（reports/*.md），未发布时只作提示用 */
  source: string;
  published: boolean;
  markdown: string;
}

const NOTES = notesJson as ResearchNote[];

/** 已发布的判断：published 为真且确实有正文 */
function hasContent(note: ResearchNote): boolean {
  return note.published && note.markdown.trim() !== '';
}

function tabHtml(note: ResearchNote, active: boolean): string {
  const look = active
    ? 'border-[#e6dcc4] bg-[#fdf9ef] text-ink shadow-[0_-8px_18px_-12px_rgba(18,50,79,0.4)]'
    : 'border-polar-200 bg-white/70 text-mist hover:-translate-y-0.5 hover:border-polar-300 hover:text-ink';
  return `
    <button type="button" data-note="${note.id}" aria-pressed="${active}"
      class="flex shrink-0 flex-col items-start gap-0.5 rounded-t-2xl border-2 border-b-0 px-4 pb-2.5 pt-2 text-left transition-all duration-200 md:px-5 ${look}">
      <span class="text-sm font-black">笔记 ${note.id}</span>
      <span class="mono-num text-[10px] font-bold ${active ? 'text-beak-dark' : 'text-mist/80'}">${note.level} · ${note.id === 3 ? '3 站' : '4 组参数'}</span>
    </button>`;
}

/** 未发布/未完成空态：不填写任何正文 */
function emptyHtml(note: ResearchNote): string {
  return `
    <div class="flex flex-col items-center justify-center gap-3 px-4 py-14 text-center md:py-20">
      <span class="flex h-14 w-14 items-center justify-center rounded-2xl border-2 border-dashed border-[#d8cbaa] bg-white/50 text-[#b9a97f]">
        <svg viewBox="0 0 24 24" class="h-6 w-6" fill="none" aria-hidden="true">
          <path d="M7 4h7l4 4v12H7z" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"/>
          <path d="M13.6 4.4V8.4h4M9.6 12.5h5M9.6 16h3.4" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/>
        </svg>
      </span>
      <div class="text-[15px] font-black text-ink">这份笔记还没有内容</div>
      <p class="max-w-md text-[13px] leading-relaxed text-mist">
        课后和你的 AI 学习伙伴一起完成探究任务；完成并由老师发布后，这份笔记会自动写到这一页
        （源文件：<span class="mono-num">${note.source}</span>）。
      </p>
    </div>`;
}

/**
 * 页面上刊载的报告正文：只保留报告主体。
 * 兜底切掉「给 Agent 的指令」与「附录 · 对话流水」——附录与学生 AI 的对话原文一律不上页面。
 */
function reportBody(raw: string): string {
  let md = raw;
  const guide = md.search(/^#{1,3}\s*给\s*Agent\s*的指令[^\n]*\n/m);
  if (guide >= 0) {
    const after = md.slice(guide);
    const sep = after.search(/^---\s*$/m);
    md = sep < 0 ? '' : after.slice(sep).replace(/^---\s*\n+/, '');
  }
  const appendix = md.search(/^#{1,3}\s*附录/m);
  if (appendix >= 0) md = md.slice(0, appendix);
  return md.trim();
}

/** 结论章（第四章）由学生与 AI 讨论后自己写下，整章按手写体渲染 */
const HAND_CHAPTER = /^##\s*四、/m;

/** 表格套一层横向滚动容器：列多、表头长时也不会撑出纸页边界 */
function wrapTables(scope: HTMLElement): void {
  scope.querySelectorAll('table').forEach((table) => {
    if (table.parentElement?.classList.contains('note-table-scroll')) return;
    const box = document.createElement('div');
    box.className = 'note-table-scroll';
    table.replaceWith(box);
    box.append(table);
  });
}

function contentHtml(note: ResearchNote): string {
  if (!hasContent(note)) return emptyHtml(note);
  const body = reportBody(note.markdown);
  const cut = body.search(HAND_CHAPTER);
  const preset = cut < 0 ? body : body.slice(0, cut).trim();
  const hand = cut < 0 ? '' : body.slice(cut).trim();
  const handHtml = hand === '' ? '' : marked(hand, { async: false });
  return `
    <header class="mb-5 border-b border-dashed border-[#ddd2b8] pb-3">
      <div class="flex flex-wrap items-center gap-2">
        <h2 class="text-[19px] font-black leading-snug text-ink">${note.title}</h2>
        <span class="rounded-full bg-beak-soft px-2.5 py-0.5 text-[11px] font-black text-beak-dark">${note.level}</span>
      </div>
      <p class="mono-num mt-1 text-[11.5px] text-mist">${note.subtitle}</p>
    </header>
    <article class="note-prose">${marked(preset, { async: false })}</article>
    ${
      handHtml === ''
        ? ''
        : `<section class="note-hand-block">
      <span class="note-hand-tag">
        <svg viewBox="0 0 24 24" class="h-3.5 w-3.5" fill="none" aria-hidden="true">
          <path d="M4 20h4L20 8l-4-4L4 16z" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"/>
          <path d="M14.5 5.5L18.5 9.5" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/>
        </svg>
        我的结论 · 我和 AI 讨论后自己写下
      </span>
      <article class="note-prose">${handHtml}</article>
    </section>`
    }`;
}

export function renderNotesPage(root: HTMLElement): void {
  let activeId = NOTES[0]?.id ?? 1;

  root.innerHTML = `
    <header class="relative overflow-hidden bg-gradient-to-br from-polar-900 via-polar-800 to-polar-700 text-white">
      <div class="pointer-events-none absolute inset-0" aria-hidden="true">
        <svg class="absolute -right-16 -top-20 h-72 w-[34rem] text-polar-500/35" viewBox="0 0 400 240" fill="none">
          <path d="M-20 150c60-70 120-40 170-85s110-40 170 10 90 20 100 5" stroke="currentColor" stroke-width="26" stroke-linecap="round" opacity="0.35"/>
          <path d="M-20 190c70-60 130-30 180-70s105-35 165 5" stroke="currentColor" stroke-width="14" stroke-linecap="round" opacity="0.25"/>
        </svg>
        <svg class="absolute bottom-0 left-0 h-16 w-full text-[#f4efe2]" viewBox="0 0 1440 90" preserveAspectRatio="none" aria-hidden="true">
          <path d="M0 90V60C240 20 480 10 720 35s480 40 720 10v45z" fill="currentColor"/>
        </svg>
      </div>
      <div class="relative mx-auto flex max-w-5xl flex-wrap items-end justify-between gap-4 px-5 pb-12 pt-9">
        <div>
          <span class="inline-flex items-center gap-2 rounded-full border border-white/25 bg-white/10 px-3.5 py-1.5 text-xs font-bold tracking-wider">
            <span class="h-2 w-2 rounded-full bg-beak"></span>
            RESEARCH NOTES · 课后探究作业
          </span>
          <h1 class="mt-4 text-3xl font-black leading-tight md:text-[2.4rem]">研究笔记</h1>
          <p class="mt-2 max-w-2xl text-sm leading-relaxed text-polar-100">
            这里是你的探究作业本。笔记 1 是必做，笔记 2 选做，笔记 3 是训练/验证切分与三站网格搜索——
            完成后由老师发布，内容就会出现在对应的页签里。
          </p>
        </div>
        <a href="/index.html"
          class="group inline-flex shrink-0 items-center gap-2 rounded-xl border border-white/25 bg-white/10 px-4 py-2.5 text-sm font-bold text-white transition-all hover:-translate-y-0.5 hover:bg-white/20">
          <svg viewBox="0 0 24 24" class="h-4 w-4 transition-transform group-hover:-translate-x-0.5" fill="none" aria-hidden="true">
            <path d="M15 6l-6 6 6 6" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
          </svg>
          返回观测站
        </a>
      </div>
    </header>

    <main class="mx-auto max-w-5xl px-4 pb-16 md:px-5">
      <nav id="notes-tabs" class="-mb-[2px] flex flex-wrap items-end gap-1.5 pl-1" aria-label="研究笔记页签"></nav>
      <section id="notes-sheet" class="paper-sheet relative px-6 py-8 md:px-12 md:py-11"></section>
      <p class="mt-4 pl-1 text-xs leading-relaxed text-mist">
        笔记数字全部来自预计算事实源（<span class="mono-num">reports/data/*.json</span>），由你的 AI 学习伙伴整理；
        未完成的笔记不会显示任何内容。
      </p>
    </main>
  `;

  const tabsEl = root.querySelector<HTMLElement>('#notes-tabs');
  const sheetEl = root.querySelector<HTMLElement>('#notes-sheet');

  function update(): void {
    if (tabsEl) {
      tabsEl.innerHTML = NOTES.map((n) => tabHtml(n, n.id === activeId)).join('');
    }
    const active = NOTES.find((n) => n.id === activeId);
    if (sheetEl && active) {
      sheetEl.innerHTML = contentHtml(active);
      wrapTables(sheetEl);
      sheetEl.classList.remove('fade-up');
      // 触发一次重排，保证切页签时淡入动画重播
      void sheetEl.offsetWidth;
      sheetEl.classList.add('fade-up');
    }
  }

  root.addEventListener('click', (e: Event) => {
    const btn = (e.target as HTMLElement).closest<HTMLButtonElement>('[data-note]');
    if (!btn) return;
    const id = Number(btn.dataset.note);
    if (Number.isFinite(id) && id !== activeId) {
      activeId = id;
      update();
    }
  });

  update();
}
