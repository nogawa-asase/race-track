import { COURSES } from '../../../../src/courses';
import { buildCourse } from '../../../../src/domain/course/buildCourse';
import { buildDistanceTable } from '../../../../src/domain/table/buildDistanceTable';
import { straightCourse } from '../../fixtures/courses';

describe('buildDistanceTable(直線コース)', () => {
  // Given: 中心線 (2,5)→(20,5)、半幅2(道は y が 3〜7)、ゴールラインは x=20
  const course = buildCourse(straightCourse);
  const table = buildDistanceTable(course);

  it('ゴールラインの手前1目盛り、速度3で右向きなら、1手でゴール', () => {
    // (17,5) + (3,0) = (20,5) はゴールライン上
    expect(table.get({ x: 17, y: 5 }, { x: 3, y: 0 })).toBe(1);
  });

  it('スタート位置(速度0)から、最短でゴールできる手数が求まる', () => {
    // ゴールする手は途中で減速する必要がないので、0→1→2→…と加速し続ける
    // (1手でn進む)のが最短。距離18を超えるまで加速し続けたときの手数と一致する
    const distance = 18; // (2,5)→(20,5)
    expect(table.get({ x: 2, y: 5 }, { x: 0, y: 0 })).toBe(
      minMovesForDistance(distance)
    );
  });

  it('道の外の状態は「なし」', () => {
    expect(table.get({ x: 10, y: 20 }, { x: 0, y: 0 })).toBeNull();
  });

  it('コースの外へ向かう、行き止まりの状態は「なし」', () => {
    // (10,5) から縦に速度4。次の手番の9候補は y が 8〜10 で道(y 3〜7)の外
    expect(table.get({ x: 10, y: 5 }, { x: 0, y: 4 })).toBeNull();
  });

  it('速度0でとどまり続ければ、いつまでもゴールできない、という意味にはならない', () => {
    // とどまる手はあるが、そこからでも最短手数は求まる(行き止まりではない)
    expect(table.get({ x: 5, y: 5 }, { x: 0, y: 0 })).not.toBeNull();
  });
});

/**
 * 距離 d を、速度0から加速し続けて(1手目は1、2手目は2、…と進んで)
 * 超える(または届く)までの手数。ゴールする手は途中で止まる必要がないので、
 * 減速せずに加速し続けるのが最短(1次元の直線区間での理論値)
 */
function minMovesForDistance(d: number): number {
  for (let n = 1; ; n++) {
    if ((n * (n + 1)) / 2 >= d) {
      return n;
    }
  }
}

describe('buildDistanceTable(実際の3コース)', () => {
  it.each(COURSES)(
    '%s は、生成の途中で例外にならない',
    (definition) => {
      // Given / When / Then
      expect(() => buildDistanceTable(buildCourse(definition))).not.toThrow();
    },
    // カバレッジ計測(npm run test:coverage)は実行を数倍遅くするため、既定の
    // タイムアウト(5秒)では足りない。実測(npm run gen:tables)は1コース2秒以内
    30_000
  );
});
