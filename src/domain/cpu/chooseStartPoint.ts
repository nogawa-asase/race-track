import type { CpuLevel, Vec } from '../types';
import type { DistanceTable } from '../table/types';
import type { Random } from './random';
import { selectByLoss } from './selectByLoss';

const ZERO: Vec = { x: 0, y: 0 };

/**
 * CPUがスタート位置を選ぶ(機能設計書「CPUの手の選択 > スタート位置の選択」)。
 * 各点の速度0での最短手数を使い、手の選択と同じ方法(損と確率)で選ぶ
 *
 * @param points - 置ける点(1つ以上)
 */
export function chooseStartPoint(
  points: readonly Vec[],
  table: DistanceTable,
  level: CpuLevel,
  random: Random
): Vec {
  if (points.length === 0) {
    throw new Error('置ける点が1つもありません');
  }
  const scored = points.map((point) => ({
    option: point,
    distance: table.get(point, ZERO),
  }));
  return selectByLoss(scored, level, random);
}
