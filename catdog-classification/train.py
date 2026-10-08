"""🏃 主流程：数据加载 → 特征工程 → 多算法对比训练 → 模型评价。

用法：
    python train.py --demo                  # 用合成演示数据（零数据可跑）
    python train.py                         # 用 data/cats_and_dogs 真实数据
    python train.py --data /path/to/dir     # 指定其他数据目录
    python train.py --no-plots              # 不保存可视化图片
"""
from __future__ import annotations

import argparse
import sys
from pathlib import Path

import numpy as np
from sklearn.model_selection import train_test_split
from sklearn.preprocessing import StandardScaler
from sklearn.linear_model import LogisticRegression
from sklearn.tree import DecisionTreeClassifier
from sklearn.svm import SVC
from sklearn.neighbors import KNeighborsClassifier

import config
from datasets import load_from_directory, make_demo_data
from features import feature_names
from evaluate import evaluate_model, plot_confusion_matrix, plot_feature_distribution, plot_learning_curve

# 算法注册表：名字 -> (类, 参数)
_MODEL_MAP = {
    "LogisticRegression": LogisticRegression,
    "DecisionTreeClassifier": DecisionTreeClassifier,
    "SVC": SVC,
    "KNeighborsClassifier": KNeighborsClassifier,
}


def main() -> None:
    parser = argparse.ArgumentParser(description="猫狗分类教学（scikit-learn）")
    parser.add_argument("--demo", action="store_true", help="使用合成演示数据（无需真实数据）")
    parser.add_argument("--data", type=str, default=None, help="数据目录（默认 config.DATA_DIR）")
    parser.add_argument("--no-plots", action="store_true", help="不保存可视化图片")
    args = parser.parse_args()

    if args.no_plots:
        config.SAVE_PLOTS = False

    # ---------- 1. 加载数据 ----------
    print("\n" + "=" * 56)
    print("步骤1/5：加载数据")
    try:
        if args.demo:
            X, y, class_names = make_demo_data()
        else:
            data_dir = Path(args.data) if args.data else config.DATA_DIR
            X, y, class_names = load_from_directory(data_dir)
    except (FileNotFoundError, RuntimeError) as e:
        print(e)
        print("\n提示：没有真实数据时，可用 --demo 参数跑合成演示数据。")
        sys.exit(1)

    names = feature_names()
    assert X.shape[1] == len(names), "特征维度与特征名数量不一致，请检查 features.py"
    print(f"  特征维度 = {X.shape[1]}（{names[0]} … {names[-1]}）")

    # ---------- 2. 划分训练/测试集 ----------
    print("\n" + "=" * 56)
    print("步骤2/5：划分训练集 / 测试集")
    X_train, X_test, y_train, y_test = train_test_split(
        X, y, test_size=config.TEST_SIZE, random_state=config.RANDOM_STATE,
        stratify=y,  # 分层抽样：保持两类比例一致（教学点）
    )
    print(f"  训练样本: {X_train.shape[0]}, 测试样本: {X_test.shape[0]}")

    # ---------- 3. 特征分布可视化（教学重点1：特征可分性） ----------
    print("\n" + "=" * 56)
    print("步骤3/5：分析特征可分性")
    if config.SAVE_PLOTS:
        plot_feature_distribution(X_train, y_train, names, class_names)
    else:
        print("  已跳过特征分布图（--no-plots）")

    # ---------- 4. 多算法训练 + 交叉验证 + 测试集评估 ----------
    results: dict[str, dict] = {}
    for algo_name, spec in config.ALGORITHMS.items():
        print("\n" + "=" * 56)
        print(f"步骤4/5：训练并评估 —— {algo_name}")
        model_cls = _MODEL_MAP[spec["model"]]
        params = dict(spec["params"])

        # 交叉验证：更可靠地估计泛化能力（距离类算法自动套标准化管道）
        y_hat_cv, cv_scores = evaluate_model(model_cls, params, X, y, n_splits=5,
                                             random_state=config.RANDOM_STATE)

        # 独立测试集评估（教学点：测试集必须始终“没见过”）
        model = model_cls(**params)
        if _needs_scaling(model_cls):
            scaler = StandardScaler().fit(X_train)
            model.fit(scaler.transform(X_train), y_train)
            y_pred = model.predict(scaler.transform(X_test))
            train_acc = float(model.score(StandardScaler().fit(X).transform(X), y))
        else:
            model.fit(X_train, y_train)
            y_pred = model.predict(X_test)
            train_acc = float(model.score(X, y))
        test_acc = float((y_pred == y_test).mean())

        print(f"     训练集准确率: {train_acc:.4f} | 测试集准确率: {test_acc:.4f}")
        gap = train_acc - test_acc
        if gap > 0.15:
            print(f"     ⚠ 训练-测试差距 {gap:.2f} 较大，提示可能过拟合（教学点）")

        results[algo_name] = {
            "cv_mean": float(np.mean(cv_scores)),
            "cv_std": float(np.std(cv_scores)),
            "train_acc": train_acc,
            "test_acc": test_acc,
            "y_test": y_test,
            "y_pred": y_pred,
            "y_true_all": y,
            "y_cv": y_hat_cv,
        }

    # ---------- 5. 汇总对比 + 可视化（教学重点3：模型评价） ----------
    print("\n" + "=" * 56)
    print("步骤5/5：算法横向对比")
    print(f"{'算法':<22}{'CV准确率':<18}{'训练集':<10}{'测试集':<10}")
    print("-" * 60)
    best_name, best_acc = None, -1.0
    for name, r in results.items():
        print(f"{name:<22}{r['cv_mean']:.4f} (±{r['cv_std']:.4f})   {r['train_acc']:.4f}    {r['test_acc']:.4f}")
        if r["test_acc"] > best_acc:
            best_name, best_acc = name, r["test_acc"]
    print(f"\n最佳算法: {best_name}（测试集 {best_acc:.4f}）")

    if config.SAVE_PLOTS:
        for name, r in results.items():
            plot_confusion_matrix(r["y_test"], r["y_pred"], class_names, title=name)
        # 学习曲线：用表现最好的算法演示（教学重点3）
        best_spec = config.ALGORITHMS[best_name]
        plot_learning_curve(_MODEL_MAP[best_spec["model"]], best_spec["params"], X, y,
                            title=best_name)
        print("\n图表已保存到 output/ 目录。")

    print("\n教学小结：")
    print("  · 准确率(accuracy)对类别不均衡敏感——要结合混淆矩阵看。")
    print("  · 交叉验证比单次划分更可靠；训练-测试差距大 => 过拟合。")
    print("  · 决策树容易过拟合（训练集满分），SVM/KNN 对特征尺度敏感（需标准化）。")


def _needs_scaling(model_cls) -> bool:
    """距离/梯度类算法对特征尺度敏感 → 需要标准化；树模型不需要。"""
    return model_cls in (LogisticRegression, SVC, KNeighborsClassifier)


if __name__ == "__main__":
    main()