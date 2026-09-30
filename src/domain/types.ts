import type { CourseId, GoalCrossing } from './course/types';

/** 盤上の座標(実数)。x は右向き、y は下向き(画面の「上」は y が減る向き) */
export interface Point {
  readonly x: number;
  readonly y: number;
}

/**
 * 格子点、または移動量・速度・加速。
 * 形は Point と同じだが、整数だけを入れる約束。
 */
export type Vec = Point;

/** 盤上の線分 */
export interface Segment {
  readonly from: Point;
  readonly to: Point;
}

export type CpuLevel = 'weak' | 'normal' | 'strong';
/** 先攻後攻の決め方(人から見て)。人同士の対戦では使わない(赤鉛筆が先攻) */
export type TurnOrder = 'lottery' | 'first' | 'second';

/** 設定画面で選んだ内容 */
export interface GameSettings {
  readonly opponent: 'cpu' | 'human';
  readonly courseId: CourseId;
  /** opponent が 'cpu' のときだけ使う */
  readonly cpuLevel: CpuLevel;
  /** opponent が 'cpu' のときだけ使う */
  readonly turnOrder: TurnOrder;
  /** P1: 行き止まりのアラート */
  readonly alert: boolean;
}

export type GamePhase = 'placing' | 'racing' | 'finished';
export type PenColor = 'red' | 'blue';

export interface PlayerState {
  readonly kind: 'human' | 'cpu';
  /** kind が 'cpu' のときだけ入る */
  readonly cpuLevel: CpuLevel | null;
  /** 先攻 'red'、後攻 'blue' */
  readonly color: PenColor;
  /** スタート位置を選ぶまでは null */
  readonly position: Vec | null;
  /** 前の手の移動量 */
  readonly velocity: Vec;
  /** 通った点の列(スタート位置から)。手数は trail.length - 1 */
  readonly trail: readonly Vec[];
  /** ゴールした周回。ゴールしていなければ null */
  readonly goalRound: number | null;
}

export type ResultReason = 'goal' | 'tieRule' | 'deadEnd';

export interface GameResult {
  /** 勝ったプレイヤーの番号 */
  readonly winner: number;
  readonly reason: ResultReason;
  /** 各プレイヤーの手数 */
  readonly moveCounts: readonly number[];
}

/** ゲームの状態。書き換えず、行動を適用するたびに新しく作る */
export interface GameState {
  readonly courseId: CourseId;
  /** 手番順(0番が先攻)。最初の版は2人 */
  readonly players: readonly PlayerState[];
  readonly phase: GamePhase;
  /** 手番のプレイヤーの番号(players の添字) */
  readonly turn: number;
  /** 現在の周回(レース中は1から。スタート位置選びの間は0) */
  readonly round: number;
  /** phase が 'finished' のときだけ入る */
  readonly result: GameResult | null;
}

/** 行動。画面の操作もCPUの手も、この形でドメイン層に渡す */
export type Action =
  | { readonly type: 'place'; readonly point: Vec }
  | { readonly type: 'move'; readonly accel: Vec };

/**
 * 'deadEnd' は分類(classify.ts)の結果ではなく、行き止まりのアラート
 * (設定オン)で断った候補を、選び直すまでバツ表示にするための状態
 * (GameController が上書きする)
 */
export type CandidateStatus =
  'ok' | 'goal' | 'offCourse' | 'occupied' | 'deadEnd';

/** 9候補の1つ */
export interface Candidate {
  /** この候補に対応する加速(各成分 -1〜1) */
  readonly accel: Vec;
  /** 行き先の格子点 */
  readonly target: Vec;
  readonly status: CandidateStatus;
  /** status が 'goal' のときだけ入る */
  readonly goal: GoalCrossing | null;
  /** P1: 選ぶとこの先どう指しても行き止まりになる(最短手数が「なし」) */
  readonly dangerous: boolean;
}
