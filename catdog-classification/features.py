"""🔍 特征工程模块（教学重点 1：特征提取与特征设计）

「如何把一张图片变成一堆可计算、能区分类别的数字」——这就是特征工程。
本项目不使用深度学习，而是从图片中**手工设计浅层特征**，
让 scikit-learn 的经典算法能够在这些特征上做分类。

设计思想：找「能区分猫和狗」的可量化信号：
- 猫的脸更圆、耳朵更尖、毛色偏暖且有条纹；狗的脸更方、嘴长、毛色偏冷。
- 这些直觉在图像上体现为：颜色分布、边缘复杂度、对称性、中心-边缘亮度差。
"""
from __future__ import annotations

import numpy as np

from config import IMG_SIZE, HIST_BINS


def _to_gray(img: np.ndarray) -> np.ndarray:
    """RGB -> 灰度 (0~255, float)。"""
    if img.ndim == 2:
        return img.astype(float)
    return (0.299 * img[..., 0] + 0.587 * img[..., 1] + 0.114 * img[..., 2]).astype(float)


def _resize_nn(img: np.ndarray, size: tuple[int, int]) -> np.ndarray:
    """最近邻缩放到目标 (h, w)。避免引入 opencv 依赖，教学够用。"""
    h, w = img.shape[0:2]
    th, tw = size
    if h == th and w == tw:
        return img
    ys = np.linspace(0, h - 1, th).astype(int)
    xs = np.linspace(0, w - 1, tw).astype(int)
    return img[np.ix_(ys, xs)]


def _color_histogram(img_rgb: np.ndarray, bins: int) -> np.ndarray:
    """对 R、G、B 三通道分别做归一化直方图（占比），捕捉颜色分布差异。"""
    feats: list[float] = []
    for c in range(3):
        hist, _ = np.histogram(img_rgb[..., c], bins=bins, range=(0, 256), density=True)
        feats.extend(hist.tolist())
    return np.asarray(feats, dtype=float)


def _edge_density(gray: np.ndarray) -> tuple[float, float]:
    """简易 Sobel（中央差分）统计边缘强度。

    返回：
        mean_mag   : 梯度幅度均值（越大越“锐利/复杂”）
        edge_ratio : 超过阈值(80)的边缘像素占比（衡量纹理密度）
    """
    dy = np.zeros_like(gray)
    dx = np.zeros_like(gray)
    dy[1:-1, :] = gray[2:, :] - gray[:-2, :]
    dx[:, 1:-1] = gray[:, 2:] - gray[:, :-2]
    mag = np.sqrt(dx**2 + dy**2)
    return float(mag.mean()), float((mag > 80).mean())


def _center_vs_edge_brightness(gray: np.ndarray) -> float:
    """中心区域与四周的亮度差（主体通常在画面中心）。"""
    h, w = gray.shape
    ch, cw = max(1, h // 4), max(1, w // 4)
    center = gray[ch : h - ch, cw : w - cw]
    border = np.concatenate([
        gray[:ch, :].ravel(), gray[h - ch:, :].ravel(),
        gray[:, :cw].ravel(), gray[:, w - cw:].ravel(),
    ])
    return float(center.mean() - border.mean())


def _symmetric_difference(gray: np.ndarray) -> float:
    """左右对称差异（猫脸更对称，狗的侧脸/花纹常打破对称）。"""
    w = gray.shape[1]
    half = w // 2
    left = gray[:, :half]
    right = gray[:, w - half:][:, ::-1]
    return float(np.abs(left - right).mean())


def extract_features(img_rgb: np.ndarray) -> np.ndarray:
    """从一张 RGB 图片（ndarray，任意尺寸，像素 0~255）提取特征向量。

    特征构成（总维度 = 8 + 3*HIST_BINS）：
        - 归一化尺寸        : 2 维
        - 灰度 均值/标准差   : 2 维
        - RGB 颜色直方图     : 3 * HIST_BINS 维
        - 边缘密度           : 2 维（幅度均值 / 边缘像素占比）
        - 中心-边缘亮度差    : 1 维
        - 左右对称差异       : 1 维
    """
    img_f = _resize_nn(img_rgb, IMG_SIZE).astype(float)
    gray = _to_gray(img_f)

    feats: list[float] = []
    # 1) 归一化尺寸（特征要归一化量纲，教学点：量纲影响距离类算法）
    feats += [img_f.shape[0] / 255.0, img_f.shape[1] / 255.0]
    # 2) 灰度统计
    feats += [float(gray.mean()) / 255.0, float(gray.std()) / 255.0]
    # 3) 颜色直方图
    feats.extend(_color_histogram(img_f, HIST_BINS).tolist())
    # 4) 边缘密度
    mean_mag, edge_ratio = _edge_density(gray)
    feats += [mean_mag / 255.0, edge_ratio]
    # 5) 中心 vs 边缘亮度差
    feats.append(_center_vs_edge_brightness(gray) / 255.0)
    # 6) 左右对称差异
    feats.append(_symmetric_difference(gray) / 255.0)

    return np.asarray(feats, dtype=float)


def feature_names() -> list[str]:
    """返回每个特征维度的名字，便于教学展示。"""
    names = ["尺寸_高", "尺寸_宽", "灰度_均值", "灰度_标准差"]
    for ch in "RGB":
        for b in range(HIST_BINS):
            names.append(f"直方图_{ch}_桶{b}")
    names += ["边缘_幅度均值", "边缘_像素占比", "中心边缘亮度差", "左右对称差"]
    return names


if __name__ == "__main__":
    # 自检：随机图特征维度需与 feature_names() 一致
    demo = np.random.randint(0, 256, (80, 120, 3), dtype=np.uint8)
    f = extract_features(demo)
    names = feature_names()
    assert len(f) == len(names), f"特征维度不匹配: {len(f)} vs {len(names)}"
    print("特征维度:", len(f))
    for n, v in zip(names, f):
        print(f"  {n:<20} {v:.4f}")