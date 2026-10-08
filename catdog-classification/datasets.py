"""数据加载模块。

支持两种数据来源：
1. load_from_directory(...) ：读取真实猫狗图片目录
      支持 cats_and_dogs_filtered 结构：
          data/cats_and_dogs/{train,validation}/{cats,dogs}/*.jpg
      split 参数指定读取哪个 split，split=None 则合并全部。
2. make_demo_data(...)      ：程序合成演示数据（零数据也能跑完整流程）

统一输出：
    X: ndarray (n_samples, n_features)  特征矩阵
    y: ndarray (n_samples,)             标签（0=猫, 1=狗）
    names: list[str]                    类别名 ['cats','dogs']
"""
from __future__ import annotations

from pathlib import Path

import numpy as np
from PIL import Image

from config import DATA_DIR
from features import extract_features

# cats_and_dogs_filtered 目录命名（复数形式）
CLASS_NAMES = ["cats", "dogs"]  # 索引 0=猫, 1=狗

_KNOWN_EXT = {".jpg", ".jpeg", ".png", ".bmp", ".webp"}
_SPLITS = ("train", "validation")


def _read_image_rgb(path: Path) -> np.ndarray:
    """读取图片为 RGB ndarray（自动转换 RGBA/灰度/P 模式）。"""
    with Image.open(path) as im:
        return np.asarray(im.convert("RGB"), dtype=np.uint8)


def _class_dirs(data_dir: Path) -> list[tuple[int, Path]]:
    """解析数据目录：返回 [(类别索引, 该类别的根目录), ...]。

    自动兼容两种布局：
        A) data_dir/{cats,dogs}/           （filtered 的某个 split 内层）
        B) data_dir/{train,validation}/{cats,dogs}/   （filtered 完整结构）
    """
    found: list[tuple[int, Path]] = []
    # 布局 A：直接是类别目录
    if all((data_dir / c).is_dir() for c in CLASS_NAMES):
        for idx, c in enumerate(CLASS_NAMES):
            found.append((idx, data_dir / c))
        return found
    # 布局 B：带 train/validation 外层
    for split in _SPLITS:
        split_dir = data_dir / split
        if not split_dir.is_dir():
            continue
        for idx, c in enumerate(CLASS_NAMES):
            class_dir = split_dir / c
            if class_dir.is_dir():
                found.append((idx, class_dir))
    return found


def load_from_directory(data_dir: Path = DATA_DIR, split: str | None = None) -> tuple[np.ndarray, np.ndarray, list[str]]:
    """从目录加载真实图片，返回 (X 特征矩阵, y 标签, 类别名)。

    split: "train" / "validation" / None(合并全部 split)
    """
    data_dir = Path(data_dir)
    if split is not None:
        data_dir = data_dir / split

    if not data_dir.exists():
        raise FileNotFoundError(
            f"数据目录不存在: {data_dir}\n"
            f"期望结构 data/cats_and_dogs/{{train,validation}}/{{cats,dogs}}/，"
            f"或使用 --demo 运行合成数据。"
        )

    pairs = _class_dirs(data_dir)
    if not pairs:
        raise RuntimeError(
            f"在 {data_dir} 下未找到类别目录（{CLASS_NAMES}）。"
            f"请检查目录命名是否为 cats / dogs。"
        )

    X_list: list[np.ndarray] = []
    y_list: list[int] = []
    for class_idx, class_dir in pairs:
        for img_path in sorted(class_dir.iterdir()):
            if img_path.suffix.lower() not in _KNOWN_EXT:
                continue
            try:
                rgb = _read_image_rgb(img_path)
                X_list.append(extract_features(rgb))
                y_list.append(class_idx)
            except Exception as e:  # 单张图片损坏不中断整体（教学数据常见）
                print(f"[跳过] 无法读取 {img_path.name}: {e}")

    if not X_list:
        raise RuntimeError("未读取到任何有效图片。")

    X = np.asarray(X_list, dtype=float)
    y = np.asarray(y_list, dtype=int)
    # 按类别目录顺序加载会导致样本按类堆叠（前半全猫、后半全狗），
    # 影响学习曲线等按顺序取子集的方法 —— 固定种子整体打乱（教学点：为什么要 shuffle）
    order = np.random.default_rng(42).permutation(len(X))
    X, y = X[order], y[order]
    print(f"已加载 {len(X)} 张图片（cats {int((y == 0).sum())} / dogs {int((y == 1).sum())}）")
    return X, y, CLASS_NAMES


# ---------------- 合成演示数据 ----------------

def _triangle_mask(size: int, v1: tuple, v2: tuple, v3: tuple) -> np.ndarray:
    """三角形光栅化：返回 (size,size) 布尔 mask（包围盒 + 符号法）。"""
    y, x = np.mgrid[0:size, 0:size]
    d1 = (x - v3[0]) * (v2[1] - v3[1]) - (v2[0] - v3[0]) * (y - v3[1])
    d2 = (x - v2[0]) * (v1[1] - v2[1]) - (v1[0] - v2[0]) * (y - v2[1])
    d3 = (x - v1[0]) * (v3[1] - v1[1]) - (v3[0] - v1[0]) * (y - v1[1])
    has_neg = (d1 < 0) | (d2 < 0) | (d3 < 0)
    has_pos = (d1 > 0) | (d2 > 0) | (d3 > 0)
    return ~(has_neg & has_pos)


def _draw_demo_image(class_idx: int, size: int, rng: np.random.Generator) -> np.ndarray:
    """合成一张可区分「猫/狗」的演示图（刻意制造可分性 + 噪声）。

        - 猫：圆脸 + 上方尖耳朵 + 偏暖色调
        - 狗：方脸 + 垂耳朵   + 偏冷色调
    """
    img = np.full((size, size, 3), 255.0)  # 白底
    cx = cy = size // 2
    radius = int(size * 0.28)

    if class_idx == 0:  # cat
        face_color = np.array([160, 120, 90])  # 暖棕
        yy, xx = np.ogrid[:size, :size]
        mask = (xx - cx) ** 2 + (yy - cy) ** 2 <= radius ** 2
        img[mask] = face_color
        # 尖耳朵：两片指向上方的三角形
        for sign in (1, -1):
            base_x = cx + sign * radius // 2
            base_y = cy - radius
            apex_x = base_x + sign * radius // 4
            apex_y = cy - radius - radius // 2
            tri = _triangle_mask(
                size,
                (base_x, base_y),
                (base_x - sign * radius // 2, base_y),
                (apex_x, apex_y),
            )
            img[tri] = face_color
    else:  # dog
        face_color = np.array([90, 110, 150])  # 冷灰蓝
        half = radius
        img[cy - half:cy + half, cx - half:cx + half] = face_color
        # 垂耳朵：左右两个矩形
        for sign in (1, -1):
            img[cy - half:cy + half // 2,
                cx + sign * half: cx + sign * half + radius // 2] = (120, 130, 140)

    img += rng.normal(0, 0.25 * 255, img.shape)
    return np.clip(img, 0, 255).astype(np.uint8)


def make_demo_data(per_class: int | None = None) -> tuple[np.ndarray, np.ndarray, list[str]]:
    """生成合成演示数据（猫、狗逐类生成特征）。"""
    n = per_class if per_class is not None else 120
    rng = np.random.default_rng(123)  # 固定种子，结果可复现
    X_list: list[np.ndarray] = []
    y_list: list[int] = []
    for cls in (0, 1):
        for _ in range(n):
            img = _draw_demo_image(cls, 64, rng)
            X_list.append(extract_features(img))
            y_list.append(cls)
    X = np.asarray(X_list, dtype=float)
    y = np.asarray(y_list, dtype=int)
    print(f"已生成合成数据 {len(X)} 条（cats {n} / dogs {n}）")
    return X, y, CLASS_NAMES