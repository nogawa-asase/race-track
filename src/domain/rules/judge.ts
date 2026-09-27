import type { Course } from '../course/types';
import type { GameState, ResultReason } from '../types';
import { isSelectable } from './classify';
import { listCandidates } from './listCandidates';

/** 決着した状態を作る。手数は各プレイヤーの、スタート位置を除く移動の回数 */
export function finish(
  state: GameState,
  winner: number,
  reason: ResultReason
): GameState {
  return {
    ...state,
    phase: 'finished',
    result: {
      winner,
      reason,
      moveCounts: state.players.map((p) => Math.max(0, p.trail.length - 1)),
    },
  };
}

/**
 * 周回の終わり(最後のプレイヤーの手の後)に、決着したかを調べる。
 * その周回でゴールした人がいれば、手番が最後(添字が大きい)の人の勝ち。
 * 2人以上がゴールしていれば同着ルール(PRD「同着は後攻の勝ち」)。
 * 決着しなければ null
 */
export function judgeRoundEnd(state: GameState): GameState | null {
  const goaled = state.players
    .map((p, i) => (p.goalRound === state.round ? i : -1))
    .filter((i) => i >= 0);
  if (goaled.length === 0) {
    return null;
  }
  const winner = goaled[goaled.length - 1];
  return finish(state, winner, goaled.length > 1 ? 'tieRule' : 'goal');
}

/**
 * 手番の開始時に、手番のプレイヤーが行き止まり(9候補がすべて選べない)なら、
 * そのプレイヤーの負けとして決着した状態を返す。行き止まりでなければ state をそのまま返す。
 * 画面では、9候補とその理由を表示してから呼ぶ(PRD「行き止まりは負け」)。
 * 2人の対戦を前提にする
 */
export function settleDeadEnd(state: GameState, course: Course): GameState {
  if (state.phase !== 'racing') {
    return state;
  }
  if (listCandidates(state, course).some(isSelectable)) {
    return state;
  }
  const opponent = 1 - state.turn;
  const opponentGoaled = state.players[opponent].goalRound !== null;
  return finish(state, opponent, opponentGoaled ? 'goal' : 'deadEnd');
}
