import { findGoalCrossing } from '../../../../src/domain/course/goalCrossing';
import { buildShape } from '../../../../src/domain/course/shape';
import { lCourse } from '../../fixtures/courses';

describe('findGoalCrossing', () => {
  // Given: L字コースのゴールラインは y=20、x が 13〜17。下向きに進むとゴール
  const l = buildShape(lCourse);

  it('ゴールラインを通過する線分はゴール', () => {
    // When
    const crossing = findGoalCrossing({ x: 15, y: 18 }, { x: 15, y: 22 }, l);

    // Then
    expect(crossing?.point.x).toBeCloseTo(15);
    expect(crossing?.point.y).toBeCloseTo(20);
    expect(crossing?.t).toBeCloseTo(0.5);
  });

  it('ゴールライン上にぴったり止まる線分はゴール(t = 1)', () => {
    // When
    const crossing = findGoalCrossing({ x: 15, y: 17 }, { x: 14, y: 20 }, l);

    // Then
    expect(crossing).toEqual({ point: { x: 14, y: 20 }, t: 1 });
  });

  it('ゴールラインの端を通過し、その先でコースの外に出る線分はゴール', () => {
    // Given: y=20 で x=17(ゴールラインの右端)を通り、(19,21) で止まる
    // When
    const crossing = findGoalCrossing({ x: 15, y: 19 }, { x: 19, y: 21 }, l);

    // Then
    expect(crossing?.point.x).toBeCloseTo(17);
    expect(crossing?.t).toBeCloseTo(0.5);
  });

  it('ゴールラインの延長線上(範囲の外)を通る線分はゴールではない', () => {
    // Given: y=20 で x≒18.67 を通る
    expect(findGoalCrossing({ x: 16, y: 18 }, { x: 20, y: 21 }, l)).toBeNull();
  });

  it('ゴールラインに届く前にコースからはみ出す線分はゴールではない', () => {
    // Given: 横の道から、角の内側の芝を横切ってゴールラインへ向かう
    expect(findGoalCrossing({ x: 4, y: 6 }, { x: 16, y: 21 }, l)).toBeNull();
  });

  it('ゴールラインを逆向きに横切る線分はゴールではない', () => {
    expect(findGoalCrossing({ x: 15, y: 21 }, { x: 15, y: 19 }, l)).toBeNull();
  });

  it('ゴールラインに届かない線分はゴールではない', () => {
    expect(findGoalCrossing({ x: 15, y: 10 }, { x: 15, y: 19 }, l)).toBeNull();
  });
});
