[English] | [简体中文](./README.zh-CN.md)

# ASCII Canvas

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](https://opensource.org/licenses/MIT)
[![React](https://img.shields.io/badge/Framework-React_18-61DAFB?logo=react)](https://react.dev/)
[![TypeScript](https://img.shields.io/badge/Language-TypeScript-3178C6?logo=typescript)](https://www.typescriptlang.org/)
[![Collaboration](https://img.shields.io/badge/Sync-Yjs_CRDT-orange?logo=distributed-systems)](https://yjs.dev/)
[![Deploy](https://img.shields.io/badge/Demo-Live_Preview-22c55e?logo=cloudflare-pages)](https://ascii-canvas.pages.dev/)

> **"The native visual interface for the LLM era: An infinite, multi-byte ASCII canvas designed to be the shared whiteboard for Humans and AI."**

<br />

<p align="center">
  <img src="public/Cover.png" alt="ASCII Canvas Cover" width="100%" style="border-radius: 8px; border: 1px solid #333; box-shadow: 0 8px 30px rgba(0,0,0,0.12);">
</p>

<p align="center">
  <a href="https://ascii-canvas.pages.dev/">
    <img src="https://img.shields.io/badge/✨_Try_Live_Demo-Click_Here-22c55e?style=for-the-badge&logo=rocket" height="40">
  </a>
</p>

---

## 🛠 Core Features

**ASCII Canvas** is a high-performance, collaborative ASCII art creation engine. Unlike traditional whiteboards that output pixels (opaque to LLMs), this engine renders structured, semantic Unicode grids.

### 1. High-Performance Rendering

- **Multi-layer Architecture**: Utilizes three distinct layers (Background, Scratch, and UI) to maintain 60FPS.
- **Infinite Viewport**: Integrated screen-to-grid mapping for seamless panning and zooming.

### 2. Intelligent Layout Engine

- **Setback Inheritance**: Smart newline logic automatically detects and maintains indentation.
- **Wide-Character Support**: Native support for **CJK characters**, **Nerd Fonts**, and **Emojis**.
- **Modular Indentation**: Professional Tab system shifting cursor by 2 grid units.

### 3. Distributed Collaboration

- **Yjs CRDT Integration**: Real-time, low-latency collaborative editing.
- **Robust Persistence**: High-granularity undo/redo management with local storage sync.

### 4. Precision Editing Tools

- **Anchor Zoning**: `Shift + Click` for rapid rectangular selection.
- **Mass Fill**: Instantly fill active selections with any character.
- **Context Hub**: Professional menu for Copy, Cut, Paste, and Demolish operations.

---

## ✨ Showcase

<div align="center">
  <img src="public/Case/Case1.webp" width="48%" style="border-radius: 6px; border: 1px solid #333; margin: 5px;" />
  <img src="public/Case/Case2.webp" width="48%" style="border-radius: 6px; border: 1px solid #333; margin: 5px;" />
</div>
<div align="center">
  <img src="public/Case/Case3.webp" width="32%" style="border-radius: 6px; border: 1px solid #333; margin: 3px;" />
  <img src="public/Case/Case4.webp" width="32%" style="border-radius: 6px; border: 1px solid #333; margin: 3px;" />
  <img src="public/Case/Case5.webp" width="32%" style="border-radius: 6px; border: 1px solid #333; margin: 3px;" />
</div>

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
- [ ] **AI Chat Integration**: Natural language interface for generating canvas components.
- [ ] ANSI Sequence & SVG Export support.

---

## 📄 License

This project is licensed under the **MIT License**. See the [LICENSE](LICENSE) file for details.
