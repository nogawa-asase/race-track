import type { Course } from '../course/types';
import { RuleViolationError } from '../errors';
import type { Action, GameState, PlayerState, Vec } from '../types';
import { add, equals } from '../vec';
import { classifyMove, isSelectable, otherCarPositions } from './classify';
import { judgeRoundEnd } from './judge';
import { listStartPoints } from './listStartPoints';

/**
 * 行動を検証して適用し、新しい状態を返す。
 * ルールに合わない行動なら RuleViolationError を投げる(元の状態は変わらない)
 */
export function applyAction(
  state: GameState,
  course: Course,
  action: Action
): GameState {
  switch (action.type) {
    case 'place':
      return applyPlace(state, course, action);
    case 'move':
      return applyMove(state, course, action);
  }
}

function applyPlace(
  state: GameState,
  course: Course,
  action: Extract<Action, { type: 'place' }>
): GameState {
  if (state.phase !== 'placing') {
    throw new RuleViolationError(
      'スタート位置選びの段階ではありません',
      action
    );
  }
  if (!listStartPoints(state, course).some((p) => equals(p, action.point))) {
    throw new RuleViolationError('その点には車を置けません', action);
  }

  const players = replacePlayer(state.players, state.turn, (p) => ({
    ...p,
    position: action.point,
    trail: [action.point],
  }));
  const next = state.turn + 1;
  if (next < players.length) {
    return { ...state, players, turn: next };
  }
  return { ...state, players, phase: 'racing', turn: 0, round: 1 };
}

function applyMove(
  state: GameState,
  course: Course,
  action: Extract<Action, { type: 'move' }>
): GameState {
  const player = state.players[state.turn];
  if (state.phase !== 'racing' || !player.position) {
    throw new RuleViolationError('レース中ではありません', action);
  }
  if (!isValidAccel(action.accel)) {
    throw new RuleViolationError(
      '加速は各成分 -1〜1 の整数にしてください',
      action
    );
  }
  const candidate = classifyMove(
    player.position,
    player.velocity,
    action.accel,
    course,
    otherCarPositions(state, state.turn)
  );
  if (!isSelectable(candidate)) {
    throw new RuleViolationError('その候補は選べません', action);
  }

  const players = replacePlayer(state.players, state.turn, (p) => ({
    ...p,
    position: candidate.target,
    velocity: add(p.velocity, action.accel),
    trail: [...p.trail, candidate.target],
    goalRound: candidate.status === 'goal' ? state.round : p.goalRound,
  }));
  const moved = { ...state, players };

  const next = state.turn + 1;
  if (next < players.length) {
    return { ...moved, turn: next };
  }
  // 周回の終わり: 先攻がゴールしていても、後攻の手番までは決着しない(同着ルール)
  return judgeRoundEnd(moved) ?? { ...moved, turn: 0, round: state.round + 1 };
}

function isValidAccel(accel: Vec): boolean {
  return [accel.x, accel.y].every(
    (a) => Number.isInteger(a) && a >= -1 && a <= 1
  );
}

function replacePlayer(
  players: readonly PlayerState[],
  index: number,
  update: (p: PlayerState) => PlayerState
): PlayerState[] {
  return players.map((p, i) => (i === index ? update(p) : p));
}
