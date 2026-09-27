import type { Point, Segment, Vec } from '../types';
import { add, scale } from '../vec';
import { EPSILON } from './constants';
import type { EndCap } from './distance';
import { isInsideShape } from './distance';
import { findGoalCrossing } from './goalCrossing';
import { isSegmentInsideShape } from './segmentInside';
import { buildShape } from './shape';
import type { Course, CourseDefinition } from './types';
import { validateCourseDefinition } from './validateCourseDefinition';

/**
 * コース定義から、判定用のコースを組み立てる。
 * 定義が制約を満たさなければ CourseDefinitionError を投げる
 */
export function buildCourse(definition: CourseDefinition): Course {
  validateCourseDefinition(definition);
  const shape = buildShape(definition);
  const startLine = endLine(shape.startCap, definition.halfWidth);

  return {
    definition,
    path: shape.path,
    startLine,
    goalLine: endLine(shape.goalCap, definition.halfWidth),
    startPoints: latticePointsOn(startLine),
    isInside: (p) => isInsideShape(p, shape),
    isSegmentInside: (a, b) => isSegmentInsideShape(a, b, shape),
    goalCrossing: (a, b) => findGoalCrossing(a, b, shape),
  };
}

/** 端の中心を通り、辺に直交する長さ halfWidth × 2 の線分(スタートライン・ゴールライン) */
function endLine(cap: EndCap, halfWidth: number): Segment {
  const along: Point = { x: -cap.outward.y, y: cap.outward.x };
  return {
    from: add(cap.center, scale(along, -halfWidth)),
    to: add(cap.center, scale(along, halfWidth)),
  };
}

/**
 * 軸に平行な線分の上の格子点(両端を含む)。
 * スタートラインは最初の辺(軸に平行)に直交するので、軸に平行になる
 */
function latticePointsOn(line: Segment): Vec[] {
  const minX = Math.ceil(Math.min(line.from.x, line.to.x) - EPSILON);
  const maxX = Math.floor(Math.max(line.from.x, line.to.x) + EPSILON);
  const minY = Math.ceil(Math.min(line.from.y, line.to.y) - EPSILON);
  const maxY = Math.floor(Math.max(line.from.y, line.to.y) + EPSILON);
  const points: Vec[] = [];
  for (let x = minX; x <= maxX; x++) {
    for (let y = minY; y <= maxY; y++) {
      points.push({ x, y });
    }
  }
  return points;
}
