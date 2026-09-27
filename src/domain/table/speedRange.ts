import type { Vec } from '../types';

/**
 * 盤の1辺の格子点の数から、その軸の速度の上限を求める。
 * 速度0から1目盛りずつしか加速できないので、速度 k に達するまでに
 * 同じ向きに 1 + 2 + … + k = k(k+1)/2 目盛り進む必要があり、盤の中に収まるのは
 * k(k+1)/2 <= extent - 1 までの k(architecture.md「盤の大きさと速度の範囲」)
 */
export function maxSpeedForExtent(extent: number): number {
  let k = 0;
  while (((k + 1) * (k + 2)) / 2 <= extent - 1) {
    k++;
  }
  return k;
}

export interface SpeedRange {
  readonly vxMax: number;
  readonly vyMax: number;
}

/** コースの盤の大きさから、各軸の速度の上限を求める */
export function speedRange(boardSize: Vec): SpeedRange {
  return {
    vxMax: maxSpeedForExtent(boardSize.x),
    vyMax: maxSpeedForExtent(boardSize.y),
  };
}
