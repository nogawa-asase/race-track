/**
 * 境界の比較の許容誤差。縁の上を内側に倒すため、比較は
 * `distance <= halfWidth + EPSILON` のように内側に倒れる向きで使う
 * (機能設計書「コースの内外判定」)
 */
export const EPSILON = 1e-9;

/**
 * 線分の内外判定で、二分割をやめる長さ(目盛り)。
 * このとき見た目とのずれは最大 MIN_SEGMENT_LENGTH / 2 = 1/32 目盛り(architecture.md「線分の内外判定の実装」)
 */
export const MIN_SEGMENT_LENGTH = 1 / 16;
