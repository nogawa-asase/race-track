import type { GameSettings, GameState, PenColor, PlayerState } from '../types';

function newPlayer(
  kind: 'human' | 'cpu',
  settings: GameSettings,
  color: PenColor
): PlayerState {
  return {
    kind,
    cpuLevel: kind === 'cpu' ? settings.cpuLevel : null,
    color,
    position: null,
    velocity: { x: 0, y: 0 },
    trail: [],
    goalRound: null,
  };
}

/**
 * 設定と先攻から、スタート位置選びの状態を作る。
 * CPU戦は、先攻後攻によらずCPUがいつも青鉛筆(人が赤鉛筆)。人同士は
 * 先攻(添字0)が赤鉛筆(後攻(添字1)が青鉛筆)
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
  const colors: PenColor[] =
    settings.opponent === 'human'
      ? ['red', 'blue']
      : kinds.map((kind) => (kind === 'cpu' ? 'blue' : 'red'));

  return {
    courseId: settings.courseId,
    players: kinds.map((kind, i) => newPlayer(kind, settings, colors[i])),
    phase: 'placing',
    turn: 0,
    round: 0,
    result: null,
  };
}
