import {
  distanceToPath,
  isInEndCap,
  isInsideShape,
} from '../../../../src/domain/course/distance';
import { isSegmentInsideShape } from '../../../../src/domain/course/segmentInside';
import { buildShape } from '../../../../src/domain/course/shape';
import type { Point } from '../../../../src/domain/types';
import { lCourse, straightCourse } from '../../fixtures/courses';

/** L字の角の内側の縁(中心 (12,8)、半径1の円)の上の点 */
function innerEdge(degrees: number): Point {
  const rad = (degrees * Math.PI) / 180;
  return { x: 12 + Math.cos(rad), y: 8 + Math.sin(rad) };
}

describe('isSegmentInsideShape', () => {
  const straight = buildShape(straightCourse);
  const l = buildShape(lCourse);

  it('道に沿う線分は内側', () => {
    expect(
      isSegmentInsideShape({ x: 2, y: 5 }, { x: 20, y: 5 }, straight)
    ).toBe(true);
    expect(
      isSegmentInsideShape({ x: 3, y: 3 }, { x: 19, y: 7 }, straight)
    ).toBe(true);
    expect(isSegmentInsideShape({ x: 15, y: 10 }, { x: 15, y: 20 }, l)).toBe(
      true
    );
  });

  it('縁の上に沿う線分は内側', () => {
    expect(
      isSegmentInsideShape({ x: 2, y: 7 }, { x: 20, y: 7 }, straight)
    ).toBe(true);
    // スタートラインの上を横に動く
    expect(isSegmentInsideShape({ x: 2, y: 3 }, { x: 2, y: 7 }, straight)).toBe(
      true
    );
  });

  it('端の点がコースの外なら外側', () => {
    expect(isSegmentInsideShape({ x: 5, y: 5 }, { x: 5, y: 8 }, straight)).toBe(
      false
    );
  });

  it('カーブの内側の芝を横切る線分は外側', () => {
    // Given: (10,6) は横の道、(14,10) は縦の道の中。間に角の内側の芝がある
    // Then
    expect(isSegmentInsideShape({ x: 10, y: 6 }, { x: 14, y: 10 }, l)).toBe(
      false
    );
  });

  it('道の縁から0.1目盛り以上はみ出す線分は外側', () => {
    // Given: 内側の縁(半径1の円)の上の2点を結ぶ弦。弦の中点は、縁から
    // 1 - cos(30°) ≒ 0.134 目盛りだけ芝に入る
    const a = innerEdge(-75);
    const b = innerEdge(-15);

    // Then
    expect(isInsideShape(a, l)).toBe(true);
    expect(isInsideShape(b, l)).toBe(true);
    expect(isSegmentInsideShape(a, b, l)).toBe(false);
  });

  it('端の切り落とし部分を通る線分は外側', () => {
    // Given: スタートライン(x=2)の両端近くを、後ろ側に回り込む線分は作れないため、
    // ゴール側で、ゴールラインの先を通って戻る線分を使う
    // (20,3)→(20,7) はゴールラインの上なので内側
    expect(
      isSegmentInsideShape({ x: 20, y: 3 }, { x: 20, y: 7 }, straight)
    ).toBe(true);
    // ゴールラインの先の点を通る線分は、端点が外なので外側
    expect(
      isSegmentInsideShape({ x: 19, y: 3 }, { x: 21, y: 5 }, straight)
    ).toBe(false);
  });

  it('スタートラインの後ろにコースのほかの部分があっても、切り落とし部分を通る線分は外側', () => {
    // Given: (10,10) から右へ出て、下・左・上と回り、スタートラインの後ろ(x<10)に戻ってくるコース。
    // 本番のコースは芝の幅の制約でここまで近づかないが、切り落としの判定を直接確かめるため
    const loop = buildShape({
      ...lCourse,
      centerline: [
        { x: 10, y: 10 },
        { x: 20, y: 10 },
        { x: 20, y: 20 },
        { x: 4, y: 20 },
        { x: 4, y: 12 },
      ],
      filletRadius: 2,
    });
    const behindStart = { x: 4, y: 14 };

    // Then: スタートラインの後ろの点から、切り落とし部分(中心 (10,10)、半径2の半円)を通る
    expect(isInsideShape(behindStart, loop)).toBe(true);
    expect(isSegmentInsideShape(behindStart, { x: 10, y: 9 }, loop)).toBe(
      false
    );
    // 切り落とし部分から離れていれば、切り落としの判定は通り、芝の判定で外側になる
    expect(isSegmentInsideShape(behindStart, { x: 12, y: 11 }, loop)).toBe(
      false
    );
    // スタートラインの後ろの部分の中だけを動く線分は内側
    expect(isSegmentInsideShape(behindStart, { x: 4, y: 18 }, loop)).toBe(true);
  });

  it('ランダムな線分で、細かい標本化の結果と食い違うのは、はみ出しが1/32目盛り以下のときだけ', () => {
    // Given: 種を固定した疑似乱数で、L字コースに2000本の線分を作る
    let seed = 12345;
    const random = () => {
      seed = (seed * 1103515245 + 12345) % 2147483648;
      return seed / 2147483648;
    };
    // 両端をコースの内側から選ぶ(実際の手と同じく、境界付近を通る線分が多くなる)
    const randomInside = (lattice: boolean): Point => {
      for (;;) {
        const raw = { x: random() * 20, y: random() * 22 };
        const p = lattice ? roundPoint(raw) : raw;
        if (isInsideShape(p, l)) {
          return p;
        }
      }
    };
    // 標本化の間隔。はみ出しを最大 DENSE_STEP / 2 だけ小さく見積もるので、
    // 「確実に内側」と言うときはその分の余裕をとる
    const DENSE_STEP = 1 / 128;
    const TOLERANCE = 1 / 32;

    for (let i = 0; i < 2000; i++) {
      // 格子点どうし(実際の使い方)と、実数の点の両方を試す
      const a = randomInside(i % 2 === 0);
      const b = randomInside(i % 2 === 0);

      // When
      const fast = isSegmentInsideShape(a, b, l);

      // Then: 細かく標本化して、はみ出しの最大量と、切り落とし部分に入るかを調べる
      const length = Math.hypot(b.x - a.x, b.y - a.y);
      const n = Math.max(1, Math.ceil(length / DENSE_STEP));
      let maxExcess = -Infinity;
      let hitsCap = false;
      for (let k = 0; k <= n; k++) {
        const p = {
          x: a.x + ((b.x - a.x) * k) / n,
          y: a.y + ((b.y - a.y) * k) / n,
        };
        maxExcess = Math.max(
          maxExcess,
          distanceToPath(p, l.path) - l.halfWidth
        );
        hitsCap ||=
          isInEndCap(p, l.startCap, l.halfWidth) ||
          isInEndCap(p, l.goalCap, l.halfWidth);
      }
      if (maxExcess > TOLERANCE || hitsCap) {
        expect(fast, `(${a.x},${a.y})→(${b.x},${b.y})`).toBe(false);
      } else if (maxExcess <= -DENSE_STEP && !hitsCap) {
        expect(fast, `(${a.x},${a.y})→(${b.x},${b.y})`).toBe(true);
      }
    }
  }, 60_000);
});

function roundPoint(p: Point): Point {
  return { x: Math.round(p.x), y: Math.round(p.y) };
}
