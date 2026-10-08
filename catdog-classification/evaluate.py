"""📊 模型评价模块（教学重点 3：不止看准确率）

提供：
  - evaluate_model           ：K 折交叉验证（比单次划分更可靠）
  - plot_confusion_matrix    ：混淆矩阵热力图
  - plot_feature_distribution：特征可分性分布图
  - plot_learning_curve      ：学习曲线（样本量 → 精度）
"""
from __future__ import annotations

from typing import Any

import numpy as np
from sklearn.model_selection import cross_val_predict, cross_val_score, learning_curve
from sklearn.pipeline import make_pipeline
from sklearn.preprocessing import StandardScaler
from sklearn.metrics import confusion_matrix, precision_recall_fscore_support

import config


def _needs_scaling(model_cls) -> bool:
    from sklearn.linear_model import LogisticRegression
    from sklearn.svm import SVC
    from sklearn.neighbors import KNeighborsClassifier
    return model_cls in (LogisticRegression, SVC, KNeighborsClassifier)


def _make_pipeline(model_cls, params: dict):
    model = model_cls(**params)
    if _needs_scaling(model_cls):
        return make_pipeline(StandardScaler(), model)
    return model


def evaluate_model(model_cls, params: dict, X, y, n_splits: int = 5,
                   random_state: int = 42) -> tuple[np.ndarray, np.ndarray]:
    """K 折交叉验证。返回 (CV 预测标签, 各折准确率)。"""
    pipe = _make_pipeline(model_cls, params)
    scores = cross_val_score(pipe, X, y, cv=n_splits, scoring="accuracy", n_jobs=-1)
    y_pred = cross_val_predict(pipe, X, y, cv=n_splits)
    print(f"     {n_splits} 折交叉验证准确率: {np.mean(scores):.4f} (±{np.std(scores):.4f})")
    # 教学点：交叉验证还能给出每个类别的 precision / recall / F1
    p, r, f1, _ = precision_recall_fscore_support(y, y_pred, average=None, zero_division=0)
    print(f"     按类别 precision: {np.round(p, 3)}")
    print(f"     按类别 recall:    {np.round(r, 3)}")
    print(f"     按类别 F1:        {np.round(f1, 3)}")
    return y_pred, scores


def _setup_matplotlib():
    try:
        import matplotlib
        matplotlib.use("Agg")  # 非交互后端，避免弹窗阻塞
        import matplotlib.pyplot as plt
        return plt
    except Exception as e:
        print(f"      [提示] matplotlib 不可用，跳过图: {e}")
        return None


def plot_confusion_matrix(y_true, y_pred, class_names, title="混淆矩阵"):
    """绘制并保存混淆矩阵热力图。"""
    plt = _setup_matplotlib()
    if plt is None:
        return
    cm = confusion_matrix(y_true, y_pred)
    config.OUTPUT_DIR.mkdir(parents=True, exist_ok=True)

    fig, ax = plt.subplots(figsize=(4.5, 4), dpi=110)
    im = ax.imshow(cm, cmap="Blues")
    ax.set_xticks(range(len(class_names)))
    ax.set_yticks(range(len(class_names)))
    ax.set_xticklabels(class_names)
    ax.set_yticklabels(class_names)
    ax.set_xlabel("Predicted label")
    ax.set_ylabel("True label")
    ax.set_title(f"Confusion Matrix · {title}")
    for i in range(cm.shape[0]):
        for j in range(cm.shape[1]):
            ax.text(j, i, int(cm[i, j]), ha="center", va="center",
                    color="white" if cm[i, j] > cm.max() / 2 else "black")
    fig.colorbar(im, fraction=0.046, pad=0.04)
    fig.tight_layout()
    path = config.OUTPUT_DIR / f"confusion_{title.replace(' ', '_')}.png"
    fig.savefig(path)
    plt.close(fig)
    print(f"     图表已保存: {path.name}")


def plot_feature_distribution(X_train, y_train, names, class_names):
    """每个特征按类别画分布（猫 vs 狗）——重叠越少 = 特征越可分。"""
    plt = _setup_matplotlib()
    if plt is None:
        return
    n = X_train.shape[1]
    cols = 2
    rows = int(np.ceil(n / cols))
    fig, axes = plt.subplots(rows, cols, figsize=(10, rows * 2.0), dpi=100)
    axes = np.atleast_1d(axes).ravel()
    for idx, ax in enumerate(axes[:n]):
        for cls, color, label in [(0, "tab:orange", class_names[0]), (1, "tab:blue", class_names[1])]:
            ax.hist(X_train[y_train == cls, idx], bins=15, alpha=0.5, color=color, label=label)
        ax.set_title(names[idx], fontsize=8)
        ax.tick_params(labelsize=7)
    for ax in axes[n:]:
        ax.axis("off")
    fig.suptitle("Feature distributions by class (less overlap = more discriminative)")
    fig.tight_layout()
    config.OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
    path = config.OUTPUT_DIR / "feature_distribution.png"
    fig.savefig(path)
    plt.close(fig)
    print(f"     图表已保存: {path.name}")


def plot_learning_curve(model_cls, params, X, y, title="学习曲线"):
    """学习曲线：训练集/验证集精度随样本量变化（诊断过拟合/欠拟合）。"""
    plt = _setup_matplotlib()
    if plt is None:
        return
    pipe = _make_pipeline(model_cls, params)
    train_sizes, train_scores, val_scores = learning_curve(
        pipe, X, y, cv=5, train_sizes=config.LEARNING_CURVE_SIZES, n_jobs=-1,
        scoring="accuracy",
    )
    config.OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
    fig, ax = plt.subplots(figsize=(6, 4), dpi=110)
    ax.plot(train_sizes, train_scores.mean(1), "o-", label="Train")
    ax.plot(train_sizes, val_scores.mean(1), "s-", label="Validation")
    ax.fill_between(train_sizes, val_scores.mean(1) - val_scores.std(1),
                    val_scores.mean(1) + val_scores.std(1), alpha=0.2)
    ax.set_xlabel("Training samples")
    ax.set_ylabel("Accuracy")
    ax.set_title(f"Learning Curve · {title}")
    ax.legend()
    fig.tight_layout()
    path = config.OUTPUT_DIR / f"learning_curve_{title}.png"
    fig.savefig(path)
    plt.close(fig)
    print(f"     图表已保存: {path.name}")