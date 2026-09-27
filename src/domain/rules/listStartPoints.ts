import type { Course } from '../course/types';
import type { GameState, Vec } from '../types';
import { equals } from '../vec';

/** 置けるスタート位置(スタートライン上の格子点のうち、ほかの車がいない点) */
export function listStartPoints(state: GameState, course: Course): Vec[] {
  const taken = state.players.flatMap((p) => (p.position ? [p.position] : []));
  return course.startPoints.filter((p) => !taken.some((t) => equals(t, p)));
}
