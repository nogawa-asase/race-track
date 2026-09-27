import type { Point, Vec } from '../types';
import { add, cross, dot, normalize, scale, sub } from '../vec';
import { EPSILON } from './constants';
import type { ArcElement, PathElement } from './types';

/** 中心線の角(両端を除く頂点)ごとの丸め方 */
export interface Corner {
  /** 角の頂点の番号(centerline の添字) */
  readonly index: number;
  /** 曲がる角度(ラジアン、0〜π) */
  readonly angle: number;
  /** 円弧が辺を使う長さ(角の前後それぞれ) */
  readonly tangentLength: number;
  /** 円弧。まっすぐな頂点では null */
  readonly arc: ArcElement | null;
  /** 円弧の始点と終点。まっすぐな頂点では頂点そのもの */
  readonly arcStart: Point;
  readonly arcEnd: Point;
}

/** 辺の向き(単位ベクトル)。長さ0の辺は渡さない */
export function edgeDirection(from: Vec, to: Vec): Point {
  return normalize(sub(to, from));
}

/**
 * 中心線の角ごとに、半径 radius の円弧(フィレット)を求める。
 * 折り返し(曲がる角度が π)の頂点は渡さない(validateCourseDefinition で除く)
 */
export function computeCorners(
  centerline: readonly Vec[],
  radius: number
): Corner[] {
  const corners: Corner[] = [];
  for (let i = 1; i < centerline.length - 1; i++) {
    const vertex = centerline[i];
    const d1 = edgeDirection(centerline[i - 1], vertex);
    const d2 = edgeDirection(vertex, centerline[i + 1]);
    const turn = cross(d1, d2);
    const angle = Math.acos(Math.max(-1, Math.min(1, dot(d1, d2))));

    if (angle < EPSILON) {
      corners.push({
        index: i,
        angle: 0,
        tangentLength: 0,
        arc: null,
        arcStart: vertex,
        arcEnd: vertex,
      });
      continue;
    }

    const tangentLength = radius * Math.tan(angle / 2);
    const arcStart = sub(vertex, scale(d1, tangentLength));
    const arcEnd = add(vertex, scale(d2, tangentLength));
    // 曲がる側への法線。円の中心は、円弧の始点からこの向きに半径だけ進んだ点
    const side = Math.sign(turn);
    const normal = { x: -d1.y * side, y: d1.x * side };
    const center = add(arcStart, scale(normal, radius));
    const startAngle = Math.atan2(arcStart.y - center.y, arcStart.x - center.x);

    corners.push({
      index: i,
      angle,
      tangentLength,
      arc: { kind: 'arc', center, radius, startAngle, sweep: side * angle },
      arcStart,
      arcEnd,
    });
  }
  return corners;
}

/**
 * 中心線の折れ線の角を丸めて、直線と円弧の列(パス)を作る。
 * 定義は validateCourseDefinition で検証済みであること
 */
export function buildPath(
  centerline: readonly Vec[],
  radius: number
): PathElement[] {
  const corners = computeCorners(centerline, radius);
  const path: PathElement[] = [];
  let lineStart: Point = centerline[0];

  for (const corner of corners) {
    pushLine(path, lineStart, corner.arcStart);
    if (corner.arc) {
      path.push(corner.arc);
    }
    lineStart = corner.arcEnd;
  }
  pushLine(path, lineStart, centerline[centerline.length - 1]);
  return path;
}

function pushLine(path: PathElement[], from: Point, to: Point): void {
  // 円弧が辺をちょうど使い切ると、長さ0の直線になるので入れない
  if (Math.hypot(to.x - from.x, to.y - from.y) > EPSILON) {
    path.push({ kind: 'line', from, to });
  }
}
