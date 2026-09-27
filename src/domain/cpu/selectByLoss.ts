import type { CpuLevel } from '../types';
import { CPU_LEVELS } from './cpuLevels';
import type { Random } from './random';

/** 最短手数付きの選択肢(手の候補、またはスタート位置の候補) */
export interface ScoredOption<T> {
  readonly option: T;
  /** 最短手数。「なし」(この先どう指してもゴールできない)は null */
  readonly distance: number | null;
}

/**
 * 最短手数付きの選択肢から、強さに応じて1つ選ぶ
 * (機能設計書「CPUの手の選択」のステップ3・4。スタート位置の選択でも使う)。
 *
 * - 最短手数が「なし」の選択肢は、「なし」でない選択肢が1つでもあれば除く
 * - 残りがすべて「なし」なら、その中から無作為に選ぶ(相手の車に塞がれている場合)
 * - そうでなければ、最短手数の最小値との差(損)を求め、強さごとの確率で、
 *   損の上限までの選択肢から無作為に選ぶ。それ以外(確率に外れた場合、または
 *   その損の選択肢がない場合)は、損0の選択肢から無作為に選ぶ
 */
export function selectByLoss<T>(
  options: readonly ScoredOption<T>[],
  level: CpuLevel,
  random: Random
): T {
  if (options.length === 0) {
    throw new Error('選択肢が1つもありません');
  }

  const known = options.filter((o) => o.distance !== null);
  if (known.length === 0) {
    return pickRandom(options, random).option;
  }

  const dMin = Math.min(...known.map((o) => o.distance!));
  const byLoss = (loss: number) =>
    known.filter((o) => o.distance! - dMin === loss);
  const best = byLoss(0);

  const config = CPU_LEVELS[level];
  if (random.next() < config.mistakeProbability) {
    const candidates = known.filter((o) => {
      const loss = o.distance! - dMin;
      return loss >= 1 && loss <= config.maxLoss;
    });
    if (candidates.length > 0) {
      return pickRandom(candidates, random).option;
    }
  }
  return pickRandom(best, random).option;
}

function pickRandom<T>(options: readonly T[], random: Random): T {
  const index = Math.floor(random.next() * options.length);
  // random.next() は1未満だが、浮動小数点の丸めで options.length に届く
  // 可能性をゼロにするため、範囲の最後に丸める
  return options[Math.min(index, options.length - 1)];
}
