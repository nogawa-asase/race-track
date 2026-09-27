import type { CpuLevel } from '../types';

/** CPUの強さごとの設定(機能設計書「CPUの手の選択」ステップ4) */
export interface CpuLevelConfig {
  /** わざと損する確率(0〜1) */
  readonly mistakeProbability: number;
  /** 許す損の大きさの上限(1以上) */
  readonly maxLoss: number;
}

/**
 * 強さごとの初期値。プレイテストで調整する(PRDの未決定事項)
 */
export const CPU_LEVELS: Readonly<Record<CpuLevel, CpuLevelConfig>> = {
  weak: { mistakeProbability: 0.5, maxLoss: 3 },
  normal: { mistakeProbability: 0.2, maxLoss: 1 },
  strong: { mistakeProbability: 0, maxLoss: 0 },
};
