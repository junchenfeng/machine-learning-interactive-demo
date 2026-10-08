"""🎯 用训练好的模型预测新图片（单张或多张）——教学闭环的最后一步。

用法：
    python predict.py --path some_photo.jpg        # 用真实数据训练后预测
    python predict.py --demo --path some_photo.jpg # 用合成数据训练基准模型
    python predict.py --path some_folder/          # 批量预测目录下所有图片
"""
from __future__ import annotations

import argparse
import sys
from pathlib import Path

import numpy as np
from PIL import Image
from sklearn.svm import SVC
from sklearn.preprocessing import StandardScaler

from config import DATA_DIR
from datasets import CLASS_NAMES, load_from_directory, make_demo_data
from features import extract_features

_KNOWN_EXT = {".jpg", ".jpeg", ".png", ".bmp", ".webp"}


def train_baseline(use_demo: bool):
    """训练一个基准 RBF-SVM 用于演示预测。返回 (model, scaler)。"""
    if use_demo:
        print("使用合成演示数据训练基准模型…")
        X, y, _ = make_demo_data()
    else:
        X, y, _ = load_from_directory(DATA_DIR)
    scaler = StandardScaler().fit(X)
    model = SVC(kernel="rbf", C=1.0, gamma="scale", random_state=42)
    model.fit(scaler.transform(X), y)
    return model, scaler


def predict_image(model, scaler, img_path: Path) -> tuple[str, float]:
    """对单张图片预测，返回 (类别, SVM 决策分数)。

    决策分数是样本到分类边界的（有符号）距离：>0 偏向 dogs，<0 偏向 cats。
    教学点：它是「相对置信度」，不是概率；需要概率可用 probability=True。
    """
    with Image.open(img_path) as im:
        rgb = np.asarray(im.convert("RGB"), dtype=np.uint8)
    feat = extract_features(rgb).reshape(1, -1)
    label = int(model.predict(scaler.transform(feat))[0])
    score = float(model.decision_function(scaler.transform(feat))[0])
    return CLASS_NAMES[label], score


def main() -> None:
    parser = argparse.ArgumentParser(description="猫狗分类·预测")
    parser.add_argument("--demo", action="store_true", help="用合成数据训练基准模型")
    parser.add_argument("--path", type=str, required=True, help="待预测图片路径或目录")
    args = parser.parse_args()

    model, scaler = train_baseline(use_demo=args.demo)

    target = Path(args.path)
    if target.is_dir():
        files = [p for p in sorted(target.iterdir()) if p.suffix.lower() in _KNOWN_EXT]
        if not files:
            print("目录中没有找到图片。")
            sys.exit(1)
        for f in files:
            cls, score = predict_image(model, scaler, f)
            print(f"{f.name:<32} → {cls}  (决策分数: {score:+.3f})")
    else:
        cls, score = predict_image(model, scaler, target)
        print(f"{target} → {cls}  (决策分数: {score:+.3f})")


if __name__ == "__main__":
    main()