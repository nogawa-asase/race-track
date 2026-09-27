import { buildPath, edgeDirection } from './buildPath';
import type { CourseShape } from './distance';
import type { CourseDefinition } from './types';

/**
 * コース定義から、内外判定に必要な形(パスと端の切り落とし)を作る。
 * 定義は validateCourseDefinition で検証済みであること
 */
export function buildShape(definition: CourseDefinition): CourseShape {
  const c = definition.centerline;
  const last = c.length - 1;
  const startDir = edgeDirection(c[0], c[1]);
  return {
    path: buildPath(c, definition.filletRadius),
    halfWidth: definition.halfWidth,
    // スタート側は、最初の辺と逆向き(スタートラインの後ろ)を切り落とす
    startCap: { center: c[0], outward: { x: -startDir.x, y: -startDir.y } },
    // ゴール側は、最後の辺の向き(ゴールラインの先)を切り落とす
    goalCap: { center: c[last], outward: edgeDirection(c[last - 1], c[last]) },
  };
}
