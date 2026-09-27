import type { GameSettings, GameState, PenColor, PlayerState } from '../types';

const COLORS: readonly PenColor[] = ['red', 'blue'];

function newPlayer(
  kind: 'human' | 'cpu',
  settings: GameSettings,
  index: number
): PlayerState {
  return {
    kind,
    cpuLevel: kind === 'cpu' ? settings.cpuLevel : null,
    color: COLORS[index],
    position: null,
    velocity: { x: 0, y: 0 },
    trail: [],
    goalRound: null,
  };
}

/**
 * 設定と先攻から、スタート位置選びの状態を作る。先攻(添字0)が赤鉛筆。
 *
 * @param firstPlayer - CPU戦で先攻になる側(くじや設定で決めたもの)。人同士では使わない
 */
export function createGame(
  settings: GameSettings,
  firstPlayer: 'human' | 'cpu'
): GameState {
  const kinds: ('human' | 'cpu')[] =
    settings.opponent === 'human'
      ? ['human', 'human']
      : firstPlayer === 'human'
        ? ['human', 'cpu']
        : ['cpu', 'human'];

  return {
    courseId: settings.courseId,
    players: kinds.map((kind, i) => newPlayer(kind, settings, i)),
    phase: 'placing',
    turn: 0,
    round: 0,
    result: null,
  };
}
