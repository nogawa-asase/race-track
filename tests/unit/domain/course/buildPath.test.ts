import { buildPath } from '../../../../src/domain/course/buildPath';
import type {
  ArcElement,
  LineElement,
} from '../../../../src/domain/course/types';
import { lCourse, straightCourse } from '../../fixtures/courses';

describe('buildPath', () => {
  it('角のない中心線は、1本の直線になる', () => {
    // When
    const path = buildPath(
      straightCourse.centerline,
      straightCourse.filletRadius
    );

    // Then
    expect(path).toEqual([
      { kind: 'line', from: { x: 2, y: 5 }, to: { x: 20, y: 5 } },
    ]);
  });

  it('直角の角は、辺に接する円弧で丸められる', () => {
    // Given: 右へ進んでから下へ曲がる(画面上で時計回り)。半径3
    // When
    const path = buildPath(lCourse.centerline, lCourse.filletRadius);

    // Then: 直線 → 円弧 → 直線
    expect(path.map((e) => e.kind)).toEqual(['line', 'arc', 'line']);
    const [first, arc, last] = path as [LineElement, ArcElement, LineElement];
    expect(first.to.x).toBeCloseTo(12);
    expect(first.to.y).toBeCloseTo(5);
    expect(arc.center.x).toBeCloseTo(12);
    expect(arc.center.y).toBeCloseTo(8);
    expect(arc.radius).toBe(3);
    // 始点 (12,5) は中心の真上(y が小さい側)なので -90°
    expect(arc.startAngle).toBeCloseTo(-Math.PI / 2);
    // y が下向きの座標で時計回りなので、正の向きに 90°
    expect(arc.sweep).toBeCloseTo(Math.PI / 2);
    expect(last.from.x).toBeCloseTo(15);
    expect(last.from.y).toBeCloseTo(8);
    expect(last.to).toEqual({ x: 15, y: 20 });
  });

  it('反時計回りの角では、円弧の向きが負になる', () => {
    // Given: 右へ進んでから上へ曲がる
    const centerline = [
      { x: 2, y: 20 },
      { x: 15, y: 20 },
      { x: 15, y: 5 },
    ];

    // When
    const path = buildPath(centerline, 3);

    // Then
    const arc = path[1] as ArcElement;
    expect(arc.center.x).toBeCloseTo(12);
    expect(arc.center.y).toBeCloseTo(17);
    expect(arc.sweep).toBeCloseTo(-Math.PI / 2);
  });

  it('まっすぐに並んだ頂点には、円弧を入れない', () => {
    // Given
    const centerline = [
      { x: 2, y: 5 },
      { x: 10, y: 5 },
      { x: 20, y: 5 },
    ];

    // When
    const path = buildPath(centerline, 3);

    // Then
    expect(path.map((e) => e.kind)).toEqual(['line', 'line']);
  });
});
