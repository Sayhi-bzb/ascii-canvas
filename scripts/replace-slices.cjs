const fs = require('fs');
let content = fs.readFileSync('src/store/canvasStore.ts', 'utf8');
const startIndex = content.indexOf('createCanvasSession: (mode = "freeform", options) => {');
const endIndex = content.indexOf('...createDrawingSlice(set, get, ...a),');
if (startIndex !== -1 && endIndex !== -1) {
  content = content.slice(0, startIndex) + '...createSessionSlice(set, get, ...a),\n        ...createAnimationSlice(set, get, ...a),\n\n        ' + content.slice(endIndex);
  fs.writeFileSync('src/store/canvasStore.ts', content);
  console.log('replaced');
} else {
  console.log('not found');
}