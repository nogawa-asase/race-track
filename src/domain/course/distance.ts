import type { Point } from '../types';
import { distance, dot, sub } from '../vec';
import { EPSILON } from './constants';
import type { ArcElement, LineElement, PathElement } from './types';

const TWO_PI = Math.PI * 2;

/**
 * コースの端の切り落とし部分。中心 center・半径 halfWidth の円のうち、
 * outward の向きの半分(スタートラインの後ろ、ゴールラインの先)
 */
export interface EndCap {
  readonly center: Point;
  /** 切り落とす側への向き(単位ベクトル) */
  readonly outward: Point;
}

/** 内外判定に必要なコースの形 */
export interface CourseShape {
  readonly path: readonly PathElement[];
  readonly halfWidth: number;
  readonly startCap: EndCap;
  readonly goalCap: EndCap;
}

function distanceToLine(p: Point, line: LineElement): number {
  const dir = sub(line.to, line.from);
  const lenSq = dot(dir, dir);
  const t = Math.max(0, Math.min(1, dot(sub(p, line.from), dir) / lenSq));
  return Math.hypot(
    line.from.x + dir.x * t - p.x,
    line.from.y + dir.y * t - p.y
  );
}

/** 点の中心からの角度が、円弧の角度の範囲に入るか(両端を含む) */
function isWithinArcAngle(p: Point, arc: ArcElement): boolean {
  const angle = Math.atan2(p.y - arc.center.y, p.x - arc.center.x);
  // 円弧の回る向きにそろえて、始点からの角度を 0〜2π に直す
  let rel = (angle - arc.startAngle) * Math.sign(arc.sweep);
  rel = ((rel % TWO_PI) + TWO_PI) % TWO_PI;
  if (rel > TWO_PI - EPSILON) {
    rel = 0;
  }
  return rel <= Math.abs(arc.sweep) + EPSILON;
}

function arcEndPoint(arc: ArcElement, angle: number): Point {
  return {
    x: arc.center.x + arc.radius * Math.cos(angle),
    y: arc.center.y + arc.radius * Math.sin(angle),
  };
}

function distanceToArc(p: Point, arc: ArcElement): number {
  const fromCenter = distance(p, arc.center);
  // 中心はどの角度からも半径の距離にある
  if (fromCenter < EPSILON || isWithinArcAngle(p, arc)) {
    return Math.abs(fromCenter - arc.radius);
  }
  return Math.min(
    distance(p, arcEndPoint(arc, arc.startAngle)),
    distance(p, arcEndPoint(arc, arc.startAngle + arc.sweep))
  );
}

/** 点からパスの要素までの距離 */
export function distanceToElement(p: Point, element: PathElement): number {
  return element.kind === 'line'
    ? distanceToLine(p, element)
    : distanceToArc(p, element);
}

/**
 * 点からパスまでの距離。点を1目盛り動かしても、距離は最大1目盛りしか変わらない
 * (線分の内外判定の「距離による省略」はこの性質を使う)
 */
export function distanceToPath(p: Point, path: readonly PathElement[]): number {
  let min = Infinity;
  for (const element of path) {
    const d = distanceToElement(p, element);
    if (d < min) {
      min = d;
    }
  }
  return min;
}

/** 点が端の切り落とし部分に入るか(切り落とす線そのものの上は入らない) */
export function isInEndCap(p: Point, cap: EndCap, halfWidth: number): boolean {
  const rel = sub(p, cap.center);
  return (
    dot(rel, cap.outward) > EPSILON &&
    Math.hypot(rel.x, rel.y) <= halfWidth + EPSILON
  );
}

/** 点がコースの内側か(縁の上は内側)。距離 d を計算済みなら渡せる */
export function isInsideShape(
  p: Point,
  shape: CourseShape,
  d: number = distanceToPath(p, shape.path)
): boolean {
  return (
    d <= shape.halfWidth + EPSILON &&
    !isInEndCap(p, shape.startCap, shape.halfWidth) &&
    !isInEndCap(p, shape.goalCap, shape.halfWidth)
  );
}
