import { buildCourse } from '../../../../src/domain/course/buildCourse';
import { listCandidates } from '../../../../src/domain/rules/listCandidates';
import { lCourse, straightCourse } from '../../fixtures/courses';
import { racingState } from '../../fixtures/states';

describe('listCandidates', () => {
  const straight = buildCourse(straightCourse);
  const l = buildCourse(lCourse);

  it('9候補は慣性点を中心とした3×3で、左上から右下の順に並ぶ', () => {
    // Given: 位置 (5,5)、速度 (3,-1)。慣性点は (8,4)
    const state = racingState(
      { position: { x: 5, y: 5 }, velocity: { x: 3, y: -1 } },
      { position: { x: 2, y: 7 } }
    );

    // When
    const candidates = listCandidates(state, straight);

    // Then
    expect(candidates.map((c) => c.target)).toEqual([
      { x: 7, y: 3 },
      { x: 8, y: 3 },
      { x: 9, y: 3 },
      { x: 7, y: 4 },
      { x: 8, y: 4 },
      { x: 9, y: 4 },
      { x: 7, y: 5 },
      { x: 8, y: 5 },
      { x: 9, y: 5 },
    ]);
    expect(candidates[4].accel).toEqual({ x: 0, y: 0 });
    expect(candidates.every((c) => c.dangerous === false)).toBe(true);
  });

  it('速度0のとき、その場にとどまる候補は選べる', () => {
    // Given
    const state = racingState(
      { position: { x: 2, y: 5 } },
      { position: { x: 2, y: 7 } }
    );

    // When
    const stay = listCandidates(state, straight)[4];

    // Then
    expect(stay.target).toEqual({ x: 2, y: 5 });
    expect(stay.status).toBe('ok');
  });

  it('コースの外に出る候補は、はみ出す', () => {
    // Given: スタートライン上 (2,3)、速度0。上(y=2)と後ろ(x=1)は外
    const state = racingState(
      { position: { x: 2, y: 3 } },
      { position: { x: 2, y: 7 } }
    );

    // When
    const statuses = listCandidates(state, straight).map((c) => c.status);

    // Then
    expect(statuses).toEqual([
      'offCourse',
      'offCourse',
      'offCourse',
      'offCourse',
      'ok',
      'ok',
      'offCourse',
      'ok',
      'ok',
    ]);
  });

  it('カーブの内側の芝を横切る候補は、はみ出す', () => {
    // Given: L字の横の道 (10,6) から、速度 (4,4) で角の内側へ
    const state = racingState(
      { position: { x: 10, y: 6 }, velocity: { x: 4, y: 4 } },
      { position: { x: 2, y: 3 } }
    );

    // When
    const center = listCandidates(state, l)[4];

    // Then: (14,10) は縦の道の中だが、線分が芝を横切る
    expect(center.target).toEqual({ x: 14, y: 10 });
    expect(center.status).toBe('offCourse');
  });

  it('相手の車がいる点は、相手がいる', () => {
    // Given: 相手が (3,5) にいる
    const state = racingState(
      { position: { x: 2, y: 5 } },
      { position: { x: 3, y: 5 } }
    );

    // When
    const right = listCandidates(state, straight)[5];

    // Then
    expect(right.target).toEqual({ x: 3, y: 5 });
    expect(right.status).toBe('occupied');
  });

  it('相手が以前いた点や、相手の軌跡と交わる線分は妨げない', () => {
    // Given: 相手は (3,4)→(5,6) と動いた
    const state = racingState(
      { position: { x: 2, y: 6 }, velocity: { x: 1, y: -1 } },
      {
        position: { x: 5, y: 6 },
        trail: [
          { x: 3, y: 4 },
          { x: 5, y: 6 },
        ],
      }
    );

    // When: 慣性点 (3,5)、左上の候補が (2,4)、上が (3,4)
    const candidates = listCandidates(state, straight);

    // Then
    expect(candidates[1].target).toEqual({ x: 3, y: 4 });
    expect(candidates[1].status).toBe('ok');
    expect(candidates[4].status).toBe('ok');
  });

  it('ゴールラインに届く候補は、ゴールできる(交点つき)', () => {
    // Given: 直線コースのゴールラインは x=20。(17,5) から速度 (3,0)
    const state = racingState(
      { position: { x: 17, y: 5 }, velocity: { x: 3, y: 0 } },
      { position: { x: 2, y: 3 } }
    );

    // When
    const candidates = listCandidates(state, straight);

    // Then: 行き先の x が 19 の列は届かない、20・21 の列はゴール
    expect(candidates.map((c) => c.status)).toEqual([
      'ok',
      'goal',
      'goal',
      'ok',
      'goal',
      'goal',
      'ok',
      'goal',
      'goal',
    ]);
    expect(candidates[4].goal).toEqual({ point: { x: 20, y: 5 }, t: 1 });
    expect(candidates[5].goal?.t).toBeCloseTo(3 / 4);
  });

  it('ゴールした車は、衝突の判定に含めない', () => {
    // Given: 相手はゴールして (21,5) にいる(ゴールラインの先)。
    // 自分の候補 (21,5) もゴールする手
    const state = racingState(
      { position: { x: 18, y: 5 }, velocity: { x: 3, y: 0 } },
      { position: { x: 21, y: 5 }, goalRound: 1 },
      { turn: 0, round: 2 }
    );

    // When
    const candidates = listCandidates(state, straight);

    // Then
    expect(candidates[4].target).toEqual({ x: 21, y: 5 });
    expect(candidates[4].status).toBe('goal');
  });

  it('レース中でなければ候補を作れない', () => {
    // Given
    const state = {
      ...racingState(
        { position: { x: 2, y: 5 } },
        { position: { x: 2, y: 7 } }
      ),
      phase: 'placing' as const,
    };

    // Then
    expect(() => listCandidates(state, straight)).toThrow();
  });
});
