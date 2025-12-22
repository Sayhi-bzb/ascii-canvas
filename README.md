[English] | [简体中文](./README.zh-CN.md)

# ASCII Canvas

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](https://opensource.org/licenses/MIT)
[![React](https://img.shields.io/badge/Framework-React_18-61DAFB?logo=react)](https://react.dev/)
[![TypeScript](https://img.shields.io/badge/Language-TypeScript-3178C6?logo=typescript)](https://www.typescriptlang.org/)
[![Collaboration](https://img.shields.io/badge/Sync-Yjs_CRDT-orange?logo=distributed-systems)](https://yjs.dev/)
[![Deploy](https://img.shields.io/badge/Demo-Live_Preview-22c55e?logo=cloudflare-pages)](https://ascii-canvas.pages.dev/)

**ASCII Canvas** is a high-performance, collaborative ASCII art creation and character-based layout framework. Built with modern graphics engineering principles, it provides a seamless, infinite-canvas environment for precision character design and real-time multiplayer coordination.

[**Live Demo**](https://ascii-canvas.pages.dev/) | [**GitHub Repository**](https://github.com/Sayhi-bzb/ascii-canvas.git)

---

## 🛠 Core Features

### 1. High-Performance Rendering

- **Multi-layer Canvas Architecture**: Utilizes three distinct layers (Background, Scratch, and UI) to maintain 60FPS performance even during complex operations.
- **Infinite Viewport**: Integrated screen-to-grid mapping allows for seamless panning and zooming across an unbounded workspace.

### 2. Intelligent Layout Engine

- **Setback Inheritance**: Smart newline logic that automatically detects and maintains indentation from previous lines.
- **Wide-Character Support**: Fully compatible with CJK characters and Emojis, featuring automatic grid-occupancy correction.
- **Modular Indentation**: A professional Tab system that shifts the cursor by two standard grid units for structured layouts.

### 3. Distributed Collaboration

- **Yjs CRDT Integration**: Powered by conflict-free replicated data types (CRDT) to enable real-time, low-latency collaborative editing.
- **Robust Persistence**: High-granularity undo/redo management with local storage synchronization.

### 4. Precision Editing Tools

- **Anchor-based Selection**: `Shift + Click` functionality for rapid, anchored rectangular zoning.
- **Mass Pouring (Fill)**: Instantly fill active selection areas with any character input.
- **Contextual Command Hub**: Professional context menu for Copy, Cut, Paste, and Demolish (Delete) operations.

---

## 🏗 Tech Stack

- **Frontend**: React 18, TypeScript
- **State Management**: Zustand (Slice Pattern)
- **Synchronization**: Yjs / Y-IndexedDB
- **Gestures**: @use-gesture/react
- **UI Components**: Tailwind CSS, Shadcn UI, Radix UI

---

## 🚀 Getting Started

### Installation

```bash
git clone https://github.com/Sayhi-bzb/ascii-canvas.git
cd ascii-canvas
npm install
```

### Development

```bash
npm run dev
```

### Build

```bash
npm run build
```

---

## ⌨️ Shortcuts Reference

| Action            | Shortcut        | Description                                       |
| :---------------- | :-------------- | :------------------------------------------------ |
| **Zoning**        | `Drag`          | Traditional rectangular area selection            |
| **Anchor Zoning** | `Shift + Click` | Create selection between anchor and current point |
| **Mass Fill**     | `Char Key`      | Fill active selection with the pressed character  |
| **Smart Newline** | `Enter`         | New line with inherited indentation               |
| **Pave Space**    | `Tab`           | Shift cursor right by 2 grid units                |
| **Context Menu**  | `Right Click`   | Access Copy, Cut, Paste, and Delete commands      |

---

## 🗺 Roadmap

- [x] Multi-layer Canvas rendering engine.
- [x] Real-time collaboration via Yjs.
- [x] Intelligent Indentation & Tab system.
- [x] Context Menu & Clipboard integration.
- [ ] **NES (Next Edit Suggestion)**: Predictive character placement based on layout patterns.
- [ ] **AI Chat Integration**: Natural language interface for generating canvas components and complex ASCII structures.
- [ ] ANSI Sequence & SVG Export support.

---

## 📄 License

This project is licensed under the **MIT License**. See the [LICENSE](LICENSE) file for details.

---
