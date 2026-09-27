import { buildCourse } from '../../../../src/domain/course/buildCourse';
import { applyAction } from '../../../../src/domain/rules/applyAction';
import { settleDeadEnd } from '../../../../src/domain/rules/judge';
import type { GameState } from '../../../../src/domain/types';
import { straightCourse } from '../../fixtures/courses';
import { racingState } from '../../fixtures/states';

// 直線コースのゴールラインは x=20
const course = buildCourse(straightCourse);
const stay = { type: 'move' as const, accel: { x: 0, y: 0 } };

/** 速度 (3,0) で (17,y) にいる、次の手でゴールできる車 */
const nearGoal = (y: number) => ({
  position: { x: 17, y },
  velocity: { x: 3, y: 0 },
  trail: [
    { x: 2, y },
    { x: 17, y },
  ],
});
/** 速度 (1,0) で (10,y) にいる、まだゴールできない車 */
const farFromGoal = (y: number) => ({
  position: { x: 10, y },
  velocity: { x: 1, y: 0 },
  trail: [
    { x: 2, y },
    { x: 10, y },
  ],
});
/** (12,5) で下向きに速度4。9候補がすべてコースの外になる車 */
const doomed = {
  position: { x: 12, y: 5 },
  velocity: { x: 0, y: 4 },
  trail: [
    { x: 2, y: 5 },
    { x: 12, y: 5 },
  ],
};

function playRound(state: GameState): GameState {
  const afterFirst = applyAction(state, course, stay);
  return afterFirst.phase === 'finished'
    ? afterFirst
    : applyAction(afterFirst, course, stay);
}

describe('決着のルール(2人の場合)', () => {
  it('後攻がゴールし、先攻は同じ周回でゴールしていない → 後攻の勝ち(goal)', () => {
    // Given
    const state = racingState(farFromGoal(4), nearGoal(6), { round: 2 });

    // When
    const result = playRound(state).result;

    // Then
    expect(result).toEqual({ winner: 1, reason: 'goal', moveCounts: [2, 2] });
  });

  it('先攻がゴールしても、後攻の手番までは決着しない', () => {
    // Given
    const state = racingState(nearGoal(4), farFromGoal(6), { round: 2 });

    // When
    const afterFirst = applyAction(state, course, stay);

    // Then
    expect(afterFirst.phase).toBe('racing');
    expect(afterFirst.turn).toBe(1);
    expect(afterFirst.players[0].goalRound).toBe(2);
  });

  it('先攻がゴールし、後攻は同じ周回でゴールしなかった → 先攻の勝ち(goal)', () => {
    // Given
    const state = racingState(nearGoal(4), farFromGoal(6), { round: 2 });

    // When
    const result = playRound(state).result;

    // Then
    expect(result).toEqual({ winner: 0, reason: 'goal', moveCounts: [2, 2] });
  });

  it('先攻と後攻が同じ周回でゴールした → 後攻の勝ち(tieRule)', () => {
    // Given
    const state = racingState(nearGoal(4), nearGoal(6), { round: 2 });

    // When
    const result = playRound(state).result;

    // Then
    expect(result).toEqual({
      winner: 1,
      reason: 'tieRule',
      moveCounts: [2, 2],
    });
  });

  it('先攻がゴールした周回で、後攻が行き止まり → 先攻の勝ち(goal)', () => {
    // Given
    const state = racingState(nearGoal(4), doomed, { round: 2 });
    const afterFirst = applyAction(state, course, stay);

    // When
    const settled = settleDeadEnd(afterFirst, course);

    // Then
    expect(settled.phase).toBe('finished');
    expect(settled.result).toEqual({
      winner: 0,
      reason: 'goal',
      moveCounts: [2, 1],
    });
  });

  it('どちらもゴールしていないときに、手番のプレイヤーが行き止まり → 相手の勝ち(deadEnd)', () => {
    // Given
    const state = racingState(doomed, farFromGoal(6), { round: 2 });

    // When
    const settled = settleDeadEnd(state, course);

    // Then
    expect(settled.result).toEqual({
      winner: 1,
      reason: 'deadEnd',
      moveCounts: [1, 1],
    });
  });
});

describe('settleDeadEnd', () => {
  it('選べる候補があれば、状態をそのまま返す', () => {
    // Given
    const state = racingState(farFromGoal(4), farFromGoal(6));

    // Then
    expect(settleDeadEnd(state, course)).toBe(state);
  });

  it('相手の車に塞がれて選べる候補がない場合も、行き止まりで負け', () => {
    // Given: (3,3) で速度 (-2,-1)。コースの内側の候補は (2,3) だけで、そこに相手がいる
    const state = racingState(
      { position: { x: 3, y: 3 }, velocity: { x: -2, y: -1 } },
      { position: { x: 2, y: 3 } }
    );

    // When
    const settled = settleDeadEnd(state, course);

    // Then
    expect(settled.result?.reason).toBe('deadEnd');
    expect(settled.result?.winner).toBe(1);
  });

  it('レース中でなければ、状態をそのまま返す', () => {
    // Given
    const state = {
      ...racingState(doomed, farFromGoal(6)),
      phase: 'finished' as const,
    };

    // Then
    expect(settleDeadEnd(state, course)).toBe(state);
  });
});
