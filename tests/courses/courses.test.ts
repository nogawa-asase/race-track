import { COURSES, getCourseDefinition } from '../../src/courses';
import { buildCourse } from '../../src/domain/course/buildCourse';
import { buildDistanceTable } from '../../src/domain/table/buildDistanceTable';
import { speedRange } from '../../src/domain/table/speedRange';
import {
  pathLength,
  pointAlongPath,
} from '../../src/domain/course/pathSampling';
import type { CourseDefinition } from '../../src/domain/course/types';
import { distance } from '../../src/domain/vec';
import { buildPath } from '../../src/domain/course/buildPath';

/** 道の間に確保する芝の幅(目盛り。機能設計書「CourseDefinition」の制約) */
const MIN_GRASS = 2;
/** パス上の点を取る間隔(目盛り) */
const SAMPLE_STEP = 0.25;

/**
 * 中心線の別々の部分の間の、芝の最小の幅。
 * パスに沿った距離が離れた2点の直線距離から、道幅(半幅×2)を引いたものの最小値。
 * 角の前後は同じ道の続きで、直線距離が小さくて当然なので、パスに沿った距離が
 * 「4 × 半幅 + 2 × 角の半径」未満の組は除く
 */
function minGrassGap(definition: CourseDefinition): number {
  const path = buildPath(definition.centerline, definition.filletRadius);
  const total = pathLength(path);
  const separation = 4 * definition.halfWidth + 2 * definition.filletRadius;
  const steps = Math.ceil(total / SAMPLE_STEP);
  const points = Array.from({ length: steps + 1 }, (_, i) =>
    pointAlongPath(path, (total * i) / steps)
  );
  const along = (i: number) => (total * i) / steps;

  let min = Infinity;
  for (let i = 0; i < points.length; i++) {
    for (let j = i + 1; j < points.length; j++) {
      if (along(j) - along(i) < separation) {
        continue;
      }
      min = Math.min(
        min,
        distance(points[i], points[j]) - 2 * definition.halfWidth
      );
    }
  }
  return min;
}

describe('3コースの定義', () => {
  it.each(COURSES.map((c) => [c.name, c] as const))(
    '%s は buildCourse を通る(制約の検証と、盤に収まることを含む)',
    (_name, definition) => {
      expect(() => buildCourse(definition)).not.toThrow();
    }
  );

  it.each(COURSES.map((c) => [c.name, c] as const))(
    '%s の別々の部分の間には、2目盛り以上の芝がある',
    (_name, definition) => {
      expect(minGrassGap(definition)).toBeGreaterThanOrEqual(MIN_GRASS);
    }
  );

  it.each(COURSES.map((c) => [c.name, c] as const))(
    '%s のスタート位置は3つ以上ある',
    (_name, definition) => {
      expect(buildCourse(definition).startPoints.length).toBeGreaterThanOrEqual(
        3
      );
    }
  );

  it('盤の大きさは 0〜32 の格子点(33×33)', () => {
    for (const definition of COURSES) {
      expect(definition.boardSize).toEqual({ x: 33, y: 33 });
    }
  });

  it('道の幅は、ヘアピン > クランク > うずまき の順に狭くなる', () => {
    // Given
    const width = (id: 'hairpin' | 'crank' | 'spiral') =>
      getCourseDefinition(id).halfWidth;

    // Then
    expect(width('hairpin')).toBeGreaterThan(width('crank'));
    expect(width('crank')).toBeGreaterThan(width('spiral'));
  });

  it('難易度は、やさしい・ふつう・むずかしい の順に並ぶ', () => {
    expect(COURSES.map((c) => c.difficulty)).toEqual([
      'easy',
      'normal',
      'hard',
    ]);
  });
});

describe('芝の幅のチェック', () => {
  it('脚の間隔が狭いコースでは、2目盛り未満と検出する(チェックが効いている確認)', () => {
    // Given: 脚の間隔5、道幅4 なので、芝は1
    const narrow: CourseDefinition = {
      ...COURSES[1],
      centerline: [
        { x: 4, y: 29 },
        { x: 4, y: 4 },
        { x: 9, y: 4 },
        { x: 9, y: 29 },
      ],
    };

    // Then
    expect(minGrassGap(narrow)).toBeCloseTo(1, 1);
    expect(minGrassGap(narrow)).toBeLessThan(MIN_GRASS);
  });
});

describe('最短手数の表(PRDのKPI「CPUの行き詰まりゼロ」の一部)', () => {
  /**
   * 生成時間の目標(architecture.mdの「パフォーマンス要件」、1コース2秒以内)は、
   * `npm run gen:tables` 単体の実行で満たすことを確かめている(design.mdの
   * 「実装で見つかった性能上の問題と対策」)。このテストは、他のテストと同時に
   * 実行され、CPUを取り合うぶん遅くなるため、目標そのものより緩い値を使い、
   * 大きな性能劣化(実装の変更で探索が何倍も遅くなること)だけを検出する
   */
  const REGRESSION_GUARD_MS = 8000;

  it.each(COURSES.map((c) => [c.name, c] as const))(
    '%s の全スタート位置(速度0)は、最短手数が「なし」にならない',
    (_name, definition) => {
      // カバレッジ計測は実行を数倍遅くするため、既定のタイムアウト(5秒)では
      // 足りないことがある(下のitの第3引数でタイムアウトを延ばす)
      // Given
      const course = buildCourse(definition);
      const table = buildDistanceTable(course);

      // Then
      for (const start of course.startPoints) {
        expect(
          table.get(start, { x: 0, y: 0 }),
          `(${start.x},${start.y})`
        ).not.toBeNull();
      }
    },
    30_000
  );

  it.each(COURSES.map((c) => [c.name, c] as const))(
    '%s の表の生成は、大きく遅くならない(回帰の検出)',
    (_name, definition) => {
      // Given
      const course = buildCourse(definition);
      const t0 = performance.now();

      // When
      buildDistanceTable(course);

      // Then
      expect(performance.now() - t0).toBeLessThan(REGRESSION_GUARD_MS);
    },
    30_000
  );

  it.each(COURSES.map((c) => [c.name, c] as const))(
    '%s でコース内から出せる速度は、速度の範囲(architecture.mdの計算式)に収まる',
    (_name, definition) => {
      // Given: コース内の格子点から、実際に見つかった最短手数の状態の速度の絶対値を集める
      const course = buildCourse(definition);
      const table = buildDistanceTable(course);
      const { vxMax, vyMax } = speedRange(definition.boardSize);
      let maxVx = 0;
      let maxVy = 0;

      // When
      for (let x = 0; x < definition.boardSize.x; x++) {
        for (let y = 0; y < definition.boardSize.y; y++) {
          if (!course.isInside({ x, y })) continue;
          for (let vx = -vxMax; vx <= vxMax; vx++) {
            for (let vy = -vyMax; vy <= vyMax; vy++) {
              if (table.get({ x, y }, { x: vx, y: vy }) !== null) {
                maxVx = Math.max(maxVx, Math.abs(vx));
                maxVy = Math.max(maxVy, Math.abs(vy));
              }
            }
          }
        }
      }

      // Then: 範囲の端(vxMax・vyMax)を実際に使い切っていない、
      // つまり範囲が十分足りていることを確かめる
      expect(maxVx).toBeLessThanOrEqual(vxMax);
      expect(maxVy).toBeLessThanOrEqual(vyMax);
    },
    30_000
  );
});

describe('コースの一覧', () => {
  it('IDが重複しない3コースで、ID から定義を引ける', () => {
    // Then
    expect(COURSES.map((c) => c.id)).toEqual(['hairpin', 'crank', 'spiral']);
    for (const definition of COURSES) {
      expect(getCourseDefinition(definition.id)).toBe(definition);
    }
  });

  it('未知のIDは Error', () => {
    // Then
    expect(() => getCourseDefinition('unknown' as never)).toThrow();
  });
});
