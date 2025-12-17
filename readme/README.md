# ASCII Canvas

English | [简体中文](./README.zh-CN.md) | [日本語](./README.ja.md) | [한국어](./README.ko.md)

A browser-based ASCII art editor built with React and TypeScript. Create ASCII drawings with an intuitive canvas interface, featuring multiple drawing tools, undo/redo support, and real-time rendering.

## Features

- **Multiple Drawing Tools**: Select, brush, line, box, eraser, and fill tools
- **Text Input Mode**: Direct text input with cursor navigation
- **Selection & Clipboard**: Select regions, copy/cut/paste ASCII content
- **Undo/Redo**: Full history management powered by Yjs and Zundo
- **Canvas Navigation**: Pan and zoom with mouse/touch gestures
- **Export**: Copy your artwork to clipboard
- **Wide Character Support**: Handles full-width characters (CJK) correctly

## Tech Stack

- **Framework**: React 19 + TypeScript
- **Build Tool**: Vite
- **State Management**: Zustand with Zundo for undo/redo
- **Styling**: Tailwind CSS
- **UI Components**: Radix UI primitives
- **Notifications**: Sonner
- **Gestures**: @use-gesture/react
- **Collaboration Ready**: Yjs for shared data structures

## Project Structure

```
src/
├── components/
│   ├── AsciiCanvas/          # Main canvas component
│   │   ├── hooks/            # useCanvasInteraction, useCanvasRenderer
│   │   └── index.tsx
│   ├── Toolbar.tsx           # Drawing tools UI
│   └── ui/                   # Radix UI components
├── store/
│   └── canvasStore.ts        # Zustand store with canvas state
├── utils/
│   ├── char.ts               # Character width detection
│   ├── export.ts             # Export to string
│   ├── shapes.ts             # Line/box drawing algorithms
│   ├── selection.ts          # Selection bounds calculation
│   └── math.ts               # Grid/screen coordinate conversion
├── lib/
│   ├── constants.ts          # App constants (zoom limits, etc.)
│   ├── yjs-setup.ts          # Yjs configuration
│   └── utils.ts              # Common utilities
└── types/
    └── index.ts              # TypeScript type definitions
```

## Getting Started

### Prerequisites

- Node.js (version 18 or higher recommended)
- npm or yarn

### Installation

```bash
# Clone the repository
git clone <repository-url>
cd ascii-canvas

# Install dependencies
npm install
```

### Development

```bash
# Start development server with hot reload
npm run dev
```

Open [http://localhost:5173](http://localhost:5173) in your browser.

### Build

```bash
# Type check and build for production
npm run build

# Preview production build
npm run preview
```

### Linting

```bash
# Run ESLint
npm run lint

# Find unused exports with Knip
npm run knip
```

## Usage

### Drawing Tools

- **Select**: Click to place text cursor, drag to create selection areas
- **Brush**: Draw freehand with the current brush character
- **Line**: Draw straight lines
- **Box**: Draw rectangular outlines
- **Fill**: Fill selected areas with a character
- **Eraser**: Remove characters from the canvas

### Keyboard Shortcuts

- `Ctrl/Cmd + Z`: Undo
- `Ctrl/Cmd + Shift + Z` or `Ctrl/Cmd + Y`: Redo
- `Ctrl/Cmd + C`: Copy selection
- `Ctrl/Cmd + X`: Cut selection
- `Ctrl/Cmd + V`: Paste
- `Delete` or `Backspace`: Delete selection
- `Esc`: Exit text input mode
- Arrow keys: Navigate text cursor

### Canvas Navigation

- **Pan**: Click and drag with mouse
- **Zoom**: Mouse wheel or pinch gesture

## Architecture Highlights

### State Management

The app uses Zustand for state management with Yjs as the underlying data structure. This enables:

- Efficient undo/redo through Yjs transactions
- Potential for real-time collaboration
- Immutable update patterns

### Rendering

The canvas uses HTML5 Canvas API with a custom renderer (`useCanvasRenderer`) that:

- Renders only visible grid cells for performance
- Supports scratch layers for preview during drawing
- Handles wide characters (CJK) correctly

### Drawing Algorithms

- **Line**: Bresenham's line algorithm
- **Box**: Corner-to-corner rectangle drawing
- **Selection**: Multi-region support with bounds calculation

## Contributing

Contributions are welcome! Please feel free to submit issues or pull requests.

## License

MIT
