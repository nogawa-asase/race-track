import type { Point } from './types';

export function add(a: Point, b: Point): Point {
  return { x: a.x + b.x, y: a.y + b.y };
}

export function sub(a: Point, b: Point): Point {
  return { x: a.x - b.x, y: a.y - b.y };
}

export function scale(a: Point, k: number): Point {
  return { x: a.x * k, y: a.y * k };
}

export function dot(a: Point, b: Point): number {
  return a.x * b.x + a.y * b.y;
}

/** 2次元の外積(z成分)。y が下向きなので、正は画面上で時計回り */
export function cross(a: Point, b: Point): number {
  return a.x * b.y - a.y * b.x;
}

export function length(a: Point): number {
  return Math.hypot(a.x, a.y);
}

export function distance(a: Point, b: Point): number {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

/** 長さ1にする。長さ0のベクトルは渡さない */
export function normalize(a: Point): Point {
  const len = length(a);
  return { x: a.x / len, y: a.y / len };
}

/** 線分 a→b 上の、t(0〜1)の位置の点 */
export function lerp(a: Point, b: Point, t: number): Point {
  return { x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t };
}

export function equals(a: Point, b: Point): boolean {
  return a.x === b.x && a.y === b.y;
}
