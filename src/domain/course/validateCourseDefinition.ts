import { CourseDefinitionError } from '../errors';
import type { Point, Vec } from '../types';
import { dot, distance } from '../vec';
import { buildPath, computeCorners, edgeDirection } from './buildPath';
import { EPSILON } from './constants';
import { pathLength, pointAlongPath } from './pathSampling';
import type { CourseDefinition } from './types';

/** 盤からのはみ出しを調べるときの、パスをたどる間隔(目盛り) */
const BOARD_CHECK_STEP = 0.1;

/**
 * コース定義が機能設計書の制約を満たすかを確かめる。
 * 満たさなければ CourseDefinitionError を投げる
 */
export function validateCourseDefinition(definition: CourseDefinition): void {
  const { id, centerline, filletRadius, halfWidth } = definition;
  const fail = (reason: string): never => {
    throw new CourseDefinitionError(id, reason);
  };

  if (centerline.length < 2) {
    fail('中心線の頂点が2つ未満です');
  }
  if (
    !centerline.every((p) => Number.isInteger(p.x) && Number.isInteger(p.y))
  ) {
    fail('中心線の頂点が整数ではありません');
  }
  if (!(halfWidth > 0)) {
    fail('halfWidth は正の数にしてください');
  }
  if (filletRadius < halfWidth) {
    fail('filletRadius は halfWidth 以上にしてください');
  }
  for (let i = 0; i < centerline.length - 1; i++) {
    if (distance(centerline[i], centerline[i + 1]) === 0) {
      fail(`${i}番目の辺の長さが0です`);
    }
  }
  if (!isAxisAligned(centerline[0], centerline[1])) {
    fail('最初の辺が軸に平行ではありません');
  }
  const last = centerline.length - 1;
  if (!isAxisAligned(centerline[last - 1], centerline[last])) {
    fail('最後の辺が軸に平行ではありません');
  }
  for (let i = 1; i < last; i++) {
    const d1 = edgeDirection(centerline[i - 1], centerline[i]);
    const d2 = edgeDirection(centerline[i], centerline[i + 1]);
    if (dot(d1, d2) <= -1 + EPSILON) {
      fail(`${i}番目の頂点で折り返しています`);
    }
  }

  checkFilletsFit(definition, fail);
  checkInsideBoard(definition, fail);
}

function isAxisAligned(a: Vec, b: Vec): boolean {
  return a.x === b.x || a.y === b.y;
}

/** 各辺で、両端の角の円弧が使う長さの合計が、辺の長さ以下か */
function checkFilletsFit(
  { centerline, filletRadius }: CourseDefinition,
  fail: (reason: string) => never
): void {
  const tangentAt = new Map(
    computeCorners(centerline, filletRadius).map((c) => [
      c.index,
      c.tangentLength,
    ])
  );
  for (let i = 0; i < centerline.length - 1; i++) {
    const used = (tangentAt.get(i) ?? 0) + (tangentAt.get(i + 1) ?? 0);
    if (used > distance(centerline[i], centerline[i + 1]) + EPSILON) {
      fail(`${i}番目の辺が短すぎて、角の円弧が収まりません`);
    }
  }
}

/** 道幅を含めたコースが、盤(0〜boardSize-1)に収まるか */
function checkInsideBoard(
  definition: CourseDefinition,
  fail: (reason: string) => never
): void {
  const { boardSize, halfWidth } = definition;
  const maxX = boardSize.x - 1;
  const maxY = boardSize.y - 1;
  const fits = (p: Point) =>
    p.x - halfWidth >= -EPSILON &&
    p.y - halfWidth >= -EPSILON &&
    p.x + halfWidth <= maxX + EPSILON &&
    p.y + halfWidth <= maxY + EPSILON;

  const path = buildPath(definition.centerline, definition.filletRadius);
  const total = pathLength(path);
  const steps = Math.ceil(total / BOARD_CHECK_STEP);
  for (let i = 0; i <= steps; i++) {
    if (!fits(pointAlongPath(path, (total * i) / steps))) {
      fail('コースが盤からはみ出しています');
    }
  }
}
