# ABOUTME: 生成研究笔记 3（reports/research-note-3.md，用于 L3 + L4）所需的全部数字。
# 任务：猜公母（sex）。样本切分与 L3/L4 一致：
#   - 训练集 = 2007 + 2008 年，性别已知，n = 216（公 109 / 母 107，闭眼全猜 50.5%）
#   - 验证集 = 2009 年，性别已知，n = 117（公 59 / 母 58，闭眼全猜 50.4%）
# 三站网格（孩子说的名字 → sklearn 参数）：
#   决策树   depth ∈ {1,2,3,5,不限} × min-leaf ∈ {1,20}        （另给"最后分成几堆"）
#   打分模型 C ∈ {0.01,0.1,1,10,100}（配 StandardScaler）
#   随机森林 n_estimators ∈ {10,100} × depth ∈ {1,3,不限}，min-leaf = 1
# 用法：python3 scripts/generate_research_note_3_data.py（需 scikit-learn）
# 产出：reports/data/research-note-3-data.json
#
# ⚠️ 随机森林数字对随机种子敏感：同一配置换种子，验证集会在 84.6%–88.9% 之间跳。
#    本脚本固定 random_state=42，并把结果写进 JSON —— 课堂上**只认 JSON 里的数字**，
#    不允许让孩子现场跑代码取数，否则 25 个人会拿到 25 份不同的表，比较就失去意义。

import json
from pathlib import Path

from sklearn.ensemble import RandomForestClassifier
from sklearn.linear_model import LogisticRegression
from sklearn.pipeline import make_pipeline
from sklearn.preprocessing import StandardScaler
from sklearn.tree import DecisionTreeClassifier

ROOT = Path(__file__).resolve().parent.parent
DATA_PATH = ROOT / "src" / "data" / "penguins.json"
OUT_DIR = ROOT / "reports" / "data"
OUT_PATH = OUT_DIR / "research-note-3-data.json"

FEATURES = [
    ("billLength", "嘴的长度（毫米）"),
    ("billDepth", "嘴的厚度（毫米）"),
    ("flipper", "翅膀长度（毫米）"),
    ("mass", "体重（克）"),
]
FEAT_CN_SHORT = {"billLength": "嘴长", "billDepth": "嘴厚", "flipper": "鳍长", "mass": "体重"}
SEED = 42

# 网格定义（顺序即笔记里的行序；"不限" = 不加这个约束）
DEPTHS = [1, 2, 3, 5, None]
LEAVES = [1, 20]
CS = [0.01, 0.1, 1, 10, 100]
FOREST_N = [10, 100]
FOREST_DEPTHS = [1, 3, None]


def load_split() -> tuple[list[list[float]], list[int], list[list[float]], list[int]]:
    payload = json.loads(DATA_PATH.read_text(encoding="utf-8"))
    keys = [k for k, _ in FEATURES]
    tr_x: list[list[float]] = []
    tr_y: list[int] = []
    va_x: list[list[float]] = []
    va_y: list[int] = []
    for r in payload["records"]:
        if r.get("sex") not in ("female", "male"):
            continue
        row = [r[k] for k in keys]
        if any(v is None for v in row):
            continue
        y = 0 if r["sex"] == "female" else 1  # y=0 母（画在下面），y=1 公
        if r["year"] in (2007, 2008):
            tr_x.append([float(v) for v in row])
            tr_y.append(y)
        elif r["year"] == 2009:
            va_x.append([float(v) for v in row])
            va_y.append(y)
    return tr_x, tr_y, va_x, va_y


def used_features(clf) -> list[str]:
    t = clf.tree_
    picked: list[str] = []
    for node in range(t.node_count):
        if t.children_left[node] != -1:
            name = FEAT_CN_SHORT[[k for k, _ in FEATURES][int(t.feature[node])]]
            if name not in picked:
                picked.append(name)
    return picked


def pct(x: float) -> float:
    return round(x * 100, 1)


def main() -> None:
    tr_x, tr_y, va_x, va_y = load_split()
    n_tr, n_va = len(tr_y), len(va_y)
    print(f"train n={n_tr} 公{sum(tr_y)}/母{n_tr - sum(tr_y)}  baseline={max(sum(tr_y), n_tr - sum(tr_y)) / n_tr * 100:.1f}%")
    print(f"valid n={n_va} 公{sum(va_y)}/母{n_va - sum(va_y)}  baseline={max(sum(va_y), n_va - sum(va_y)) / n_va * 100:.1f}%")

    # ---- 第一站：决策树 ----
    tree_rows = []
    for depth in DEPTHS:
        for leaf in LEAVES:
            m = DecisionTreeClassifier(
                max_depth=depth, min_samples_leaf=leaf, random_state=SEED
            ).fit(tr_x, tr_y)
            tree_rows.append(
                {
                    "depth": "不限" if depth is None else depth,
                    "leaf": leaf,
                    "nLeaves": int(m.get_n_leaves()),
                    "train": pct(m.score(tr_x, tr_y)),
                    "valid": pct(m.score(va_x, va_y)),
                    "trainCorrect": int(round(m.score(tr_x, tr_y) * n_tr)),
                    "validCorrect": int(round(m.score(va_x, va_y) * n_va)),
                    "used": used_features(m),
                }
            )
            print(
                f"  [tree] depth={tree_rows[-1]['depth']:<4} leaf={leaf:<3} "
                f"堆={tree_rows[-1]['nLeaves']:<3} train={tree_rows[-1]['train']}% valid={tree_rows[-1]['valid']}%"
            )

    # ---- 第二站：打分模型 ----
    logit_rows = []
    for c in CS:
        m = make_pipeline(StandardScaler(), LogisticRegression(C=c, max_iter=5000)).fit(tr_x, tr_y)
        logit_rows.append(
            {
                "C": c,
                "train": pct(m.score(tr_x, tr_y)),
                "valid": pct(m.score(va_x, va_y)),
                "trainCorrect": int(round(m.score(tr_x, tr_y) * n_tr)),
                "validCorrect": int(round(m.score(va_x, va_y) * n_va)),
            }
        )
        print(f"  [logit] C={c:<7} train={logit_rows[-1]['train']}% valid={logit_rows[-1]['valid']}%")

    # ---- 第三站：随机森林 ----
    forest_rows = []
    for n in FOREST_N:
        for depth in FOREST_DEPTHS:
            m = RandomForestClassifier(
                n_estimators=n, max_depth=depth, min_samples_leaf=1, random_state=SEED
            ).fit(tr_x, tr_y)
            forest_rows.append(
                {
                    "nTrees": n,
                    "depth": "不限" if depth is None else depth,
                    "train": pct(m.score(tr_x, tr_y)),
                    "valid": pct(m.score(va_x, va_y)),
                    "trainCorrect": int(round(m.score(tr_x, tr_y) * n_tr)),
                    "validCorrect": int(round(m.score(va_x, va_y) * n_va)),
                }
            )
            print(
                f"  [forest] n={n:<4} depth={forest_rows[-1]['depth']:<4} "
                f"train={forest_rows[-1]['train']}% valid={forest_rows[-1]['valid']}%"
            )

    payload = {
        "meta": {
            "source": "Palmer Penguins LTER（三种企鹅，只要性别有记录）",
            "task": "猜公母：y=0 母 / y=1 公",
            "train": {"years": [2007, 2008], "n": n_tr, "male": int(sum(tr_y)), "female": int(n_tr - sum(tr_y))},
            "valid": {"years": [2009], "n": n_va, "male": int(sum(va_y)), "female": int(n_va - sum(va_y))},
            "baselineTrain": pct(max(sum(tr_y), n_tr - sum(tr_y)) / n_tr),
            "baselineValid": pct(max(sum(va_y), n_va - sum(va_y)) / n_va),
            "features": [label for _, label in FEATURES],
            "seed": SEED,
            "seedWarning": "随机森林对种子敏感：换种子验证集会落在 84.6%–88.9%。课堂一律用本文件数字。",
            "onePenguin": round(100 / n_va, 1),
        },
        "tree": tree_rows,
        "logit": logit_rows,
        "forest": forest_rows,
    }
    OUT_DIR.mkdir(parents=True, exist_ok=True)
    OUT_PATH.write_text(json.dumps(payload, ensure_ascii=False, indent=2), encoding="utf-8")
    print(f"[done] 写出 {OUT_PATH}")


if __name__ == "__main__":
    main()
