"""全局配置：集中管理可调参数，方便教学中反复实验。"""
from pathlib import Path

# 项目根目录（catdog-classification/）
PROJECT_ROOT: Path = Path(__file__).resolve().parent

# ---------- 数据相关 ----------
# 猫狗数据集：cats_and_dogs_filtered 结构（train/validation × cats/dogs）
DATA_DIR: Path = PROJECT_ROOT.parent / "data" / "cats_and_dogs"

# 图片统一缩放尺寸（越小训练越快，越大保留细节越多）
IMG_SIZE: tuple[int, int] = (64, 64)

# 测试集占比
TEST_SIZE: float = 0.25

# 随机种子（保证每次实验结果可复现，教学演示稳定）
RANDOM_STATE: int = 42

# 合成演示数据规模（--demo 模式）
DEMO_PER_CLASS: int = 120          # 每类样本数
DEMO_IMG_SIZE: int = 64            # 合成图边长（像素）
DEMO_NOISE: float = 0.25           # 噪声强度，越大越难分类

# ---------- 特征工程 ----------
# 颜色直方图每个通道的桶数
HIST_BINS: int = 4

# 是否保存可视化图片（混淆矩阵、特征分布等）
SAVE_PLOTS: bool = True

# 结果图片输出目录
OUTPUT_DIR: Path = PROJECT_ROOT / "output"

# ---------- 模型 ----------
# 参与对比的算法（配置化，方便增删算法做教学实验）
ALGORITHMS: dict[str, dict] = {
    "Logistic Regression": {
        "model": "LogisticRegression",
        "params": {"max_iter": 1000, "C": 1.0},
    },
    "Decision Tree": {
        "model": "DecisionTreeClassifier",
        "params": {"max_depth": 6, "random_state": RANDOM_STATE},
    },
    "SVM-RBF": {
        "model": "SVC",
        "params": {"kernel": "rbf", "C": 1.0, "gamma": "scale"},
    },
    "KNN": {
        "model": "KNeighborsClassifier",
        "params": {"n_neighbors": 5},
    },
}

# 学习曲线用到的训练集占比（教学重点3）
LEARNING_CURVE_SIZES = [0.1, 0.25, 0.4, 0.55, 0.7, 0.85, 1.0]