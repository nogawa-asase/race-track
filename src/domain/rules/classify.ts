import type { Course } from '../course/types';
import type { Candidate, GameState, Point, Vec } from '../types';
import { add, equals } from '../vec';

/**
 * 加速9通り。ay = -1, 0, 1 の順に、それぞれ ax = -1, 0, 1 の順で並べる
 * (機能設計書「Candidate」。方向パッドの左上から右下への並びと同じ)
 */
export const ACCELS_IN_ORDER: readonly Vec[] = [-1, 0, 1].flatMap((ay) =>
  [-1, 0, 1].map((ax) => ({ x: ax, y: ay }))
);

/**
 * 行き先を分類する(機能設計書「候補の分類」)。
 * ゴールの判定を衝突より先に行う。ゴールする手の行き先はゴールラインの先にあり、
 * そこにゴールしていない車はいないため
 *
 * @param occupied - ゴールしていない、ほかの車の位置
 */
export function classifyMove(
  from: Point,
  velocity: Vec,
  accel: Vec,
  course: Course,
  occupied: readonly Vec[]
): Candidate {
  const target = add(add(from, velocity), accel);
  const base = { accel, target, goal: null, dangerous: false };

  const goal = course.goalCrossing(from, target);
  if (goal) {
    return { ...base, status: 'goal', goal };
  }
  if (!course.isInside(target) || !course.isSegmentInside(from, target)) {
    return { ...base, status: 'offCourse' };
  }
  if (occupied.some((p) => equals(p, target))) {
    return { ...base, status: 'occupied' };
  }
  return { ...base, status: 'ok' };
}

/** 衝突の判定に含める、指定のプレイヤー以外の車の位置(ゴールした車と、まだ置いていない車は除く) */
export function otherCarPositions(state: GameState, self: number): Vec[] {
  const positions: Vec[] = [];
  state.players.forEach((p, i) => {
    if (i !== self && p.position && p.goalRound === null) {
      positions.push(p.position);
    }
  });
  return positions;
}

/** 候補が選べるか(選べる・ゴールできる) */
export function isSelectable(candidate: Candidate): boolean {
  return candidate.status === 'ok' || candidate.status === 'goal';
}
