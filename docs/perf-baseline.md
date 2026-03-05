# Performance Baseline

## Build Size Snapshot

### Before this optimization pass

- Main app chunk: `assets/index-*.js` around `~544 KB` (gzip `~172 KB`)
- Lazy sidebar chunk: `assets/sidebar-right-*.js` around `~162 KB`
- Build warning: chunk size over `500 KB`

### After this optimization pass

- `assets/react-vendor-*.js`: `469.19 KB` (gzip `149.13 KB`)
- `assets/index-*.js`: `127.30 KB` (gzip `40.84 KB`)
- `assets/gesture-utils-*.js`: `88.39 KB` (gzip `28.22 KB`)
- `assets/sidebar-right-*.js`: `25.54 KB` (gzip `6.89 KB`)
- Chunk warning: no `>500 KB` warning in current build output

## Runtime Profiling Checklist

Use React DevTools Profiler and compare before/after with these scenarios:

1. Pan canvas continuously for 5 seconds.
2. Wheel zoom continuously for 5 seconds.
3. Eraser drag continuously for 5 seconds.
4. Drag minimap viewport continuously for 5 seconds.

Record:

- Commit count
- Slowest commit duration
- Noticeable frame drops or input lag

## Functional Regression Checklist

1. Undo/redo behavior after long eraser drags.
2. Minimap click-center and viewport drag interactions.
3. Copy/cut/paste and snapshot export behavior.
4. Tool switching and keyboard shortcuts.
