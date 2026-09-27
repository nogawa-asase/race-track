import type { Course } from '../course/types';
import type { Candidate, GameState } from '../types';
import { ACCELS_IN_ORDER, classifyMove, otherCarPositions } from './classify';

/**
 * 手番のプレイヤーの9候補を作り、分類する。
 *
 * @param state - レース中の状態(phase が 'racing')
 * @param course - 判定に使うコース
 * @returns 加速 (-1,-1) 〜 (1,1) の順(ACCELS_IN_ORDER)に並んだ9つの候補
 */
export function listCandidates(state: GameState, course: Course): Candidate[] {
  const player = state.players[state.turn];
  if (state.phase !== 'racing' || !player.position) {
    throw new Error('レース中でないため、候補を作れません');
  }
  const occupied = otherCarPositions(state, state.turn);
  const from = player.position;
  return ACCELS_IN_ORDER.map((accel) =>
    classifyMove(from, player.velocity, accel, course, occupied)
  );
}
