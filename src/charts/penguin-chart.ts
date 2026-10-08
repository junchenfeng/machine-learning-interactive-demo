// ABOUTME: 探索分析页散点图封装（ECharts 按需引入），样式对齐参考图：顶部 HTML 图例 + 白底散点
import * as echarts from 'echarts/core';
import { ScatterChart } from 'echarts/charts';
import { GridComponent, MarkLineComponent, TooltipComponent } from 'echarts/components';
import { CanvasRenderer } from 'echarts/renderers';
import type { ComposeOption } from 'echarts/core';
import type { ScatterSeriesOption } from 'echarts/charts';
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

echarts.use([ScatterChart, GridComponent, MarkLineComponent, TooltipComponent, CanvasRenderer]);

export type ChartOption = ComposeOption<
  ScatterSeriesOption | GridComponentOption | TooltipComponentOption
>;

/** 从组合类型中提取坐标轴选项（ECharts 未从子模块直接导出轴类型） */
type XAxisOption = NonNullable<ChartOption['xAxis']>;
type YAxisOption = NonNullable<ChartOption['yAxis']>;

export type ExploreMode = 'species' | 'sex';

export interface ExploreChartOptions {
  mode: ExploreMode;
  features: FeatureKey[];
  records: PenguinRecord[];
}

interface ChartDatum {
  value: [number, number];
  species: Species;
  sex: Sex | null;
}

const FEATURE_MAP = new Map(FEATURES.map((f) => [f.key, f]));
const MONO = 'ui-monospace, SF Mono, Cascadia Code, Consolas, Menlo, monospace';
const Q1_SPECIES: Species[] = ['Adelie', 'Chinstrap'];
const BILL_LENGTH_SPLIT = 45;

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
  categories: Species[],
  is1D: boolean,
): ChartDatum[] {
  const out: ChartDatum[] = [];
  for (const r of rows) {
    const x = getFeatureValue(r, features[0]);
    if (x === null) continue;
    if (is1D) {
      const catIdx = categories.indexOf(r.species);
      if (catIdx < 0) continue;
      const jitter = (Math.random() - 0.5) * 0.26;
      out.push({ value: [x, catIdx + jitter], species: r.species, sex: r.sex });
    } else {
      const y = getFeatureValue(r, features[1]);
      if (y === null) continue;
      out.push({ value: [x, y], species: r.species, sex: r.sex });
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
    const { mode, features, records } = opts;
    const is1D = features.length === 1;
    const f0 = FEATURE_MAP.get(features[0]);
    const f1 = is1D ? undefined : FEATURE_MAP.get(features[1]);

    let groups: GroupSpec[];
    let categories: Species[] = [];

    if (mode === 'species') {
      categories = Q1_SPECIES;
      const rows = records.filter(
        (r) => Q1_SPECIES.includes(r.species) && features.every((k) => getFeatureValue(r, k) !== null),
      );
      groups = [
        { color: SPECIES_META.Adelie.color, symbol: 'circle', rows: rows.filter((r) => r.species === 'Adelie') },
        { color: SPECIES_META.Chinstrap.color, symbol: 'triangle', rows: rows.filter((r) => r.species === 'Chinstrap') },
      ];
    } else {
      categories = ALL_SPECIES;
      const rows = records.filter(
        (r) => r.sex !== null && features.every((k) => getFeatureValue(r, k) !== null),
      );
      groups = [
        { color: SEX_META.female.color, symbol: null, rows: rows.filter((r) => r.sex === 'female') },
        { color: SEX_META.male.color, symbol: null, rows: rows.filter((r) => r.sex === 'male') },
      ];
    }

    const xMeta = f0 ?? FEATURES[0];

    const series: ScatterSeriesOption[] = groups.map((g, gi) => {
      const data = buildSeriesData(g.rows, features, categories, is1D).map((d) => {
        const point: ChartDatum & Record<string, unknown> = {
          value: d.value,
          species: d.species,
          sex: d.sex,
        };
        if (g.symbol === null) {
          point.symbol = SPECIES_META[d.species].symbol;
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

      // 参考图：双特征 + X 为嘴长时，给出 45mm 决策参考虚线（仅问题一）
      if (mode === 'species' && !is1D && features[0] === 'billLength' && gi === 0) {
        base.markLine = {
          silent: true,
          symbol: 'none',
          animation: false,
          lineStyle: { color: '#8B9BAD', type: 'dashed', width: 2 },
          label: {
            formatter: `分界线 ${BILL_LENGTH_SPLIT} mm`,
            color: '#5A7590',
            fontSize: 12,
            position: 'insideEndTop',
          },
          data: [{ xAxis: BILL_LENGTH_SPLIT }],
        };
      }
      return base;
    });

    const tooltipFormatter = (params: unknown): string => {
      const raw = Array.isArray(params) ? params[0] : params;
      const datum = (raw as { data?: ChartDatum }).data;
      if (!datum) return '';
      const sexText = datum.sex ? ` · ${datum.sex === 'female' ? '母' : '公'}` : '';
      const meta = FEATURE_MAP.get(features[0]);
      const unit = meta ? meta.unit : '';
      const dec = meta ? meta.decimals : 0;
      const second = !is1D && f1
        ? `<br/>${f1.axis}：<b class="mono-num">${formatNumber(datum.value[1], f1.decimals)}</b> ${f1.unit}`
        : '';
      return (
        `<b>${datum.species}</b>${sexText}` +
        `<br/>${xMeta.axis}：<b class="mono-num">${formatNumber(datum.value[0], dec)}</b> ${unit}` +
        second
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
