# 猫狗分类 · scikit-learn 教学项目

面向**分类算法、特征工程、模型评价**三个教学重点的入门项目。
不依赖深度学习网络（CNN），专注使用 scikit-learn 讲解**经典机器学习分类**的完整流程。

## 环境要求

| 库 | 版本要求 | 用途 |
|----|----------|------|
| Python | 3.12+ | — |
| scikit-learn | 1.9+ | 分类算法与评价 |
| numpy / pandas | 2.x | 数值与数据处理 |
| matplotlib | 3.11+ | 可视化 |
| Pillow | 有即可 | 图像读取 |

安装缺失依赖（国内推荐腾讯云镜像）：

```bash
pip install -i https://mirrors.cloud.tencent.com/pypi/simple scikit-learn matplotlib
```

## 项目结构

```
catdog-classification/
├── config.py       # 全局配置：路径、图像尺寸、随机种子、算法清单
├── features.py     # 🔍 特征工程：从图片提取 20 维可计算特征（教学重点1）
├── datasets.py     # 数据加载：真实目录（filtered 结构）or 合成演示数据
├── train.py        # 🏃 主流程：加载 → 特征 → 多算法训练 → 评价
├── evaluate.py     # 📊 模型评价与可视化（教学重点3）
├── predict.py      # 🎯 用训练好的模型预测新图片
├── output/         # 运行后自动生成的图表（混淆矩阵、特征分布、学习曲线）
└── README.md
```

数据集位于 `../data/`：

```
data/
├── cats_and_dogs/          # cats_and_dogs_filtered 10% 抽样版（1.4MB）
│   ├── train/{cats,dogs}/      每类 200 张
│   └── validation/{cats,dogs}/ 每类 100 张
└── penguins/               # Palmer Penguins（备选教学数据集）
    ├── penguins.csv            清洗版（344 条，8 列）
    └── penguins_raw.csv        原始版
```

## 快速开始

**方式一：真实猫狗数据（已内置抽样版，推荐）**

```bash
python train.py
```

加载 600 张真实图片 → 提取 20 维特征 → 4 种算法训练对比 →
交叉验证 + 测试集评估 + 混淆矩阵/学习曲线（保存至 `output/`）。

**方式二：合成演示数据（零数据可跑）**

```bash
python train.py --demo
```

**方式三：使用自己组织的图片目录**

```bash
python train.py --data /path/to/数据目录
```

目录需按 `{cats,dogs}/*.jpg` 或 `{train,validation}/{cats,dogs}/*.jpg` 组织。

**预测新图片（教学闭环最后一步）**

```bash
python predict.py --path /path/to/photo.jpg      # 用真实数据训练
python predict.py --demo --path /path/to/photo.jpg  # 用合成数据训练
```

## 三个教学重点

1. **特征工程（features.py）**：`extract_features` 手工设计 20 维浅层特征——
   尺寸、灰度统计、RGB 颜色直方图、边缘密度、中心-边缘亮度差、左右对称差。
   教学可引导讨论：什么样的特征能区分猫和狗？加/减特征会怎样影响效果？
   可视化 `output/feature_distribution.png` 直观展示哪些特征可分。

2. **分类算法（train.py）**：同一组特征上对比 4 种经典算法——
   逻辑回归、决策树、SVM（RBF 核）、K 近邻。
   可在 `config.py` 的 `ALGORITHMS` 中增删算法或调参做实验。

3. **模型评价（evaluate.py）**：不止看准确率——
   - 按类别的 precision / recall / F1（交叉验证输出）
   - 混淆矩阵热力图（每个算法一张）
   - 训练集 vs 测试集差距（过拟合诊断，决策树是现成的过拟合案例）
   - 学习曲线（样本量对精度的影響）

## 教学参考结论（当前数据规模下的实测）

| 算法 | 交叉验证 | 训练集 | 测试集 | 观察点 |
|------|---------|--------|--------|--------|
| Logistic Regression | 0.618 | 0.643 | 0.593 | 稳定、无明显过拟合 |
| Decision Tree | 0.565 | 0.713 | 0.493 | **过拟合典型案例**（差距 0.22）|
| SVM-RBF | 0.592 | 0.698 | 0.600 | 测试集最佳 |
| KNN | 0.595 | 0.700 | 0.560 | 对特征尺度与 k 敏感 |

随机猜测 = 50%。浅层手工特征把精度提到 ~60%，说明特征有信息量但有限——
这正是引导学生讨论「特征决定上限，模型决定逼近上限的程度」的绝佳素材。
课堂可让学生尝试：增大 `HIST_BINS`、加大 `IMG_SIZE`、增加新特征，观察精度变化。

## 可选进阶

- 调节 `config.py` 中 `HIST_BINS`（直方图桶数）、`IMG_SIZE`，观察特征表达力。
- 在 `ALGORITHMS` 中加入随机森林 / 梯度提升，对比树模型的过拟合差异。
- 用 `data/penguins/penguins.csv` 做表格数据分类（更聚焦算法与评价本身）。
