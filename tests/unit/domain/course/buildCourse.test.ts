import { buildCourse } from '../../../../src/domain/course/buildCourse';
import type { CourseDefinition } from '../../../../src/domain/course/types';
import { CourseDefinitionError } from '../../../../src/domain/errors';
import { lCourse, straightCourse } from '../../fixtures/courses';

describe('buildCourse', () => {
  it('スタートラインとゴールラインは、端の頂点を中心に辺に直交する', () => {
    // When
    const course = buildCourse(lCourse);

    // Then: 最初の辺は右向きなのでスタートラインは縦、最後の辺は下向きなのでゴールラインは横
    const xs = [course.startLine.from.x, course.startLine.to.x];
    const ys = [course.startLine.from.y, course.startLine.to.y].sort();
    expect(xs.every((x) => Math.abs(x - 2) < 1e-9)).toBe(true);
    expect(ys[0]).toBeCloseTo(3);
    expect(ys[1]).toBeCloseTo(7);
    const gy = [course.goalLine.from.y, course.goalLine.to.y];
    const gx = [course.goalLine.from.x, course.goalLine.to.x].sort();
    expect(gy.every((y) => Math.abs(y - 20) < 1e-9)).toBe(true);
    expect(gx[0]).toBeCloseTo(13);
    expect(gx[1]).toBeCloseTo(17);
  });

  it('スタート位置は、スタートライン上の格子点(両端を含む)', () => {
    // When
    const course = buildCourse(straightCourse);

    // Then
    expect(course.startPoints).toEqual([
      { x: 2, y: 3 },
      { x: 2, y: 4 },
      { x: 2, y: 5 },
      { x: 2, y: 6 },
      { x: 2, y: 7 },
    ]);
  });

  it('半幅が整数でなければ、スタートラインの内側の格子点だけになる', () => {
    // When
    const course = buildCourse({ ...straightCourse, halfWidth: 1.5 });

    // Then
    expect(course.startPoints.map((p) => p.y)).toEqual([4, 5, 6]);
  });

  it('判定の関数は、組み立てたコースの形を使う', () => {
    // When
    const course = buildCourse(lCourse);

    // Then
    expect(course.isInside({ x: 15, y: 15 })).toBe(true);
    expect(course.isSegmentInside({ x: 10, y: 6 }, { x: 14, y: 10 })).toBe(
      false
    );
    expect(
      course.goalCrossing({ x: 15, y: 18 }, { x: 15, y: 22 })?.t
    ).toBeCloseTo(0.5);
  });

  describe('制約を満たさない定義は CourseDefinitionError', () => {
    const cases: [string, Partial<CourseDefinition>][] = [
      ['頂点が1つ', { centerline: [{ x: 2, y: 5 }] }],
      [
        '頂点が整数でない',
        {
          centerline: [
            { x: 2, y: 5 },
            { x: 20.5, y: 5 },
          ],
        },
      ],
      ['半幅が0', { halfWidth: 0 }],
      ['filletRadius が halfWidth より小さい', { filletRadius: 1 }],
      [
        '長さ0の辺',
        {
          centerline: [
            { x: 2, y: 5 },
            { x: 10, y: 5 },
            { x: 10, y: 5 },
            { x: 10, y: 20 },
          ],
        },
      ],
      [
        '最初の辺が斜め',
        {
          centerline: [
            { x: 2, y: 5 },
            { x: 10, y: 10 },
            { x: 10, y: 20 },
          ],
        },
      ],
      [
        '最後の辺が斜め',
        {
          centerline: [
            { x: 2, y: 5 },
            { x: 10, y: 5 },
            { x: 20, y: 15 },
          ],
        },
      ],
      [
        '折り返し',
        {
          centerline: [
            { x: 2, y: 5 },
            { x: 20, y: 5 },
            { x: 10, y: 5 },
          ],
        },
      ],
      [
        '角の円弧が辺に収まらない',
        {
          centerline: [
            { x: 2, y: 5 },
            { x: 15, y: 5 },
            { x: 15, y: 7 },
            { x: 25, y: 7 },
          ],
          filletRadius: 3,
        },
      ],
      [
        '盤からはみ出す',
        {
          centerline: [
            { x: 1, y: 5 },
            { x: 20, y: 5 },
          ],
        },
      ],
    ];

    it.each(cases)('%s', (_label, override) => {
      // Given
      const definition = { ...straightCourse, ...override };

      // When / Then
      expect(() => buildCourse(definition)).toThrow(CourseDefinitionError);
    });
  });
});
