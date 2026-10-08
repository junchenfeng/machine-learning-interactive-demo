# ABOUTME: 预生成 Tab4 决策树模型产物。
# 在 Adelie vs Chinstrap（2007-2008 训练集，100% 训练，不做 train-test 划分）上，
# 对 4 组参数（max_depth 1/2 × min_samples_leaf 10/30）训练 sklearn 决策树，
# 输出树图 PNG 到 public/trees/，指标 JSON 到 src/data/tree-models.json。
# 用法：python3 scripts/generate_tree_models.py（需已安装 scikit-learn、matplotlib）

import json
from pathlib import Path

import matplotlib

matplotlib.use("Agg")

import matplotlib.pyplot as plt
import numpy as np
from matplotlib import font_manager
from sklearn.tree import DecisionTreeClassifier, plot_tree

ROOT = Path(__file__).resolve().parent.parent
DATA_PATH = ROOT / "src" / "data" / "penguins.json"
OUT_DIR = ROOT / "public" / "trees"
JSON_PATH = ROOT / "src" / "data" / "tree-models.json"

CLASSES = ["Adelie", "Chinstrap"]
CLASS_CN = {0: "阿德利企鹅", 1: "帽带企鹅"}
FEATURES = [
    ("billLength", "嘴的长度（毫米）"),
    ("billDepth", "嘴的厚度（毫米）"),
    ("flipper", "翅膀长度（毫米）"),
    ("mass", "体重（克）"),
]
COMBOS = [(1, 10), (1, 30), (2, 10), (2, 30)]
# 物种规范色（与全站一致，0-255 整数制，sklearn _color_brew 要求）：Adelie #3D6FB4 / Chinstrap #D2601F
BRAND_PALETTE = [(61, 111, 180), (210, 96, 31)]


def setup_font() -> None:
    font_file = Path("/usr/share/fonts/truetype/wqy/wqy-microhei.ttc")
    if font_file.exists():
        font_manager.fontManager.addfont(str(font_file))
        matplotlib.rcParams["font.family"] = ["WenQuanYi Micro Hei", "sans-serif"]
    matplotlib.rcParams["axes.unicode_minus"] = False


def patch_palette() -> None:
    """让 plot_tree 节点颜色使用全站物种规范色（失败则回退 sklearn 默认色）。"""
    try:
        import sklearn.tree._export as exporter_module

        def _color_brew(n_class: int) -> list[tuple[float, float, float]]:
            if n_class == 2:
                return BRAND_PALETTE
            return [(0.8, 0.8, 0.8)] * n_class

        exporter_module._color_brew = _color_brew
    except Exception as exc:  # noqa: BLE001 - 调色板失败不应中断生成
        print(f"[warn] 调色板补丁未生效（使用 sklearn 默认色）: {exc}")


def load_xy() -> tuple[np.ndarray, np.ndarray]:
    payload = json.loads(DATA_PATH.read_text(encoding="utf-8"))
    keys = [k for k, _ in FEATURES]
    xs: list[list[float]] = []
    ys: list[int] = []
    for r in payload["records"]:
        if r["species"] not in CLASSES or r["year"] not in (2007, 2008):
            continue
        row = [r[k] for k in keys]
        if any(v is None for v in row):
            continue
        xs.append([float(v) for v in row])
        ys.append(CLASSES.index(r["species"]))
    return np.asarray(xs, dtype=float), np.asarray(ys, dtype=int)


def picked_features(clf: DecisionTreeClassifier) -> list[str]:
    names = [label for _, label in FEATURES]
    t = clf.tree_
    picked: list[str] = []
    for node in range(t.node_count):
        if t.children_left[node] != -1:
            name = names[int(t.feature[node])]
            if name not in picked:
                picked.append(name)
    return picked


def tree_rules(clf: DecisionTreeClassifier) -> list[dict[str, object]]:
    t = clf.tree_
    names = [label for _, label in FEATURES]
    rules: list[dict[str, object]] = []

    def walk(node: int, path: list[tuple[str, str, float]]) -> None:
        if t.children_left[node] == -1:
            value = t.value[node][0]
            total = int(t.n_node_samples[node])
            # sklearn >= 1.3: value 为各类样本占比，换算回计数
            n_a = int(round(float(value[0]) * total))
            n_c = total - n_a
            # 合并同特征同方向的连续条件（保留更紧的阈值）
            merged: list[tuple[str, str, float]] = []
            for name, op, thr in path:
                if merged and merged[-1][0] == name and merged[-1][1] == op:
                    prev = merged[-1]
                    tighter = min(prev[2], thr) if op == "le" else max(prev[2], thr)
                    merged[-1] = (name, op, tighter)
                else:
                    merged.append((name, op, thr))
            text = " 且 ".join(
                f"{name} ≤ {thr:.2f}" if op == "le" else f"{name} > {thr:.2f}"
                for name, op, thr in merged
            )
            rules.append(
                {
                    "if": text if text else "（不需要任何判断，直接分类）",
                    "predict": CLASS_CN[int(value.argmax())],
                    "samples": total,
                    "nAdelie": n_a,
                    "nChinstrap": n_c,
                }
            )
            return
        name = names[int(t.feature[node])]
        thr = float(t.threshold[node])
        walk(int(t.children_left[node]), path + [(name, "le", thr)])
        walk(int(t.children_right[node]), path + [(name, "gt", thr)])

    walk(0, [])
    return rules


def render_tree(clf: DecisionTreeClassifier, depth: int, leaf: int) -> str:
    feature_names = [label for _, label in FEATURES]
    class_names = [CLASS_CN[0], CLASS_CN[1]]
    figsize = (9.5, 5.4) if depth == 1 else (13.0, 7.2)

    fig, ax = plt.subplots(figsize=figsize, dpi=150)
    plot_tree(
        clf,
        feature_names=feature_names,
        class_names=class_names,
        filled=True,
        rounded=True,
        impurity=True,
        label="all",
        fontsize=11,
        ax=ax,
    )
    ax.set_axis_off()
    OUT_DIR.mkdir(parents=True, exist_ok=True)
    filename = f"depth{depth}-leaf{leaf}.png"
    fig.savefig(OUT_DIR / filename, bbox_inches="tight", facecolor="white")
    plt.close(fig)
    return f"/trees/{filename}"


def main() -> None:
    setup_font()
    patch_palette()

    x, y = load_xy()
    n_adelie = int((y == 0).sum())
    n_chinstrap = int((y == 1).sum())

    combos: dict[str, dict[str, object]] = {}
    for depth, leaf in COMBOS:
        clf = DecisionTreeClassifier(
            criterion="gini", max_depth=depth, min_samples_leaf=leaf, random_state=42
        )
        clf.fit(x, y)
        pred = clf.predict(x)
        correct = int((pred == y).sum())
        n = int(len(y))
        cm = [[0, 0], [0, 0]]
        for true_label, pred_label in zip(y, pred):
            cm[int(true_label)][int(pred_label)] += 1
        image = render_tree(clf, depth, leaf)
        key = f"d{depth}-leaf{leaf}"
        combos[key] = {
            "depth": depth,
            "minLeaf": leaf,
            "n": n,
            "correct": correct,
            "accuracy": round(correct / n, 4),
            "cm": cm,
            "pickedFeatures": picked_features(clf),
            "rules": tree_rules(clf),
            "image": image,
        }
        print(f"[ok] {key}: acc={combos[key]['accuracy']:.4f} cm={cm}")

    payload = {
        "meta": {
            "source": "Palmer Penguins LTER · 2007-2008 训练数据",
            "model": "sklearn DecisionTreeClassifier（基尼不纯度）",
            "trainRule": "100% 训练：全部样本都用来学规则，不做 train-test 划分（本页允许过拟合，教学重点是“AI 自己学规则”）",
            "classes": CLASSES,
            "n": int(len(y)),
            "nAdelie": n_adelie,
            "nChinstrap": n_chinstrap,
            "features": [label for _, label in FEATURES],
            "ruleDir": "x ≤ 阈值 → 走左分支；x > 阈值 → 走右分支",
            "palette": {
                "note": "节点颜色 = 该节点偏向哪一类（越深越确定）",
                "Adelie": "#3D6FB4",
                "Chinstrap": "#D2601F",
            },
        },
        "combos": combos,
    }
    JSON_PATH.write_text(json.dumps(payload, ensure_ascii=False, indent=2), encoding="utf-8")
    print(f"[done] 写出 {JSON_PATH}")


if __name__ == "__main__":
    main()
