import { buildCourse } from '../../../../src/domain/course/buildCourse';
import { buildDistanceTable } from '../../../../src/domain/table/buildDistanceTable';
import {
  decodeDistanceTable,
  encodeDistanceTable,
} from '../../../../src/domain/table/tableCodec';
import { straightCourse } from '../../fixtures/courses';

describe('encodeDistanceTable / decodeDistanceTable', () => {
  const course = buildCourse(straightCourse);
  const table = buildDistanceTable(course);

  it('エンコードしてデコードすると、元の表と同じ値が得られる', () => {
    // Given
    const bytes = encodeDistanceTable(course, table);

    // When
    const restored = decodeDistanceTable(course, bytes);

    // Then: いくつかの代表的な状態で確かめる
    const cases: [Vec, Vec][] = [
      [
        { x: 2, y: 5 },
        { x: 0, y: 0 },
      ],
      [
        { x: 17, y: 5 },
        { x: 3, y: 0 },
      ],
      [
        { x: 10, y: 20 },
        { x: 0, y: 0 },
      ], // 道の外(「なし」)
      [
        { x: 10, y: 5 },
        { x: 0, y: 4 },
      ], // 行き止まり(「なし」)
    ];
    for (const [p, v] of cases) {
      expect(restored.get(p, v)).toBe(table.get(p, v));
    }
  });

  it('サイズが違うバイナリは Error', () => {
    // Given
    const bytes = encodeDistanceTable(course, table);

    // Then
    expect(() => decodeDistanceTable(course, bytes.slice(1))).toThrow(Error);
  });
});

type Vec = { x: number; y: number };
