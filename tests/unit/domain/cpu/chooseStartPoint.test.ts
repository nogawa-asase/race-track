import { chooseStartPoint } from '../../../../src/domain/cpu/chooseStartPoint';
import type { Random } from '../../../../src/domain/cpu/random';
import type { DistanceTable } from '../../../../src/domain/table/types';

function fixedRandom(...values: number[]): Random {
  let i = 0;
  return { next: () => values[Math.min(i++, values.length - 1)] };
}

describe('chooseStartPoint', () => {
  it('各点の速度0での最短手数から、強さに応じて選ぶ', () => {
    // Given: (2,3)の最短手数5、(2,5)の最短手数3(こちらが最短)
    const points = [
      { x: 2, y: 3 },
      { x: 2, y: 5 },
    ];
    const table: DistanceTable = {
      get: (p) => (p.y === 3 ? 5 : 3),
    };

    // When(strongは常に最短)
    const point = chooseStartPoint(points, table, 'strong', fixedRandom(0.99));

    // Then
    expect(point).toEqual({ x: 2, y: 5 });
  });

  it('置ける点が1つもなければ Error', () => {
    const table: DistanceTable = { get: () => null };
    expect(() => chooseStartPoint([], table, 'strong', fixedRandom(0))).toThrow(
      Error
    );
  });
});
