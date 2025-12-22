[English](./README.md) | [简体中文]

# ASCII Canvas (中文文档)

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](https://opensource.org/licenses/MIT)
[![React](https://img.shields.io/badge/Framework-React_18-61DAFB?logo=react)](https://react.dev/)
[![TypeScript](https://img.shields.io/badge/Language-TypeScript-3178C6?logo=typescript)](https://www.typescriptlang.org/)
[![Collaboration](https://img.shields.io/badge/Sync-Yjs_CRDT-orange?logo=distributed-systems)](https://yjs.dev/)
[![Deploy](https://img.shields.io/badge/Demo-Live_Preview-22c55e?logo=cloudflare-pages)](https://ascii-canvas.pages.dev/)

**ASCII Canvas** 是一款高性能、协同式的 ASCII 艺术创作与字符布局框架。它结合了现代图形工程原理，为精准的字符设计和实时多用户协作提供了一个流畅、无限画布的环境。

[**在线体验**](https://ascii-canvas.pages.dev/) | [**GitHub 仓库**](https://github.com/Sayhi-bzb/ascii-canvas.git)

---

## 🛠 核心特性

### 1. 高性能渲染

- **多层 Canvas 架构**: 采用三层独立画布（背景层、草图层、UI 层），确保在复杂操作下依然维持 60FPS 的性能。
- **无限视口**: 集成屏幕到网格的映射算法，支持在无限空间内进行平滑的平移与缩放。

### 2. 智能布局引擎

- **缩进继承**: 智能换行逻辑，自动检测并保持前序行的缩进位置。
- **全角字符支持**: 完美兼容 CJK（中日韩）字符与 Emoji，具备自动网格占位修正功能。
- **模块化缩进**: 专业的 Tab 系统，支持将光标向右平移两个标准网格单位。

### 3. 分布式协同

- **Yjs CRDT 集成**: 基于无冲突复制数据类型 (CRDT)，实现低延迟、实时的多用户协同编辑。
- **可靠的持久化**: 具备高颗粒度的撤销/重做管理，并支持本地存储同步。

### 4. 精准编辑工具

- **锚点式选区**: 支持 `Shift + Click` 快速锚点定点，实现高效的矩形区域划定。
- **批量填充 (Fill)**: 在激活选区内通过任意按键输入即可实现大面积字符填充。
- **右键指令中心**: 集成右键上下文菜单，支持复制、剪切、粘贴及删除操作。

---

## 🗺 发展路线 (Roadmap)

- [x] 多层 Canvas 渲染引擎。
- [x] 基于 Yjs 的实时协同编辑。
- [x] 智能缩进与 Tab 系统。
- [x] 右键上下文菜单与剪贴板集成。
- [ ] **NES (Next Edit Suggestion)**: 基于布局模式的下一处编辑智能建议。
- [ ] **AI Chat 集成**: 通过自然语言交互生成画布组件与复杂的 ASCII 结构。
- [ ] 支持导出 ANSI 序列与 SVG 格式。
