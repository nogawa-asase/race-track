import type { Point } from '../types';
import { dot, lerp, sub } from '../vec';
import { EPSILON, MIN_SEGMENT_LENGTH } from './constants';
import type { CourseShape, EndCap } from './distance';
import { distanceToPath, isInsideShape } from './distance';

/**
 * 線分全体がコースの内側か。
 *
 * 点からパスまでの距離は、点を動かした長さ以上には変わらない。
 * 長さ L の線分上で、端 a から s、端 b から L - s の位置の点の距離は
 * min(da + s, db + L - s) 以下なので、線分全体で「(da + db + L) / 2」を超えない。
 * これで内側と確定できない部分だけを二分割して調べる。
 * 分割した線分が MIN_SEGMENT_LENGTH 以下になったら内側とみなすので、
 * はみ出しを見逃す量は最大 MIN_SEGMENT_LENGTH / 2(architecture.md「線分の内外判定の実装」)
 */
export function isSegmentInsideShape(
  a: Point,
  b: Point,
  shape: CourseShape
): boolean {
  const da = distanceToPath(a, shape.path);
  const db = distanceToPath(b, shape.path);
  if (!isInsideShape(a, shape, da) || !isInsideShape(b, shape, db)) {
    return false;
  }
  if (
    crossesEndCap(a, b, shape.startCap, shape.halfWidth) ||
    crossesEndCap(a, b, shape.goalCap, shape.halfWidth)
  ) {
    return false;
  }
  const length = Math.hypot(b.x - a.x, b.y - a.y);
  return isSpanInside(a, da, b, db, length, shape);
}

function isSpanInside(
  a: Point,
  da: number,
  b: Point,
  db: number,
  length: number,
  shape: CourseShape
): boolean {
  const limit = shape.halfWidth + EPSILON;
  if ((da + db + length) / 2 <= limit) {
    return true;
  }
  if (length <= MIN_SEGMENT_LENGTH) {
    return true;
  }
  const m = lerp(a, b, 0.5);
  const dm = distanceToPath(m, shape.path);
  if (dm > limit) {
    return false;
  }
  const half = length / 2;
  return (
    isSpanInside(a, da, m, dm, half, shape) &&
    isSpanInside(m, dm, b, db, half, shape)
  );
}

/**
 * 線分が端の切り落とし部分(半円)を通るか。
 * 線分のうち切り落とす側にある部分を取り出し、半円の中心との距離を調べる
 */
function crossesEndCap(
  a: Point,
  b: Point,
  cap: EndCap,
  halfWidth: number
): boolean {
  const sa = dot(sub(a, cap.center), cap.outward);
  const sb = dot(sub(b, cap.center), cap.outward);
  if (sa <= EPSILON && sb <= EPSILON) {
    return false;
  }
  // 切り落とす側(s > EPSILON)にある部分の、線分上の範囲 [t0, t1]
  let t0 = 0;
  let t1 = 1;
  if (sa <= EPSILON) {
    t0 = (EPSILON - sa) / (sb - sa);
  } else if (sb <= EPSILON) {
    t1 = (EPSILON - sa) / (sb - sa);
  }
  const p0 = lerp(a, b, t0);
  const p1 = lerp(a, b, t1);
  return distanceToSegment(cap.center, p0, p1) <= halfWidth + EPSILON;
}

function distanceToSegment(p: Point, a: Point, b: Point): number {
  const ab = sub(b, a);
  const lenSq = dot(ab, ab);
  const t =
    lenSq === 0 ? 0 : Math.max(0, Math.min(1, dot(sub(p, a), ab) / lenSq));
  const q = lerp(a, b, t);
  return Math.hypot(p.x - q.x, p.y - q.y);
}
