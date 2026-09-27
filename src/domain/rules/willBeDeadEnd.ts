import type { Course } from '../course/types';
import type { GameState } from '../types';
import { ACCELS_IN_ORDER, classifyMove } from './classify';

/**
 * 指定のプレイヤーが、次の手番で9候補がすべてコースの外になるか(行き止まりの予告)。
 * 相手の車は考えない。相手が動けば進める可能性があるため、予告はコースの外が理由のときだけ出す
 * (PRD「行き止まりは負け」)
 */
export function willBeDeadEnd(
  state: GameState,
  course: Course,
  player: number
): boolean {
  const p = state.players[player];
  const from = p.position;
  if (!from || p.goalRound !== null) {
    return false;
  }
  return ACCELS_IN_ORDER.every(
    (accel) =>
      classifyMove(from, p.velocity, accel, course, []).status === 'offCourse'
  );
}
