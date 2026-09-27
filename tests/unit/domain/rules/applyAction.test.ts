import { buildCourse } from '../../../../src/domain/course/buildCourse';
import { RuleViolationError } from '../../../../src/domain/errors';
import { applyAction } from '../../../../src/domain/rules/applyAction';
import { createGame } from '../../../../src/domain/rules/createGame';
import { listStartPoints } from '../../../../src/domain/rules/listStartPoints';
import type { GameSettings } from '../../../../src/domain/types';
import { straightCourse } from '../../fixtures/courses';
import { racingState } from '../../fixtures/states';

const course = buildCourse(straightCourse);
const settings: GameSettings = {
  opponent: 'cpu',
  courseId: 'hairpin',
  cpuLevel: 'normal',
  turnOrder: 'lottery',
  alert: true,
};

describe('createGame', () => {
  it('CPU戦で人が先攻なら、人が赤鉛筆(添字0)', () => {
    // When
    const state = createGame(settings, 'human');

    // Then
    expect(state.players.map((p) => [p.kind, p.color, p.cpuLevel])).toEqual([
      ['human', 'red', null],
      ['cpu', 'blue', 'normal'],
    ]);
    expect(state.phase).toBe('placing');
    expect(state.turn).toBe(0);
  });

  it('CPU戦でCPUが先攻なら、CPUが赤鉛筆', () => {
    // When
    const state = createGame(settings, 'cpu');

    // Then
    expect(state.players.map((p) => p.kind)).toEqual(['cpu', 'human']);
  });

  it('人同士なら2人とも人', () => {
    // When
    const state = createGame({ ...settings, opponent: 'human' }, 'cpu');

    // Then
    expect(state.players.map((p) => p.kind)).toEqual(['human', 'human']);
  });
});

describe('applyAction(place)', () => {
  it('スタート位置は手番順に置き、全員が置くとレースが始まる', () => {
    // Given
    const initial = createGame(settings, 'human');

    // When
    const afterFirst = applyAction(initial, course, {
      type: 'place',
      point: { x: 2, y: 4 },
    });
    const afterSecond = applyAction(afterFirst, course, {
      type: 'place',
      point: { x: 2, y: 6 },
    });

    // Then
    expect(afterFirst.phase).toBe('placing');
    expect(afterFirst.turn).toBe(1);
    expect(afterFirst.players[0].trail).toEqual([{ x: 2, y: 4 }]);
    expect(afterSecond.phase).toBe('racing');
    expect(afterSecond.turn).toBe(0);
    expect(afterSecond.round).toBe(1);
    expect(afterSecond.players[1].position).toEqual({ x: 2, y: 6 });
  });

  it('相手の車がある点は、置ける点から除かれ、置こうとすると RuleViolationError', () => {
    // Given
    const afterFirst = applyAction(createGame(settings, 'human'), course, {
      type: 'place',
      point: { x: 2, y: 4 },
    });

    // Then
    expect(listStartPoints(afterFirst, course)).toHaveLength(4);
    expect(() =>
      applyAction(afterFirst, course, { type: 'place', point: { x: 2, y: 4 } })
    ).toThrow(RuleViolationError);
  });

  it('スタートライン上でない点には置けない', () => {
    // Given
    const initial = createGame(settings, 'human');

    // Then
    expect(() =>
      applyAction(initial, course, { type: 'place', point: { x: 3, y: 5 } })
    ).toThrow(RuleViolationError);
  });

  it('レース中に置こうとすると RuleViolationError', () => {
    // Given
    const state = racingState(
      { position: { x: 2, y: 4 } },
      { position: { x: 2, y: 6 } }
    );

    // Then
    expect(() =>
      applyAction(state, course, { type: 'place', point: { x: 2, y: 5 } })
    ).toThrow(RuleViolationError);
  });
});

describe('applyAction(move)', () => {
  it('手を指すと、位置・速度・軌跡が更新され、手番が進む', () => {
    // Given: 先攻は (5,5)、速度 (2,0)
    const state = racingState(
      {
        position: { x: 5, y: 5 },
        velocity: { x: 2, y: 0 },
        trail: [
          { x: 2, y: 5 },
          { x: 3, y: 5 },
          { x: 5, y: 5 },
        ],
      },
      { position: { x: 2, y: 7 } }
    );

    // When: 右下へ加速 → 行き先 (8,6)、速度 (3,1)
    const next = applyAction(state, course, {
      type: 'move',
      accel: { x: 1, y: 1 },
    });

    // Then
    const p = next.players[0];
    expect(p.position).toEqual({ x: 8, y: 6 });
    expect(p.velocity).toEqual({ x: 3, y: 1 });
    expect(p.trail).toHaveLength(4);
    expect(next.turn).toBe(1);
    expect(next.round).toBe(1);
    // 元の状態は変わらない
    expect(state.players[0].position).toEqual({ x: 5, y: 5 });
  });

  it('後攻の手の後に、周回が進んで先攻の手番になる', () => {
    // Given
    const state = racingState(
      { position: { x: 5, y: 5 } },
      { position: { x: 2, y: 7 } },
      { turn: 1, round: 3 }
    );

    // When
    const next = applyAction(state, course, {
      type: 'move',
      accel: { x: 1, y: 0 },
    });

    // Then
    expect(next.turn).toBe(0);
    expect(next.round).toBe(4);
  });

  it.each([
    ['範囲外の加速', { x: 2, y: 0 }],
    ['整数でない加速', { x: 0.5, y: 0 }],
  ])('%s は RuleViolationError', (_label, accel) => {
    // Given
    const state = racingState(
      { position: { x: 5, y: 5 } },
      { position: { x: 2, y: 7 } }
    );

    // Then
    expect(() => applyAction(state, course, { type: 'move', accel })).toThrow(
      RuleViolationError
    );
  });

  it('はみ出す候補・相手がいる候補は RuleViolationError', () => {
    // Given: (5,3) は上の縁、相手は (6,4)
    const state = racingState(
      { position: { x: 5, y: 3 } },
      { position: { x: 6, y: 4 } }
    );

    // Then
    expect(() =>
      applyAction(state, course, { type: 'move', accel: { x: 0, y: -1 } })
    ).toThrow(RuleViolationError);
    expect(() =>
      applyAction(state, course, { type: 'move', accel: { x: 1, y: 1 } })
    ).toThrow(RuleViolationError);
  });

  it('スタート位置選びの間や、決着の後は、手を指せない', () => {
    // Given
    const placing = createGame(settings, 'human');
    const finished = {
      ...racingState(
        { position: { x: 5, y: 5 } },
        { position: { x: 2, y: 7 } }
      ),
      phase: 'finished' as const,
    };

    // Then
    for (const state of [placing, finished]) {
      expect(() =>
        applyAction(state, course, { type: 'move', accel: { x: 1, y: 0 } })
      ).toThrow(RuleViolationError);
    }
  });
});
