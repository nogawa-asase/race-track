import type { GameState, PlayerState, Vec } from '../../../src/domain/types';

interface PlayerSpec {
  readonly position: Vec;
  readonly velocity?: Vec;
  /** 省略すると [position](スタート位置に置いただけ) */
  readonly trail?: readonly Vec[];
  readonly goalRound?: number | null;
}

/** テスト用のプレイヤー(人)を作る */
export function player(spec: PlayerSpec, color: 'red' | 'blue'): PlayerState {
  return {
    kind: 'human',
    cpuLevel: null,
    color,
    position: spec.position,
    velocity: spec.velocity ?? { x: 0, y: 0 },
    trail: spec.trail ?? [spec.position],
    goalRound: spec.goalRound ?? null,
  };
}

/** テスト用の、レース中の2人の状態を作る */
export function racingState(
  first: PlayerSpec,
  second: PlayerSpec,
  options: { readonly turn?: number; readonly round?: number } = {}
): GameState {
  return {
    courseId: 'hairpin',
    players: [player(first, 'red'), player(second, 'blue')],
    phase: 'racing',
    turn: options.turn ?? 0,
    round: options.round ?? 1,
    result: null,
  };
}
