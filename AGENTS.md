# 项目上下文

## 技术栈

- **核心**: Vite 7, TypeScript, Express
- **UI**: Tailwind CSS

## 目录结构

```
├── scripts/            # 构建与启动脚本
│   ├── build.sh        # 构建脚本
│   ├── dev.sh          # 开发环境启动脚本
│   ├── prepare.sh      # 预处理脚本
│   ├── precompute-classifiers.mjs  # 初步分类页模型预计算（node 一次性运行，产出 classifier-models.json）
│   └── start.sh        # 生产环境启动脚本
├── server/             # 服务端逻辑
│   ├── routes/         # API 路由
│   ├── server.ts       # Express 服务入口
│   └── vite.ts         # Vite 中间件集成
├── src/                # 前端源码
│   ├── charts/         # ECharts 封装（penguin-chart.ts 含决策虚线能力）
│   ├── components/     # Tab 页面：tab1-species / tab2-dataset / tab3-explore / tab4-classify、header
│   ├── data/           # penguins.json 数据源、classifier-models.json 预计算模型、dataset.ts、types.ts
│   ├── index.css       # 全局样式
│   ├── index.ts        # 客户端入口
│   └── main.ts         # 主逻辑
├── index.html          # 入口 HTML
├── package.json        # 项目依赖管理
├── tsconfig.json       # TypeScript 配置
└── vite.config.ts      # Vite 配置
```

## 预计算模型说明（初步分类页）

- 页面所用决策树 cutoff、OLS 系数、准确率、混淆矩阵**全部来自预计算**，前端只查表渲染，不做运行时训练。
- 修改数据或模型定义后：运行 `node scripts/precompute-classifiers.mjs` 重新生成 `src/data/classifier-models.json`。
- 模型定义：单特征 = 1 层决策树（加权 gini 最优切分）；双特征 = OLS 拟合 0/1 标签 + 0.5 cutoff；评估均在 2007-2008 训练集。

## 包管理规范

**仅允许使用 pnpm** 作为包管理器，**严禁使用 npm 或 yarn**。
**常用命令**：
- 安装依赖：`pnpm add <package>`
- 安装开发依赖：`pnpm add -D <package>`
- 安装所有依赖：`pnpm install`
- 移除依赖：`pnpm remove <package>`

## 开发规范

- 使用 Tailwind CSS 进行样式开发

### 编码规范

- 默认按 TypeScript `strict` 心智写代码；优先复用当前作用域已声明的变量、函数、类型和导入，禁止引用未声明标识符或拼错变量名。
- 禁止隐式 `any` 和 `as any`；函数参数、返回值、解构项、事件对象、Express `req`/`res`、`catch` 错误在使用前应有明确类型或先完成类型收窄，并清理未使用的变量和导入。
