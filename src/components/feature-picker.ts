// ABOUTME: 特征两行选择器（探索分析 / 初步分类共用）：特征1 必选、特征2 可选且不可与特征1 相同
import { FEATURES } from '../data/dataset';
import type { FeatureKey } from '../data/types';

/** 特征选择状态（f1 必选，f2 可为 null） */
export interface FeaturePair {
  f1: FeatureKey;
  f2: FeatureKey | null;
}

const CHIP_BASE = 'chip-btn flex flex-col items-start gap-1 rounded-xl border-2 px-3.5 py-2.5 text-left transition-all';

/**
 * 渲染某一行的特征芯片。
 * 特征1 行：radio 语义（始终恰好选中 1 个）；
 * 特征2 行：与特征1 相同的芯片禁用，选中的可再点取消。
 */
export function featureRowHtml(attr: 'data-feature-1' | 'data-feature-2', state: FeaturePair): string {
  const isRow1 = attr === 'data-feature-1';
  return FEATURES.map((f) => {
    const isF1 = state.f1 === f.key;
    const selected = isRow1 ? isF1 : state.f2 === f.key;
    const disabled = !isRow1 && isF1;
    const look = selected
      ? ' border-beak bg-beak text-white shadow-card-hover'
      : ' border-polar-200 bg-white text-ink hover:border-polar-400';
    const sub = disabled ? '已被特征1 选中' : f.unit;
    return `
      <button type="button" ${attr}="${f.key}" ${disabled ? 'disabled' : ''}
        class="${CHIP_BASE}${look}${disabled ? ' chip-disabled' : ''}" aria-pressed="${selected}">
        <span class="text-sm font-black">${f.label}</span>
        <span class="mono-num text-[10.5px] leading-tight ${selected ? 'text-white/75' : 'text-mist'}">${sub}</span>
      </button>`;
  }).join('');
}

/** 处理特征芯片点击，返回 true 表示状态有变化（调用方需重绘） */
export function handleFeatureClick(target: HTMLElement, state: FeaturePair): boolean {
  const f1Btn = target.closest<HTMLButtonElement>('[data-feature-1]');
  if (f1Btn) {
    // 注意：data-feature-1 的 dataset 键是 "feature-1"（连字符后是数字时不会被驼峰化），
    // 这里统一用 getAttribute 读取，避免踩坑。
    const key = f1Btn.getAttribute('data-feature-1') as FeatureKey | null;
    if (!key || key === state.f1) return false;
    state.f1 = key;
    // 特征1 改选为当前特征2 时，清空特征2 以免两行重复
    if (state.f2 === key) state.f2 = null;
    return true;
  }
  const f2Btn = target.closest<HTMLButtonElement>('[data-feature-2]');
  if (f2Btn && !f2Btn.disabled) {
    const key = f2Btn.getAttribute('data-feature-2') as FeatureKey | null;
    if (!key) return false;
    state.f2 = state.f2 === key ? null : key;
    return true;
  }
  return false;
}

/** 交给图表的特征数组：不选特征2 时只传 1 个（单特征图） */
export function featureKeys(state: FeaturePair): FeatureKey[] {
  return state.f2 ? [state.f1, state.f2] : [state.f1];
}
