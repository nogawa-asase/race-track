import type { Point, Segment, Vec } from '../types';

export type CourseId = 'hairpin' | 'crank' | 'spiral';
export type Difficulty = 'easy' | 'normal' | 'hard';

/** コースの定義データ(機能設計書「CourseDefinition」) */
export interface CourseDefinition {
  readonly id: CourseId;
  /** 表示名: 'ヘアピン' など */
  readonly name: string;
  readonly difficulty: Difficulty;
  /** 設定画面に出す特徴 */
  readonly description: string;
  /** 盤の格子点の数。格子点の座標は 0〜boardSize-1 */
  readonly boardSize: Vec;
  /** 中心線の折れ線の頂点(スタート側から順に。2点以上、整数) */
  readonly centerline: readonly Vec[];
  /** 折れ線の角を丸める円弧の半径(目盛り) */
  readonly filletRadius: number;
  /** 道の半幅(目盛り)。道幅は halfWidth × 2 */
  readonly halfWidth: number;
}

export interface LineElement {
  readonly kind: 'line';
  readonly from: Point;
  readonly to: Point;
}

/**
 * 円弧。sweep は符号付きの角度(ラジアン)。
 * y が下向きなので、正は画面上で時計回り
 */
export interface ArcElement {
  readonly kind: 'arc';
  readonly center: Point;
  readonly radius: number;
  readonly startAngle: number;
  readonly sweep: number;
}

/** パス(中心線の角をフィレットで丸めた、直線と円弧の列)の要素 */
export type PathElement = LineElement | ArcElement;

/** 線分とゴールラインの交わり */
export interface GoalCrossing {
  /** ゴールラインと交わる点 */
  readonly point: Point;
  /** 線分上の位置(0〜1)。1ならゴールライン上にぴったり止まる */
  readonly t: number;
}

/** 判定用に組み立てたコース(機能設計書「Course」) */
export interface Course {
  readonly definition: CourseDefinition;
  readonly path: readonly PathElement[];
  readonly startLine: Segment;
  readonly goalLine: Segment;
  /** スタートライン上の格子点(両端を含む) */
  readonly startPoints: readonly Vec[];
  /** 点がコースの内側か(縁の上は内側) */
  isInside(p: Point): boolean;
  /** 線分全体がコースの内側か */
  isSegmentInside(a: Point, b: Point): boolean;
  /** 線分 a→b がゴールラインに到達・通過するか。しなければ null */
  goalCrossing(a: Point, b: Point): GoalCrossing | null;
}
