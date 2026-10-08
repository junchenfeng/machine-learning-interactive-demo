# ABOUTME: 生成两份研究笔记（reports/research-note-1.md / research-note-2.md）所需的全部数字。
# 数据源、建模设定与 Tab 05「训练决策树」完全一致：
#   - 样本：Palmer Penguins，year ∈ {2007, 2008}
#     · 研究笔记 1（Y = 物种）：只取 Adelie 与 Chinstrap，共 143 只
#     · 研究笔记 2（Y = 性别）：三种企鹅全取、只要性别已知的，共 216 只
#       ⚠️ 两份笔记的样本不同，这是故意的：Y 换了，要猜的东西也换了，
#          强行用同一批样本会把性别的准确率压成四条平线（实测 84.8/84.8/85.5/84.8），孩子比不出名次
#   - 训练：100% 训练（不做 train-test 划分，本单元允许过拟合）
#   - 模型：sklearn DecisionTreeClassifier(criterion="gini", random_state=42)
#   - 参数网格：max_depth ∈ {1, 2} × min_samples_leaf ∈ {10, 60}，共 4 组
# 产出两个目标变量的结果（research_note_1 = 分种类 / research_note_2 = 分公母）。
# 用法：python3 scripts/generate_research_note_data.py（需已安装 scikit-learn）
# 产出：reports/data/research-note-data.json

import json
from pathlib import Path

from sklearn.tree import DecisionTreeClassifier

ROOT = Path(__file__).resolve().parent.parent
DATA_PATH = ROOT / "src" / "data" / "penguins.json"
OUT_DIR = ROOT / "reports" / "data"
OUT_PATH = OUT_DIR / "research-note-data.json"

FEATURES = [
    ("billLength", "嘴的长度（毫米）"),
    ("billDepth", "嘴的厚度（毫米）"),
    ("flipper", "翅膀长度（毫米）"),
    ("mass", "体重（克）"),
]
COMBOS = [(1, 10), (1, 60), (2, 10), (2, 60)]

# 目标变量定义：y=0 是「画在下面那一类」，与网站图表一致（Adelie 最下 / 母最下）
TARGETS = {
    "species": {
        "classes": ["Adelie", "Chinstrap"],
        "class_cn": {0: "阿德利企鹅", 1: "帽带企鹅"},
        "label_of": lambda r: 0 if r["species"] == "Adelie" else 1,
        "keep": lambda r: r["species"] in ("Adelie", "Chinstrap"),
        "scope": "仅 Adelie 与 Chinstrap",
    },
    "sex": {
        "classes": ["female", "male"],
        "class_cn": {0: "母企鹅", 1: "公企鹅"},
        "label_of": lambda r: 0 if r["sex"] == "female" else 1,
        # ⚠️ 与 species 不是同一批：三种企鹅全取，只要性别已知；Y 换了、样本也换了
        "keep": lambda r: r["sex"] in ("female", "male"),
        "scope": "三种企鹅全取、只要性别已知",
    },
}


def load_xy(target: str) -> tuple[list[list[float]], list[int]]:
    payload = json.loads(DATA_PATH.read_text(encoding="utf-8"))
    spec = TARGETS[target]
    keys = [k for k, _ in FEATURES]
    xs: list[list[float]] = []
    ys: list[int] = []
    for r in payload["records"]:
        if r["year"] not in (2007, 2008):
            continue
        if not spec["keep"](r):
            continue
        row = [r[k] for k in keys]
        if any(v is None for v in row):
            continue
        xs.append([float(v) for v in row])
        ys.append(spec["label_of"](r))
    return xs, ys


def tree_rules(clf: DecisionTreeClassifier, class_cn: dict[int, str]) -> list[dict[str, object]]:
    """把树翻译成人话规则；同特征同方向的连续条件合并为更紧的阈值（与网站口径一致）。"""
    t = clf.tree_
    names = [label for _, label in FEATURES]
    class_names = [class_cn[0], class_cn[1]]
    rules: list[dict[str, object]] = []

    def walk(node: int, path: list[tuple[str, str, float]]) -> None:
        if t.children_left[node] == -1:
            value = t.value[node][0]
            total = int(t.n_node_samples[node])
            n_first = int(round(float(value[0]) * total))
            n_second = total - n_first
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
                    "predict": class_names[int(value.argmax())],
                    "samples": total,
                    "nFirst": n_first,
                    "nSecond": n_second,
                }
            )
            return
        name = names[int(t.feature[node])]
        thr = float(t.threshold[node])
        walk(int(t.children_left[node]), path + [(name, "le", thr)])
        walk(int(t.children_right[node]), path + [(name, "gt", thr)])

    walk(0, [])
    return rules


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


def run_target(target: str) -> dict[str, object]:
    spec = TARGETS[target]
    x, y = load_xy(target)
    n = len(y)
    n_first = int(sum(1 for v in y if v == 0))
    n_second = n - n_first

    combos: dict[str, dict[str, object]] = {}
    for depth, leaf in COMBOS:
        clf = DecisionTreeClassifier(
            criterion="gini", max_depth=depth, min_samples_leaf=leaf, random_state=42
        )
        clf.fit(x, y)
        pred = clf.predict(x)
        correct = int(sum(1 for a, b in zip(y, pred) if a == b))
        cm = [[0, 0], [0, 0]]
        for true_label, pred_label in zip(y, pred):
            cm[int(true_label)][int(pred_label)] += 1
        key = f"depth{depth}-leaf{leaf}"
        combos[key] = {
            "depth": depth,
            "minLeaf": leaf,
            "n": n,
            "correct": correct,
            "accuracy": round(correct / n, 4),
            "cm": cm,
            "pickedFeatures": picked_features(clf),
            "rules": tree_rules(clf, spec["class_cn"]),
        }
        print(f"[ok] {target} {key}: acc={correct / n:.4f} correct={correct}/{n} cm={cm}")

    return {
        "meta": {
            "source": f"Palmer Penguins LTER · 2007-2008 · {spec['scope']}",
            "model": "sklearn DecisionTreeClassifier(criterion='gini', random_state=42)",
            "trainRule": f"100% 训练：{n} 只企鹅全部用来学规则，不做 train-test 划分",
            "cmRule": "行 = 真实 · 列 = 判成",
            "classes": spec["classes"],
            "classCn": [spec["class_cn"][0], spec["class_cn"][1]],
            "n": n,
            "nFirst": n_first,
            "nSecond": n_second,
            "baseline": round(max(n_first, n_second) / n, 4),
            "features": [label for _, label in FEATURES],
        },
        "combos": combos,
    }


def main() -> None:
    payload = {name: run_target(name) for name in TARGETS}
    OUT_DIR.mkdir(parents=True, exist_ok=True)
    OUT_PATH.write_text(json.dumps(payload, ensure_ascii=False, indent=2), encoding="utf-8")
    print(f"[done] 写出 {OUT_PATH}")


if __name__ == "__main__":
    main()
