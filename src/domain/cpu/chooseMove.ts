import type { Candidate, CpuLevel, Vec } from '../types';
import { isSelectable } from '../rules/classify';
import { add } from '../vec';
import type { DistanceTable } from '../table/types';
import type { Random } from './random';
import { selectByLoss } from './selectByLoss';

/**
 * CPUの手を選ぶ(機能設計書「CPUの手の選択」)。
 *
 * @param candidates - 手番のプレイヤーの9候補(1つ以上、選べるものを含むこと。
 *   すべて選べない〈行き止まり〉場合の決着は、呼び出し側(settleDeadEnd)が
 *   先に判定しているので、ここには来ない前提)
 * @param velocity - 手番のプレイヤーの現在の速度(新しい速度の計算に使う)
 * @returns 選んだ候補の加速
 */
export function chooseMove(
  candidates: readonly Candidate[],
  velocity: Vec,
  table: DistanceTable,
  level: CpuLevel,
  random: Random
): Vec {
  const selectable = candidates.filter(isSelectable);
  if (selectable.length === 0) {
    throw new Error('選べる候補が1つもありません(行き止まり)');
  }

  // ステップ2: ゴールできる手があれば選ぶ(どの強さでも同じ)
  const goals = selectable.filter((c) => c.status === 'goal');
  if (goals.length > 0) {
    return selectByLoss(
      goals.map((c) => ({ option: c.accel, distance: 0 })),
      level,
      random
    );
  }

  // ステップ3・4: ok の候補を、最短手数付きの選択肢にして選ぶ
  const scored = selectable.map((c) => ({
    option: c.accel,
    distance: table.get(c.target, add(velocity, c.accel)),
  }));
  return selectByLoss(scored, level, random);
}
