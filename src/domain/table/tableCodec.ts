import type { Course } from '../course/types';
import type { Vec } from '../types';
import { NONE_BYTE } from './buildDistanceTable';
import { stateCount, stateIndex, tableDims } from './stateIndex';
import type { DistanceTable } from './types';

/**
 * 表をバイナリ(1状態1バイト、NONE_BYTE が「なし」)にする。
 * buildDistanceTable が返す表でも、テスト用に手で作った表でも使える
 */
export function encodeDistanceTable(
  course: Course,
  table: DistanceTable
): Uint8Array {
  const dims = tableDims(course);
  const bytes = new Uint8Array(stateCount(dims));
  const { boardSize, speed } = dims;

  for (let x = 0; x < boardSize.x; x++) {
    for (let y = 0; y < boardSize.y; y++) {
      for (let vx = -speed.vxMax; vx <= speed.vxMax; vx++) {
        for (let vy = -speed.vyMax; vy <= speed.vyMax; vy++) {
          const p: Vec = { x, y };
          const v: Vec = { x: vx, y: vy };
          const i = stateIndex(dims, p, v)!;
          const value = table.get(p, v);
          bytes[i] = value === null ? NONE_BYTE : value;
        }
      }
    }
  }
  return bytes;
}

/**
 * バイナリを表にする。サイズがコースの盤の大きさ・速度の範囲から計算した
 * サイズと一致しなければ Error を投げる(architecture.md「入力の検証」)
 */
export function decodeDistanceTable(
  course: Course,
  bytes: Uint8Array
): DistanceTable {
  const dims = tableDims(course);
  const expected = stateCount(dims);
  if (bytes.length !== expected) {
    throw new Error(
      `表のサイズが一致しません(${course.definition.id}: 期待 ${expected}バイト、実際 ${bytes.length}バイト)`
    );
  }
  return {
    get(p, v) {
      const i = stateIndex(dims, p, v);
      if (i === null) {
        return null;
      }
      const value = bytes[i];
      return value === NONE_BYTE ? null : value;
    },
  };
}
