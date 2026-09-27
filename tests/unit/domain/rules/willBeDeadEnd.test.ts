import { buildCourse } from '../../../../src/domain/course/buildCourse';
import { willBeDeadEnd } from '../../../../src/domain/rules/willBeDeadEnd';
import { straightCourse } from '../../fixtures/courses';
import { racingState } from '../../fixtures/states';

describe('willBeDeadEnd', () => {
  const course = buildCourse(straightCourse);

  it('次の手番で9候補がすべてコースの外なら真', () => {
    // Given: 下向きに速度4。行き先の y は 8〜10 で、道(y が 3〜7)の外
    const state = racingState(
      { position: { x: 12, y: 5 }, velocity: { x: 0, y: 4 } },
      { position: { x: 2, y: 7 } }
    );

    // Then
    expect(willBeDeadEnd(state, course, 0)).toBe(true);
  });

  it('選べる候補が1つでもあれば偽', () => {
    // Given: 下向きに速度3。行き先の y は 7〜9 で、y=7 の列は縁の上
    const state = racingState(
      { position: { x: 12, y: 5 }, velocity: { x: 0, y: 3 } },
      { position: { x: 2, y: 7 } }
    );

    // Then
    expect(willBeDeadEnd(state, course, 0)).toBe(false);
  });

  it('相手の車だけが理由なら偽(相手が動けば進める可能性がある)', () => {
    // Given: コースの内側の候補は (2,3) だけで、そこに相手がいる
    const state = racingState(
      { position: { x: 3, y: 3 }, velocity: { x: -2, y: -1 } },
      { position: { x: 2, y: 3 } }
    );

    // Then
    expect(willBeDeadEnd(state, course, 0)).toBe(false);
  });

  it('ゴールした車や、まだ置いていない車は偽', () => {
    // Given
    const goaled = racingState(
      { position: { x: 21, y: 5 }, velocity: { x: 3, y: 0 }, goalRound: 2 },
      { position: { x: 2, y: 7 } }
    );
    const notPlaced = {
      ...goaled,
      players: [{ ...goaled.players[0], position: null }, goaled.players[1]],
    };

    // Then
    expect(willBeDeadEnd(goaled, course, 0)).toBe(false);
    expect(willBeDeadEnd(notPlaced, course, 0)).toBe(false);
  });
});
