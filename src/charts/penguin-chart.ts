// ABOUTME: 散点图封装（ECharts 按需引入）：顶部 HTML 图例 + 白底散点，支持分类分界线与误判点标记
import * as echarts from 'echarts/core';
import { LineChart, ScatterChart } from 'echarts/charts';
import { GridComponent, MarkLineComponent, TooltipComponent } from 'echarts/components';
import { CanvasRenderer } from 'echarts/renderers';
import type { ComposeOption } from 'echarts/core';
import type { LineSeriesOption, ScatterSeriesOption } from 'echarts/charts';
import type {
  GridComponentOption,
  TooltipComponentOption,
} from 'echarts/components';
import {
  ALL_SPECIES,
  FEATURES,
  SEX_META,
  SPECIES_META,
  formatNumber,
  getFeatureValue,
} from '../data/dataset';
import type { FeatureKey, PenguinRecord, Sex, Species } from '../data/types';

echarts.use([LineChart, ScatterChart, GridComponent, MarkLineComponent, TooltipComponent, CanvasRenderer]);

export type ChartOption = ComposeOption<
  LineSeriesOption | ScatterSeriesOption | GridComponentOption | TooltipComponentOption
>;

/** 从组合类型中提取坐标轴选项（ECharts 未从子模块直接导出轴类型） */
type XAxisOption = NonNullable<ChartOption['xAxis']>;
type YAxisOption = NonNullable<ChartOption['yAxis']>;

export type ExploreMode = 'species' | 'sex';

export interface ExploreChartOptions {
  mode: ExploreMode;
  features: FeatureKey[];
  records: PenguinRecord[];
  /** 初步分类页的分界线；探索分析页不传 */
  decisionLine?: DecisionLine | null;
  /** 被分错的记录引用集合（初步分类页）：图上加粗红描边，与混淆矩阵红格对应 */
  misSet?: Set<PenguinRecord> | null;
}

interface ChartDatum {
  value: [number, number];
  species: Species;
  sex: Sex | null;
  mis: boolean;
}

const FEATURE_MAP = new Map(FEATURES.map((f) => [f.key, f]));
const MONO = 'ui-monospace, SF Mono, Cascadia Code, Consolas, Menlo, monospace';
const Q1_SPECIES: Species[] = ['Adelie', 'Chinstrap'];

/** 分类分界线（初步分类页使用，探索分析页不传则不画线） */
export interface DecisionLine {
  /** 单特征：x = cutoff 的垂直虚线 */
  vertical?: { x: number; label: string };
  /** 双特征：自动裁剪后的直线段端点 */
  segment?: { x1: number; y1: number; x2: number; y2: number; label: string };
}

/** 形状小图标（用于 HTML 图例） */
export function symbolSvg(kind: 'circle' | 'triangle' | 'rect', color: string, size = 13): string {
  if (kind === 'circle') {
    return `<svg width="${size}" height="${size}" viewBox="0 0 12 12" aria-hidden="true"><circle cx="6" cy="6" r="5.2" fill="${color}"/></svg>`;
  }
  if (kind === 'triangle') {
    return `<svg width="${size}" height="${size}" viewBox="0 0 12 12" aria-hidden="true"><polygon points="6,0.8 11.6,11.2 0.4,11.2" fill="${color}"/></svg>`;
  }
  return `<svg width="${size}" height="${size}" viewBox="0 0 12 12" aria-hidden="true"><rect x="1.4" y="1.4" width="9.2" height="9.2" fill="${color}"/></svg>`;
}

/** 顶部图例（HTML，样式对齐参考图） */
export function legendHTML(mode: ExploreMode): string {
  const item = (kind: 'circle' | 'triangle' | 'rect', color: string, text: string): string =>
    `<span class="legend-item">${symbolSvg(kind, color)}${text}</span>`;
  if (mode === 'species') {
    return [
      item('circle', SPECIES_META.Adelie.color, 'Adelie（圆点）'),
      item('triangle', SPECIES_META.Chinstrap.color, 'Chinstrap（三角）'),
    ].join('');
  }
  return [
    item('circle', SEX_META.female.color, '母企鹅'),
    item('circle', SEX_META.male.color, '公企鹅'),
    '<span class="legend-divider"></span>',
    item('circle', '#9AA7B4', '圆点 = Adelie'),
    item('triangle', '#9AA7B4', '三角 = Chinstrap'),
    item('rect', '#9AA7B4', '方块 = Gentoo'),
  ].join('');
}

interface GroupSpec {
  color: string;
  symbol: string | null; // null 表示逐点按物种设置
  rows: PenguinRecord[];
}

function buildSeriesData(
  rows: PenguinRecord[],
  features: FeatureKey[],
  rowOf: (r: PenguinRecord) => number,
  is1D: boolean,
  misSet: Set<PenguinRecord> | null,
): ChartDatum[] {
  const out: ChartDatum[] = [];
  for (const r of rows) {
    const x = getFeatureValue(r, features[0]);
    if (x === null) continue;
    const mis = misSet !== null && misSet.has(r);
    if (is1D) {
      const catIdx = rowOf(r);
      if (catIdx < 0) continue;
      const jitter = (Math.random() - 0.5) * 0.26;
      out.push({ value: [x, catIdx + jitter], species: r.species, sex: r.sex, mis });
    } else {
      const y = getFeatureValue(r, features[1]);
      if (y === null) continue;
      out.push({ value: [x, y], species: r.species, sex: r.sex, mis });
    }
  }
  return out;
}

/** 数值轴公共配置（X/Y 轴样式一致，通过 spread 复用） */
function valueAxisCommon(axis: string, decimals: number) {
  return {
    name: axis,
    nameLocation: 'middle' as const,
    nameGap: 36,
    nameTextStyle: { color: '#12324F', fontWeight: 600, fontSize: 13.5 },
    axisLabel: {
      color: '#5A7590',
      fontFamily: MONO,
      fontSize: 12,
      formatter: (v: unknown) => formatNumber(Number(v), decimals),
    },
    splitLine: { lineStyle: { color: '#E2EEF7', type: 'dashed' as const } },
    axisLine: { show: false },
    axisTick: { show: false },
  };
}

export class ExploreChart {
  private chart: echarts.ECharts;

  constructor(el: HTMLElement) {
    this.chart = echarts.init(el);
  }

  update(opts: ExploreChartOptions): void {
    const { mode, features, records, decisionLine, misSet } = opts;
    const is1D = features.length === 1;
    const f0 = FEATURE_MAP.get(features[0]);
    const f1 = is1D ? undefined : FEATURE_MAP.get(features[1]);

    let groups: GroupSpec[];
    // 单特征图的类别轴 = 当前研究问题的目标类别：
    // 区分企鹅 → 物种两行；区分公母 → 母/公两行（形状仍按物种区分）
    let categories: string[] = [];
    let rowOf: (r: PenguinRecord) => number;

    if (mode === 'species') {
      categories = Q1_SPECIES;
      rowOf = (r: PenguinRecord) => Q1_SPECIES.indexOf(r.species);
      const rows = records.filter(
        (r) => Q1_SPECIES.includes(r.species) && features.every((k) => getFeatureValue(r, k) !== null),
      );
      groups = [
        { color: SPECIES_META.Adelie.color, symbol: 'circle', rows: rows.filter((r) => r.species === 'Adelie') },
        { color: SPECIES_META.Chinstrap.color, symbol: 'triangle', rows: rows.filter((r) => r.species === 'Chinstrap') },
      ];
    } else {
      const rows = records.filter(
        (r) => r.sex !== null && features.every((k) => getFeatureValue(r, k) !== null),
      );
      groups = [
        { color: SEX_META.female.color, symbol: null, rows: rows.filter((r) => r.sex === 'female') },
        { color: SEX_META.male.color, symbol: null, rows: rows.filter((r) => r.sex === 'male') },
      ];
      if (is1D) {
        categories = ['母', '公'];
        rowOf = (r: PenguinRecord) => (r.sex === 'female' ? 0 : 1);
      } else {
        categories = ALL_SPECIES;
        rowOf = (r: PenguinRecord) => ALL_SPECIES.indexOf(r.species);
      }
    }

    const xMeta = f0 ?? FEATURES[0];

    const series: (ScatterSeriesOption | LineSeriesOption)[] = groups.map((g, gi) => {
      const data = buildSeriesData(g.rows, features, rowOf, is1D, misSet ?? null).map((d) => {
        const point: ChartDatum & Record<string, unknown> = {
          value: d.value,
          species: d.species,
          sex: d.sex,
          mis: d.mis,
        };
        if (g.symbol === null) {
          point.symbol = SPECIES_META[d.species].symbol;
        }
        // 被分错的企鹅：加粗红描边（与混淆矩阵红格对应）
        if (d.mis) {
          point.itemStyle = { color: g.color, borderColor: '#E11D48', borderWidth: 2.6, opacity: 0.95 };
        }
        return point;
      });

      const base: ScatterSeriesOption = {
        type: 'scatter',
        name: g.color,
        data: data as ScatterSeriesOption['data'],
        symbolSize: 13.5,
        itemStyle: { color: g.color, borderColor: '#fff', borderWidth: 1, opacity: 0.85 },
        emphasis: { scale: 1.35 },
      };

      // 单特征分界线：垂直虚线（只挂一次，首个系列）
      if (gi === 0 && decisionLine?.vertical) {
        base.markLine = {
          silent: true,
          symbol: 'none',
          animation: false,
          lineStyle: { color: '#F97316', type: 'dashed', width: 2.4 },
          label: {
            formatter: decisionLine.vertical.label,
            color: '#12324F',
            fontWeight: 700,
            fontSize: 12,
            position: 'insideEndTop',
          },
          data: [{ xAxis: decisionLine.vertical.x }],
        };
      }
      return base;
    });

    // 双特征分界线：虚线线段用 line series 绘制（clip 自动裁剪到绘图区；
    // 不用 markLine，因为其 dataFilter 会对线段端点做 containData 过滤，端点在数据范围外会被整条丢弃）
    if (decisionLine?.segment) {
      const s = decisionLine.segment;
      series.push({
        type: 'line',
        name: 'boundary',
        data: [
          [s.x1, s.y1],
          [s.x2, s.y2],
        ],
        showSymbol: false,
        silent: true,
        animation: false,
        clip: true,
        z: 6,
        lineStyle: { color: '#F97316', type: 'dashed', width: 2.4 },
        endLabel: {
          show: true,
          formatter: s.label,
          color: '#12324F',
          fontWeight: 700,
          fontSize: 12,
          distance: 8,
        },
      });
    }

    const tooltipFormatter = (params: unknown): string => {
      const raw = Array.isArray(params) ? params[0] : params;
      const datum = (raw as { data?: ChartDatum }).data;
      if (!datum) return '';
      const sexText = datum.sex ? ` · ${datum.sex === 'female' ? '母' : '公'}` : '';
      const misText = datum.mis ? '<br/><b style="color:#E11D48">✗ 被分错了</b>' : '';
      const meta = FEATURE_MAP.get(features[0]);
      const unit = meta ? meta.unit : '';
      const dec = meta ? meta.decimals : 0;
      const second = !is1D && f1
        ? `<br/>${f1.axis}：<b class="mono-num">${formatNumber(datum.value[1], f1.decimals)}</b> ${f1.unit}`
        : '';
      return (
        `<b>${datum.species}</b>${sexText}` +
        `<br/>${xMeta.axis}：<b class="mono-num">${formatNumber(datum.value[0], dec)}</b> ${unit}` +
        second +
        misText
      );
    };

    const xAxis: XAxisOption = {
      type: 'value',
      scale: true,
      ...valueAxisCommon(xMeta.axis, xMeta.decimals),
    };

    const yAxis: YAxisOption = is1D
      ? {
          type: 'category',
          data: categories,
          nameTextStyle: { color: '#12324F', fontWeight: 600 },
          axisLabel: { color: '#12324F', fontWeight: 600, fontSize: 13.5, margin: 14 },
          splitLine: { lineStyle: { color: '#E2EEF7', type: 'dashed' } },
          axisLine: { lineStyle: { color: '#C4D6E6' } },
          axisTick: { show: false },
        }
      : {
          type: 'value',
          scale: true,
          ...valueAxisCommon(f1 ? f1.axis : '', f1 ? f1.decimals : 0),
        };

    const option: ChartOption = {
      animationDuration: 420,
      animationDurationUpdate: 320,
      grid: { left: 20, right: 42, top: 34, bottom: 12, containLabel: true },
      tooltip: { trigger: 'item', confine: true, formatter: tooltipFormatter },
      xAxis,
      yAxis,
      series,
    };

    this.chart.setOption(option, true);
  }

  resize(): void {
    this.chart.resize();
  }

  dispose(): void {
    this.chart.dispose();
  }
}
