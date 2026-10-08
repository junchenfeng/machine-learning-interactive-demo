// ABOUTME: Tab2 认识数据集：数据来源档案、字段说明、物种×变量统计表
import { ALL_SPECIES, SPECIES_META, data, formatNumber } from '../data/dataset';
import { symbolSvg } from '../charts/penguin-chart';
import type { Species, VarStat } from '../data/types';
import type { SpeciesStat } from '../data/types';

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

function statCell(v: VarStat, decimals: number): string {
  const mean = v.mean === null ? '—' : formatNumber(v.mean, decimals);
  const sd = v.sd === null ? '' : formatNumber(v.sd, decimals);
  return `<td class="mono-num">${mean} <span class="text-mist">±</span> ${sd}</td>`;
}

function statRow(sp: Species): string {
  const s: SpeciesStat = data.stats[sp];
  const m = SPECIES_META[sp];
  const massMean = s.mass.mean === null ? '—' : formatNumber(Math.round(s.mass.mean));
  const massSd = s.mass.sd === null ? '' : formatNumber(Math.round(s.mass.sd));
  return `
    <tr>
      <td class="text-left">
        <span class="inline-flex items-center gap-2 font-bold" style="color:${m.color}">${symbolSvg(m.symbol, m.color, 12)} ${sp}</span>
        <span class="block text-xs text-mist">${m.cn}</span>
      </td>
      <td class="mono-num font-bold">${s.n}</td>
      <td class="mono-num"><span class="text-maleblue font-bold">公 ${s.male}</span><span class="text-mist"> / </span><span class="text-femalepink font-bold">母 ${s.female}</span></td>
      ${statCell(s.billLength, 1)}
      ${statCell(s.billDepth, 1)}
      ${statCell(s.flipper, 1)}
      <td class="mono-num">${massMean} <span class="text-mist">±</span> ${massSd}</td>
    </tr>`;
}

interface FieldCard {
  name: string;
  en: string;
  kind: string;
  kindColor: string;
  sample: string;
}

const FIELD_CARDS: FieldCard[] = [
  { name: '物种', en: 'species', kind: '分类', kindColor: '#3D6FB4', sample: 'Adelie / Chinstrap / Gentoo' },
  { name: '居住岛屿', en: 'island', kind: '分类', kindColor: '#1FA9C9', sample: 'Torgersen / Biscoe / Dream' },
  { name: '公母', en: 'sex', kind: '分类', kindColor: '#E15A85', sample: 'female / male' },
  { name: '观测年份', en: 'year', kind: '分类', kindColor: '#7FA53C', sample: '2007 / 2008 / 2009' },
  { name: '嘴的长度', en: 'bill_length_mm', kind: '数值', kindColor: '#D2601F', sample: '39.1 毫米' },
  { name: '嘴的厚度', en: 'bill_depth_mm', kind: '数值', kindColor: '#D2601F', sample: '18.7 毫米' },
  { name: '翅膀长度', en: 'flipper_length_mm', kind: '数值', kindColor: '#D2601F', sample: '181 毫米' },
  { name: '体重', en: 'body_mass_g', kind: '数值', kindColor: '#D2601F', sample: '3,750 克' },
];

export function renderDatasetIntro(el: HTMLElement): void {
  const c = data.counts;
  const adelieBL = data.stats.Adelie.billLength;
  const chinstrapBL = data.stats.Chinstrap.billLength;
  const gentooMass = data.stats.Gentoo.mass;
  const adelieMass = data.stats.Adelie.mass;
  const gentooBD = data.stats.Gentoo.billDepth;

  const massGap = gentooMass.mean !== null && adelieMass.mean !== null
    ? formatNumber(Math.round(gentooMass.mean - adelieMass.mean))
    : '—';
  const blGap = adelieBL.mean !== null && chinstrapBL.mean !== null
    ? formatNumber(Number((chinstrapBL.mean - adelieBL.mean).toFixed(1)), 1)
    : '—';

  el.innerHTML = `
    ${sectionHeader('02', '读懂数据集', '科学家怎么描述一只企鹅？除了"名字"，他们还用尺子和秤测量身体。这一站带你认识每个字段，并从统计表中先睹为快。')}

    <!-- 数据集档案 -->
    <div class="card fade-up p-6 md:p-7">
      <div class="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div class="rounded-xl bg-polar-50 p-4">
          <div class="mono-num text-2xl font-black text-polar-800">${c.total}</div>
          <div class="text-sm font-bold text-mist">只企鹅的体检记录</div>
        </div>
        <div class="rounded-xl bg-polar-50 p-4">
          <div class="mono-num text-2xl font-black text-polar-800">2007-09</div>
          <div class="text-sm font-bold text-mist">三个科考季（按年划分数据）</div>
        </div>
        <div class="rounded-xl bg-polar-50 p-4">
          <div class="mono-num text-2xl font-black text-polar-800">3</div>
          <div class="text-sm font-bold text-mist">座繁殖岛（南极帕默群岛）</div>
        </div>
        <div class="rounded-xl bg-polar-50 p-4">
          <div class="mono-num text-2xl font-black text-polar-800">8</div>
          <div class="text-sm font-bold text-mist">个字段（4 分类 + 4 连续变量）</div>
        </div>
      </div>
      <p class="mt-4 text-sm leading-relaxed text-mist">
        数据由 <b class="text-ink">Kristen Gorman 博士</b>所在科考队在南极帕默科考站（Palmer Station LTER）采集：
        每次遇到企鹅，先辨认物种、记录岛屿与年份，再量一量嘴和翅膀、称一称体重，最后判断公母。
      </p>
    </div>

    <!-- 测量方式 -->
    <div class="card fade-up mt-8 grid gap-6 p-6 md:grid-cols-2 md:p-7">
      <div class="flex items-center justify-center rounded-2xl bg-polar-50 p-4">
        <img src="/culmen_depth.png" alt="嘴的长度与厚度测量示意" class="w-full max-w-md object-contain" loading="lazy" />
      </div>
      <div class="flex flex-col justify-center gap-3">
        <h3 class="text-lg font-black">尺子怎么量？</h3>
        <ul class="space-y-2.5 text-sm leading-relaxed">
          <li class="flex gap-2"><span class="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-beak"></span><span><b>嘴的长度</b>（bill_length_mm）：沿嘴峰中线，从嘴角量到嘴尖。</span></li>
          <li class="flex gap-2"><span class="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-beak"></span><span><b>嘴的厚度</b>（bill_depth_mm）：上下嘴壳之间"竖着"的厚度。</span></li>
          <li class="flex gap-2"><span class="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-beak"></span><span><b>翅膀长度</b>（flipper_length_mm）：翅膀折叠时的长度。</span></li>
          <li class="flex gap-2"><span class="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-beak"></span><span><b>体重</b>（body_mass_g）：用弹簧秤称量（示意图：Allison Horst，CC-BY）。</span></li>
        </ul>
      </div>
    </div>

    <!-- 字段说明 -->
    <h3 class="fade-up mt-10 mb-4 text-lg font-black">数据表的 8 个字段</h3>
    <div class="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      ${FIELD_CARDS.map((f) => `
        <div class="card card-hover p-4">
          <div class="flex items-center justify-between gap-2">
            <span class="font-bold">${f.name}</span>
            <span class="rounded-full px-2 py-0.5 text-[11px] font-bold" style="background:${f.kindColor}1a;color:${f.kindColor}">${f.kind}</span>
          </div>
          <div class="mono-num mt-1.5 text-xs text-mist">${f.en}</div>
          <div class="mono-num mt-2.5 rounded-lg bg-polar-50 px-2.5 py-1.5 text-[13px] text-polar-700">${f.sample}</div>
        </div>`).join('')}
    </div>

    <!-- 统计表 -->
    <div class="card fade-up mt-10 overflow-hidden">
      <div class="flex flex-wrap items-center justify-between gap-2 border-b border-polar-100 px-6 py-4">
        <h3 class="text-lg font-black">三个物种的统计画像</h3>
        <span class="mono-num text-xs text-mist">全部 ${c.total} 条观测 · 均值 ± 标准差</span>
      </div>
      <div class="overflow-x-auto px-3 py-2">
        <table class="stat-table">
          <thead>
            <tr>
              <th class="text-left">物种</th>
              <th>数量 n</th>
              <th>公 / 母</th>
              <th>嘴的长度<span class="block text-[11px] font-normal text-mist">毫米</span></th>
              <th>嘴的厚度<span class="block text-[11px] font-normal text-mist">毫米</span></th>
              <th>翅膀长度<span class="block text-[11px] font-normal text-mist">毫米</span></th>
              <th>体重<span class="block text-[11px] font-normal text-mist">克</span></th>
            </tr>
          </thead>
          <tbody>${ALL_SPECIES.map(statRow).join('')}</tbody>
        </table>
      </div>
      <p class="border-t border-polar-100 bg-polar-50/60 px-6 py-3 text-xs leading-relaxed text-mist">
        注：公 / 母列为已记录性别的样本数（有 ${c.sexMissing} 条记录未记录性别）；个别记录存在测量缺失，各变量按其有效样本计算。
      </p>
    </div>

    <!-- 先睹为快 -->
    <h3 class="fade-up mt-10 mb-4 text-lg font-black">先睹为快：表格里藏着的三个发现</h3>
    <div class="grid gap-4 md:grid-cols-3">
      <div class="card card-hover p-5">
        <div class="flex items-center gap-2 text-sm font-black text-gentoo">${symbolSvg('rect', SPECIES_META.Gentoo.color, 12)} 发现 1 · 谁是"大块头"</div>
        <p class="mt-2 text-sm leading-relaxed text-ink/90">Gentoo 平均体重 ${gentooMass.mean === null ? '—' : formatNumber(Math.round(gentooMass.mean))} 克，比 Adelie 重约 <b class="mono-num">${massGap}</b> 克——体型一眼就能认出 Gentoo。</p>
      </div>
      <div class="card card-hover p-5">
        <div class="flex items-center gap-2 text-sm font-black text-chinstrap">${symbolSvg('triangle', SPECIES_META.Chinstrap.color, 12)} 发现 2 · 体重像，嘴不像</div>
        <p class="mt-2 text-sm leading-relaxed text-ink/90">Chinstrap 和 Adelie 体重相仿，但 Chinstrap 的嘴平均长 <b class="mono-num">${chinstrapBL.mean === null ? '—' : formatNumber(chinstrapBL.mean, 1)}</b> 毫米，比 Adelie 的 <b class="mono-num">${adelieBL.mean === null ? '—' : formatNumber(adelieBL.mean, 1)}</b> 毫米长约 <b class="mono-num">${blGap}</b> 毫米。</p>
      </div>
      <div class="card card-hover p-5">
        <div class="flex items-center gap-2 text-sm font-black text-adelie">${symbolSvg('circle', SPECIES_META.Adelie.color, 12)} 发现 3 · Gentoo 嘴更"薄"</div>
        <p class="mt-2 text-sm leading-relaxed text-ink/90">Gentoo 的嘴厚平均约 <b class="mono-num">${gentooBD.mean === null ? '—' : formatNumber(gentooBD.mean, 1)}</b> 毫米，明显小于另两种的 18 毫米上下。</p>
      </div>
    </div>
  `;
}
