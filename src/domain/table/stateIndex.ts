import type { Course } from '../course/types';
import type { Vec } from '../types';
import type { SpeedRange } from './speedRange';
import { speedRange } from './speedRange';

/** 表の状態(位置×速度)の次元 */
export interface TableDims {
  readonly boardSize: Vec;
  readonly speed: SpeedRange;
}

export function tableDims(course: Course): TableDims {
  return {
    boardSize: course.definition.boardSize,
    speed: speedRange(course.definition.boardSize),
  };
}

/** 状態の総数(= バイナリのバイト数) */
export function stateCount(dims: TableDims): number {
  const { boardSize, speed } = dims;
  return (
    boardSize.x * boardSize.y * (2 * speed.vxMax + 1) * (2 * speed.vyMax + 1)
  );
}

/** 状態(位置 p、速度 v)を添字に変換する。範囲外なら null */
export function stateIndex(dims: TableDims, p: Vec, v: Vec): number | null {
  const { boardSize, speed } = dims;
  if (
    p.x < 0 ||
    p.x >= boardSize.x ||
    p.y < 0 ||
    p.y >= boardSize.y ||
    Math.abs(v.x) > speed.vxMax ||
    Math.abs(v.y) > speed.vyMax
  ) {
    return null;
  }
  const widthX = 2 * speed.vxMax + 1;
  const widthY = 2 * speed.vyMax + 1;
  const vxIndex = v.x + speed.vxMax;
  const vyIndex = v.y + speed.vyMax;
  return ((p.x * boardSize.y + p.y) * widthX + vxIndex) * widthY + vyIndex;
}
