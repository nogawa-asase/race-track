import type { Point } from '../types';
import { distance, lerp } from '../vec';
import type { PathElement } from './types';

/** パスの要素の長さ */
export function elementLength(element: PathElement): number {
  return element.kind === 'line'
    ? distance(element.from, element.to)
    : element.radius * Math.abs(element.sweep);
}

/** パス全体の長さ */
export function pathLength(path: readonly PathElement[]): number {
  return path.reduce((sum, e) => sum + elementLength(e), 0);
}

/** 要素の上の、始点から長さ s(0〜要素の長さ)の位置の点 */
export function pointOnElement(element: PathElement, s: number): Point {
  const len = elementLength(element);
  const t = len === 0 ? 0 : s / len;
  if (element.kind === 'line') {
    return lerp(element.from, element.to, t);
  }
  const angle = element.startAngle + element.sweep * t;
  return {
    x: element.center.x + element.radius * Math.cos(angle),
    y: element.center.y + element.radius * Math.sin(angle),
  };
}

/** パスの始点から長さ s の位置の点。s はパス全体の長さまでに丸める */
export function pointAlongPath(path: readonly PathElement[], s: number): Point {
  let rest = Math.max(0, s);
  for (const element of path) {
    const len = elementLength(element);
    if (rest <= len) {
      return pointOnElement(element, rest);
    }
    rest -= len;
  }
  const last = path[path.length - 1];
  return pointOnElement(last, elementLength(last));
}
