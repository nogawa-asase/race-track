import type { Point } from '../types';
import { dot, lerp, sub } from '../vec';
import { EPSILON } from './constants';
import type { CourseShape } from './distance';
import { isSegmentInsideShape } from './segmentInside';
import type { GoalCrossing } from './types';

/**
 * 線分 a→b がゴールラインに到達・通過するか(機能設計書「ゴールラインの判定」)。
 *
 * - ゴールラインの手前から、ゴールライン上またはその先へ進む線分だけが対象(逆向きは除く)
 * - 交点がゴールラインの範囲内で、a から交点までがコースの内側ならゴール
 * - 交点から先は、コースの外に出てもよい
 */
export function findGoalCrossing(
  a: Point,
  b: Point,
  shape: CourseShape
): GoalCrossing | null {
  const { center, outward } = shape.goalCap;
  // ゴールラインからの符号付きの距離(先が正)
  const sa = dot(sub(a, center), outward);
  const sb = dot(sub(b, center), outward);
  if (!(sa < -EPSILON && sb >= -EPSILON)) {
    return null;
  }

  const t = sb <= EPSILON ? 1 : sa / (sa - sb);
  const point = t === 1 ? b : lerp(a, b, t);
  // ゴールラインに沿った向きの、中心からのずれ
  const along = { x: -outward.y, y: outward.x };
  if (Math.abs(dot(sub(point, center), along)) > shape.halfWidth + EPSILON) {
    return null;
  }
  if (!isSegmentInsideShape(a, point, shape)) {
    return null;
  }
  return { point, t };
}
