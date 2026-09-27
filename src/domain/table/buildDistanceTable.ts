import { distanceToSegment } from '../course/segmentInside';
import type { Course } from '../course/types';
import { ACCELS_IN_ORDER } from '../rules/classify';
import type { Vec } from '../types';
import { add, sub } from '../vec';
import type { TableDims } from './stateIndex';
import { stateCount, stateIndex, tableDims } from './stateIndex';
import type { DistanceTable } from './types';

/** バイト表現での「なし」 */
export const NONE_BYTE = 255;

interface State {
  readonly p: Vec;
  readonly v: Vec;
}

/**
 * すべての状態(位置・速度)について、ゴールまでの最短手数を求める
 * (後ろ向き幅優先探索。機能設計書「アルゴリズム設計 > 4」)。
 *
 * ルールの判定(候補の分類。domain/rules/classify)と同じ Course の判定を使い、
 * CPUの判断と画面の判定がずれないようにする。相手の車は考えない(occupied は常に空)
 */
export function buildDistanceTable(course: Course): DistanceTable {
  const dims = tableDims(course);
  const bytes = new Uint8Array(stateCount(dims)).fill(NONE_BYTE);
  const queue: State[] = [];

  // 1手で動ける最大の距離(各成分 速度の上限+1)。これより遠い点からは、
  // どの状態からも1手でゴールラインに届かない
  const maxReach = Math.hypot(dims.speed.vxMax + 1, dims.speed.vyMax + 1);

  // ステップ1: 1手でゴールできる状態を集める。
  // コースの外の点は、どの速度でも状態として現れない(ステップ2の isInside(prevP)
  // の条件と合わせる)ので、p がコースの内側のときだけ調べる
  for (let x = 0; x < dims.boardSize.x; x++) {
    for (let y = 0; y < dims.boardSize.y; y++) {
      const p = { x, y };
      if (!course.isInside(p)) {
        continue;
      }
      const goalDeltas =
        distanceToSegment(p, course.goalLine.from, course.goalLine.to) <=
        maxReach
          ? goalReachableDeltas(p, course, dims.speed)
          : EMPTY_DELTAS;
      for (let vx = -dims.speed.vxMax; vx <= dims.speed.vxMax; vx++) {
        for (let vy = -dims.speed.vyMax; vy <= dims.speed.vyMax; vy++) {
          const reachesGoal = ACCELS_IN_ORDER.some((a) =>
            goalDeltas.has(deltaKey(vx + a.x, vy + a.y))
          );
          if (reachesGoal) {
            setDistance(bytes, dims, p, { x: vx, y: vy }, 1, queue);
          }
        }
      }
    }
  }

  // ステップ2: 逆向きの幅優先探索。
  // 前の位置 prevP = p - v と、線分 prevP→p の内外判定は、加速 a によらず
  // 同じ値になる(9通りの加速で変わるのは前の速度 prevV = v - a だけ)ので、
  // 加速のループの外で1回だけ計算する
  let head = 0;
  while (head < queue.length) {
    const { p, v } = queue[head++];
    const d = getDistance(bytes, dims, p, v)!;
    const prevP = sub(p, v);
    if (!course.isInside(prevP) || !course.isSegmentInside(prevP, p)) {
      continue;
    }
    for (const a of ACCELS_IN_ORDER) {
      const prevV = sub(v, a);
      if (
        Math.abs(prevV.x) > dims.speed.vxMax ||
        Math.abs(prevV.y) > dims.speed.vyMax
      ) {
        continue;
      }
      if (getDistance(bytes, dims, prevP, prevV) !== null) {
        continue;
      }
      setDistance(bytes, dims, prevP, prevV, d + 1, queue);
    }
  }

  return tableFromBytes(course, bytes);
}

const EMPTY_DELTAS: ReadonlySet<string> = new Set();

function deltaKey(dx: number, dy: number): string {
  return `${dx},${dy}`;
}

/**
 * 位置 p から、加速9通り分の余裕(各成分 ±(速度の上限+1))を持たせた
 * すべての移動量 delta のうち、ゴールに届くものを求める。
 *
 * 同じ delta = v + a になる (v, a) の組はいくつもあるが、ゴールに届くかどうかは
 * from と target(= from + delta)だけで決まり、v と a に分ける前の delta が
 * 同じなら結果も同じになる。そのため delta ごとに1回だけ判定して使い回すことで、
 * 状態(225通りの速度)ごとに9回ずつ判定する(2025回)代わりに、
 * 高々 (2 × (速度の上限 + 1) + 1)^2 回の判定で済ませる。
 *
 * ここではゴールに届くかどうかだけを知りたいので、9候補の分類(classifyMove)の
 * うち、はみ出し・相手がいるの判定は行わず、course.goalCrossing を直接呼ぶ
 */
function goalReachableDeltas(
  p: Vec,
  course: Course,
  speed: { vxMax: number; vyMax: number }
): ReadonlySet<string> {
  const result = new Set<string>();
  for (let dx = -speed.vxMax - 1; dx <= speed.vxMax + 1; dx++) {
    for (let dy = -speed.vyMax - 1; dy <= speed.vyMax + 1; dy++) {
      const target = add(p, { x: dx, y: dy });
      if (course.goalCrossing(p, target)) {
        result.add(deltaKey(dx, dy));
      }
    }
  }
  return result;
}

function setDistance(
  bytes: Uint8Array,
  dims: TableDims,
  p: Vec,
  v: Vec,
  distance: number,
  queue: State[]
): void {
  const i = stateIndex(dims, p, v);
  if (i === null) {
    return;
  }
  bytes[i] = distance;
  queue.push({ p, v });
}

function getDistance(
  bytes: Uint8Array,
  dims: TableDims,
  p: Vec,
  v: Vec
): number | null {
  const i = stateIndex(dims, p, v);
  if (i === null) {
    return null;
  }
  const value = bytes[i];
  return value === NONE_BYTE ? null : value;
}

/** バイト配列(1状態1バイト、NONE_BYTE が「なし」)を DistanceTable にする */
export function tableFromBytes(
  course: Course,
  bytes: Uint8Array
): DistanceTable {
  const dims = tableDims(course);
  return {
    get: (p, v) => getDistance(bytes, dims, p, v),
  };
}
