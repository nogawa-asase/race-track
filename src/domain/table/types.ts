import type { Vec } from '../types';

/**
 * コースごとの最短手数の表。get(position, velocity) は、その状態から
 * 手番を始めたときのゴールまでの最短手数。ゴールできなければ null(「なし」)
 */
export interface DistanceTable {
  get(position: Vec, velocity: Vec): number | null;
}
