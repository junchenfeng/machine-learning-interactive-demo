// ABOUTME: Tab1 认识三种企鹅：物种卡片（线上插画/官方插画）+ 体型对比图
import { ALL_SPECIES, SPECIES_META, data, formatNumber } from '../data/dataset';
import { symbolSvg } from '../charts/penguin-chart';
import type { Species } from '../data/types';

function sectionHeader(step: string, title: string, desc: string): string {
  return `
    <div class="fade-up mb-7 flex items-start gap-4">
      <span class="mono-num flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-polar-800 text-sm font-bold text-white shadow-card">${step}</span>
      <div>
        <h2 class="text-xl font-black md:text-2xl">${title}</h2>
        <p class="mt-1 max-w-3xl text-sm leading-relaxed text-mist">${desc}</p>
      </div>
    </div>`;
}

function speciesCard(sp: Species, index: number): string {
  const m = SPECIES_META[sp];
  const st = data.stats[sp];
  return `
    <article class="card card-hover fade-up delay-${index + 1} overflow-hidden">
      <div class="relative">
        <img src="${m.image}" alt="${m.cn}手绘插画" class="h-48 w-full object-cover sm:h-56" loading="lazy" />
        <span class="absolute left-3 top-3 inline-flex items-center gap-1.5 rounded-full bg-white/95 px-2.5 py-1 text-xs font-black shadow-card" style="color:${m.color}">
          ${symbolSvg(m.symbol, m.color, 11)} 图表中：${m.symbolLabel}
        </span>
      </div>
      <div class="space-y-3.5 p-5">
        <div>
          <h3 class="text-lg font-black">${m.cn} <span class="ml-1 text-sm font-bold text-mist">${sp}</span></h3>
          <p class="text-xs italic text-mist">${m.latin}</p>
          <p class="mt-1.5 text-sm font-bold" style="color:${m.color}">${m.tagline}</p>
        </div>
        <ul class="space-y-1.5 text-sm leading-relaxed text-ink/90">
          ${m.traits.map((t) => `
            <li class="flex gap-2">
              <span class="mt-[7px] h-1.5 w-1.5 shrink-0 rounded-full" style="background:${m.color}"></span>
              <span>${t}</span>
            </li>`).join('')}
        </ul>
        <div class="grid grid-cols-3 gap-1 rounded-xl bg-polar-50 p-3 text-center">
          <div>
            <div class="mono-num text-base font-bold text-polar-800">${formatNumber(st.mass.mean ?? 0)}</div>
            <div class="text-[11px] leading-tight text-mist">平均体重（克）</div>
          </div>
          <div>
            <div class="mono-num text-base font-bold text-polar-800">${formatNumber(st.flipper.mean ?? 0)}</div>
            <div class="text-[11px] leading-tight text-mist">平均翅长（毫米）</div>
          </div>
          <div>
            <div class="mono-num text-base font-bold text-polar-800">${st.n}</div>
            <div class="text-[11px] leading-tight text-mist">观测记录（条）</div>
          </div>
        </div>
        <div class="rounded-xl border border-beak/25 bg-beak-soft p-3 text-[13px] leading-relaxed">
          <span class="font-black text-beak-dark">你知道吗？</span>${m.fact}
        </div>
      </div>
    </article>`;
}

export function renderSpeciesIntro(el: HTMLElement): void {
  const adelieMass = data.stats.Adelie.mass.mean ?? 0;
  const gentooMass = data.stats.Gentoo.mass.mean ?? 0;
  const diff = Math.round(gentooMass - adelieMass);

  el.innerHTML = `
    ${sectionHeader('01', '认识我们的企鹅朋友', '南极帕默群岛生活着三种企鹅：阿德利企鹅、帽带企鹅和巴布亚企鹅。它们都穿着黑白"礼服"，但头部特征完全不同——先记住各自的"标配"，后面的数据分析会用到这些知识！')}
    <div class="grid gap-6 md:grid-cols-3">
      ${ALL_SPECIES.map((sp, i) => speciesCard(sp, i)).join('')}
    </div>

    <div class="card card-hover fade-up mt-8 grid gap-6 p-6 md:grid-cols-2 md:p-8">
      <div class="flex items-center justify-center rounded-2xl bg-polar-50 p-4">
        <img src="/lter_penguins.png" alt="三种企鹅体型对比插画" class="w-full max-w-md object-contain" loading="lazy" />
      </div>
      <div class="flex flex-col justify-center gap-3">
        <h3 class="text-lg font-black">三兄弟同框 · 体型对比</h3>
        <p class="text-sm leading-relaxed text-mist">
          插画从左到右依次是 Chinstrap、Gentoo、Adelie（插画：Allison Horst，CC-BY）。
          巴布亚企鹅是明显的"大块头"，而阿德利企鹅是最小的那位。
        </p>
        <ul class="space-y-2 text-sm">
          <li class="flex items-center gap-2">${symbolSvg('circle', SPECIES_META.Adelie.color)} <b>Adelie</b>：平均体重约 ${formatNumber(adelieMass)} 克，三种中最轻</li>
          <li class="flex items-center gap-2">${symbolSvg('triangle', SPECIES_META.Chinstrap.color)} <b>Chinstrap</b>：与 Adelie 体重相近，但嘴更长</li>
          <li class="flex items-center gap-2">${symbolSvg('rect', SPECIES_META.Gentoo.color)} <b>Gentoo</b>：平均体重约 ${formatNumber(gentooMass)} 克，比 Adelie 重约 ${formatNumber(diff)} 克</li>
        </ul>
        <div class="rounded-xl border border-polar-200 bg-polar-50 p-3 text-[13px] leading-relaxed text-polar-700">
          <b>小任务：</b>卡片上方的色点（圆点 / 三角 / 方块）会贯穿整个观测站——在第三站"探索分析"的图表里，我们就用它们区分三种企鹅。
        </div>
      </div>
    </div>
  `;
}
