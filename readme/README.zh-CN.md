# ASCII Canvas

[English](./README.md) | 简体中文 | [日本語](./README.ja.md) | [한국어](./README.ko.md)

一个基于浏览器的 ASCII 艺术编辑器，使用 React 和 TypeScript 构建。通过直观的画布界面创建 ASCII 绘图，具备多种绘图工具、撤销/重做支持和实时渲染功能。

## 功能特性

- **多种绘图工具**：选择、画笔、直线、矩形、橡皮擦和填充工具
- **文本输入模式**：支持光标导航的直接文本输入
- **选区与剪贴板**：选择区域，复制/剪切/粘贴 ASCII 内容
- **撤销/重做**：基于 Yjs 和 Zundo 的完整历史记录管理
- **画布导航**：使用鼠标/触摸手势进行平移和缩放
- **导出功能**：将作品复制到剪贴板
- **宽字符支持**：正确处理全角字符（中日韩文字）

## 技术栈

- **框架**：React 19 + TypeScript
- **构建工具**：Vite
- **状态管理**：Zustand with Zundo（用于撤销/重做）
- **样式**：Tailwind CSS
- **UI 组件**：Radix UI 基础组件
- **通知**：Sonner
- **手势**：@use-gesture/react
- **协作支持**：Yjs 共享数据结构

## 项目结构

```
src/
├── components/
│   ├── AsciiCanvas/          # 主画布组件
│   │   ├── hooks/            # useCanvasInteraction, useCanvasRenderer
│   │   └── index.tsx
│   ├── Toolbar.tsx           # 绘图工具 UI
│   └── ui/                   # Radix UI 组件
├── store/
│   └── canvasStore.ts        # Zustand 状态存储
├── utils/
│   ├── char.ts               # 字符宽度检测
│   ├── export.ts             # 导出为字符串
│   ├── shapes.ts             # 线条/矩形绘制算法
│   ├── selection.ts          # 选区边界计算
│   └── math.ts               # 网格/屏幕坐标转换
├── lib/
│   ├── constants.ts          # 应用常量（缩放限制等）
│   ├── yjs-setup.ts          # Yjs 配置
│   └── utils.ts              # 通用工具函数
└── types/
    └── index.ts              # TypeScript 类型定义
```

## 快速开始

### 环境要求

- Node.js（推荐 18 或更高版本）
- npm 或 yarn

### 安装

```bash
# 克隆仓库
git clone <repository-url>
cd ascii-canvas

# 安装依赖
npm install
```

### 开发

```bash
# 启动开发服务器（带热重载）
npm run dev
```

在浏览器中打开 [http://localhost:5173](http://localhost:5173)。

### 构建

```bash
# 类型检查并构建生产版本
npm run build

# 预览生产构建
npm run preview
```

### 代码检查

```bash
# 运行 ESLint
npm run lint

# 使用 Knip 查找未使用的导出
npm run knip
```

## 使用方法

### 绘图工具

- **选择**：单击放置文本光标，拖动创建选区
- **画笔**：使用当前画笔字符自由绘制
- **直线**：绘制直线
- **矩形**：绘制矩形轮廓
- **填充**：用字符填充选定区域
- **橡皮擦**：从画布中删除字符

### 键盘快捷键

- `Ctrl/Cmd + Z`：撤销
- `Ctrl/Cmd + Shift + Z` 或 `Ctrl/Cmd + Y`：重做
- `Ctrl/Cmd + C`：复制选区
- `Ctrl/Cmd + X`：剪切选区
- `Ctrl/Cmd + V`：粘贴
- `Delete` 或 `Backspace`：删除选区
- `Esc`：退出文本输入模式
- 方向键：移动文本光标

### 画布导航

- **平移**：鼠标拖动
- **缩放**：鼠标滚轮或双指缩放手势

## 架构亮点

### 状态管理

应用使用 Zustand 进行状态管理，底层数据结构基于 Yjs。这带来了以下优势：

- 通过 Yjs 事务实现高效的撤销/重做
- 支持实时协作的潜力
- 不可变更新模式

### 渲染机制

画布使用 HTML5 Canvas API 和自定义渲染器（`useCanvasRenderer`）：

- 仅渲染可见网格单元以提升性能
- 支持绘图预览的暂存层
- 正确处理宽字符（中日韩文字）

### 绘图算法

- **直线**：Bresenham 直线算法
- **矩形**：角到角的矩形绘制
- **选区**：支持多区域边界计算

## 贡献

欢迎贡献！请随时提交问题或拉取请求。

## 许可证

MIT
