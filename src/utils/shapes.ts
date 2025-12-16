import bresenham from "bresenham";
import { BOX_CHARS } from "../lib/constants";
import type { Point, GridPoint } from "../types";

export function getLinePoints(start: Point, end: Point): Point[] {
  const points = bresenham(start.x, start.y, end.x, end.y);
  return points.map(({ x, y }) => ({ x, y }));
}

// 修改：增加 isVerticalFirst 参数，控制 L 型的走向
export function getOrthogonalLinePoints(
  start: Point,
  end: Point,
  isVerticalFirst: boolean
): GridPoint[] {
  const points: GridPoint[] = [];

  // 直线情况无需拐弯
  if (start.x === end.x) {
    return getLinePoints(start, end).map((p) => ({
      ...p,
      char: BOX_CHARS.VERTICAL,
    }));
  }
  if (start.y === end.y) {
    return getLinePoints(start, end).map((p) => ({
      ...p,
      char: BOX_CHARS.HORIZONTAL,
    }));
  }

  // 关键修改：根据优先轴决定“拐点 (Junction)”的位置
  // 如果垂直优先：拐点在 (start.x, end.y) -> 先走竖，再走横
  // 如果水平优先：拐点在 (end.x, start.y) -> 先走横，再走竖
  const junction: Point = isVerticalFirst
    ? { x: start.x, y: end.y }
    : { x: end.x, y: start.y };

  // 1. 第一段 (Start -> Junction)
  const segment1 = getLinePoints(start, junction);
  segment1.pop(); // 移除拐点，后面单独加
  points.push(
    ...segment1.map((p) => ({
      ...p,
      char: isVerticalFirst ? BOX_CHARS.VERTICAL : BOX_CHARS.HORIZONTAL,
    }))
  );

  // 2. 第二段 (Junction -> End)
  const segment2 = getLinePoints(junction, end);
  segment2.shift(); // 移除拐点
  points.push(
    ...segment2.map((p) => ({
      ...p,
      char: isVerticalFirst ? BOX_CHARS.HORIZONTAL : BOX_CHARS.VERTICAL,
    }))
  );

  // 3. 计算拐角字符
  let cornerChar = "";
  // 计算相对于拐点的方向
  const dx = end.x - start.x;
  const dy = end.y - start.y;

  // 逻辑推导：
  // 垂直优先 (走竖线下来/上去):
  //    (x1, y1) -> (x1, y2) -> (x2, y2)
  //    如果 dy > 0 (下), dx > 0 (右) => └ (BOTTOM_LEFT)
  //    如果 dy > 0 (下), dx < 0 (左) => ┘ (BOTTOM_RIGHT)
  //    如果 dy < 0 (上), dx > 0 (右) => ┌ (TOP_LEFT)
  //    如果 dy < 0 (上), dx < 0 (左) => ┐ (TOP_RIGHT)

  // 水平优先 (走横线过去):
  //    (x1, y1) -> (x2, y1) -> (x2, y2)
  //    如果 dx > 0 (右), dy > 0 (下) => ┐ (TOP_RIGHT)
  //    如果 dx > 0 (右), dy < 0 (上) => ┘ (BOTTOM_RIGHT)
  //    如果 dx < 0 (左), dy > 0 (下) => ╭ (TOP_LEFT) -> 修正：这里应该是 ┌
  //    等等...使用通用逻辑更稳妥：

  // 通用逻辑：判断连接线的形态
  // 垂直优先时，拐点连接的是 上下(V) 和 左右(H)
  // 水平优先时，拐点连接的是 左右(H) 和 上下(V)

  if (isVerticalFirst) {
    if (dy > 0) {
      // 从上方下来
      cornerChar = dx > 0 ? BOX_CHARS.BOTTOM_LEFT : BOX_CHARS.BOTTOM_RIGHT;
    } else {
      // 从下方上来
      cornerChar = dx > 0 ? BOX_CHARS.TOP_LEFT : BOX_CHARS.TOP_RIGHT;
    }
  } else {
    if (dx > 0) {
      // 从左方过来
      cornerChar = dy > 0 ? BOX_CHARS.TOP_RIGHT : BOX_CHARS.BOTTOM_RIGHT;
    } else {
      // 从右方过来
      cornerChar = dy > 0 ? BOX_CHARS.TOP_LEFT : BOX_CHARS.BOTTOM_LEFT;
    }
  }

  points.push({ ...junction, char: cornerChar });

  return points;
}

export function getBoxPoints(start: Point, end: Point): GridPoint[] {
  const points: GridPoint[] = [];

  const left = Math.min(start.x, end.x);
  const right = Math.max(start.x, end.x);
  const top = Math.min(start.y, end.y);
  const bottom = Math.max(start.y, end.y);

  if (left === right || top === bottom) {
    if (left === right && top === bottom)
      return [{ ...start, char: BOX_CHARS.CROSS }];
    return getLinePoints(start, end).map((p) => ({
      ...p,
      char: left === right ? BOX_CHARS.VERTICAL : BOX_CHARS.HORIZONTAL,
    }));
  }

  points.push({ x: left, y: top, char: BOX_CHARS.TOP_LEFT });
  points.push({ x: right, y: top, char: BOX_CHARS.TOP_RIGHT });
  points.push({ x: left, y: bottom, char: BOX_CHARS.BOTTOM_LEFT });
  points.push({ x: right, y: bottom, char: BOX_CHARS.BOTTOM_RIGHT });

  for (let x = left + 1; x < right; x++) {
    points.push({ x, y: top, char: BOX_CHARS.HORIZONTAL });
    points.push({ x, y: bottom, char: BOX_CHARS.HORIZONTAL });
  }

  for (let y = top + 1; y < bottom; y++) {
    points.push({ x: left, y, char: BOX_CHARS.VERTICAL });
    points.push({ x: right, y, char: BOX_CHARS.VERTICAL });
  }

  return points;
}
