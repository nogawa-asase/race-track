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
