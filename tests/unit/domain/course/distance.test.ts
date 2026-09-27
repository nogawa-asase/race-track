import {
  distanceToPath,
  isInsideShape,
} from '../../../../src/domain/course/distance';
import { buildShape } from '../../../../src/domain/course/shape';
import { lCourse, straightCourse } from '../../fixtures/courses';

describe('distanceToPath', () => {
  it('直線からの距離は、垂線の長さになる', () => {
    // Given
    const { path } = buildShape(straightCourse);

    // Then
    expect(distanceToPath({ x: 10, y: 5 }, path)).toBeCloseTo(0);
    expect(distanceToPath({ x: 10, y: 8 }, path)).toBeCloseTo(3);
  });

  it('端より外の点は、端までの距離になる', () => {
    // Given
    const { path } = buildShape(straightCourse);

    // Then: (2,5) から左に3
    expect(distanceToPath({ x: -1, y: 5 }, path)).toBeCloseTo(3);
  });

  it('円弧からの距離は、中心からの距離と半径の差になる', () => {
    // Given: L字の角は中心 (12,8)、半径3
    const { path } = buildShape(lCourse);

    // Then: 中心から右上45°に 1.5√2 ≒ 2.12 離れた点
    expect(distanceToPath({ x: 13.5, y: 6.5 }, path)).toBeCloseTo(
      3 - 1.5 * Math.SQRT2
    );
    // 中心そのものは、どの向きにも半径3
    expect(distanceToPath({ x: 12, y: 8 }, path)).toBeCloseTo(3);
  });
});

describe('isInsideShape', () => {
  const straight = buildShape(straightCourse);
  const l = buildShape(lCourse);

  it('道の中は内側', () => {
    expect(isInsideShape({ x: 10, y: 5 }, straight)).toBe(true);
    expect(isInsideShape({ x: 15, y: 15 }, l)).toBe(true);
  });

  it('縁の上は内側、縁のすぐ外は外側', () => {
    // Given: 直線コースの道は y が 3〜7
    // Then
    expect(isInsideShape({ x: 10, y: 3 }, straight)).toBe(true);
    expect(isInsideShape({ x: 10, y: 7 }, straight)).toBe(true);
    expect(isInsideShape({ x: 10, y: 7.01 }, straight)).toBe(false);
    expect(isInsideShape({ x: 10, y: 2.99 }, straight)).toBe(false);
  });

  it('スタートライン・ゴールラインの上は内側、その後ろ・先は外側', () => {
    // Given: スタートラインは x=2、ゴールラインは x=20
    // Then
    expect(isInsideShape({ x: 2, y: 3 }, straight)).toBe(true);
    expect(isInsideShape({ x: 20, y: 7 }, straight)).toBe(true);
    expect(isInsideShape({ x: 1.9, y: 5 }, straight)).toBe(false);
    expect(isInsideShape({ x: 20.1, y: 5 }, straight)).toBe(false);
  });

  it('カーブの外側の角は芝になる', () => {
    // Given: 角の円弧の外側の縁は、中心 (12,8) から半径5の円
    // Then: 中心から約6.36離れた点
    expect(isInsideShape({ x: 16.5, y: 3.5 }, l)).toBe(false);
    // 半径5ちょうど(右上45°)は縁の上
    const r = 5 / Math.SQRT2;
    expect(isInsideShape({ x: 12 + r, y: 8 - r }, l)).toBe(true);
  });

  it('カーブの内側の角は芝になる', () => {
    // Given: 内側の縁は、中心 (12,8) から半径1の円
    // Then
    expect(isInsideShape({ x: 12, y: 8 }, l)).toBe(false);
    expect(isInsideShape({ x: 12.5, y: 7.5 }, l)).toBe(false);
    expect(isInsideShape({ x: 13, y: 7 }, l)).toBe(true);
    // 横の道の下(y>7)で、縦の道の左(x<13)は芝
    expect(isInsideShape({ x: 11, y: 9 }, l)).toBe(false);
  });
});
