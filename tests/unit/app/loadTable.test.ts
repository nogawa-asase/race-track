import { afterEach, vi } from 'vitest';
import { buildCourse } from '../../../src/domain/course/buildCourse';
import { loadTable } from '../../../src/app/loadTable';
import { hairpin } from '../../../src/courses/hairpin';
import { buildHairpinTableGz } from '../fixtures/tables';

function gzipResponse(bytes: Uint8Array, ok = true): Response {
  return {
    ok,
    body: new Blob([bytes as unknown as ArrayBuffer]).stream(),
  } as Response;
}

describe('loadTable', () => {
  const course = buildCourse(hairpin);
  const tableGz = buildHairpinTableGz();

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('生成した表を、展開して DistanceTable にする', async () => {
    // Given: 実際に buildDistanceTable で作った表を、fetch の代わりに返す
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => gzipResponse(new Uint8Array(tableGz)))
    );

    // When
    const table = await loadTable(course);

    // Then: 全スタート位置(速度0)の最短手数が「なし」でないことを確かめる
    for (const point of course.startPoints) {
      expect(table.get(point, { x: 0, y: 0 })).not.toBeNull();
    }
  });

  it('相対パスでコースIDのファイルを取得する', async () => {
    // Given
    const fetchMock = vi.fn(async () => gzipResponse(new Uint8Array(tableGz)));
    vi.stubGlobal('fetch', fetchMock);

    // When
    await loadTable(course);

    // Then
    expect(fetchMock).toHaveBeenCalledWith('./tables/hairpin.bin.gz');
  });

  it('応答が失敗(ok: false)なら Error', async () => {
    // Given
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => gzipResponse(new Uint8Array(), false))
    );

    // Then
    await expect(loadTable(course)).rejects.toThrow(Error);
  });

  it('サイズが一致しない表は Error', async () => {
    // Given: 正しく圧縮されているが、展開後のサイズがコースと合わない中身
    const { gzipSync } = await import('node:zlib');
    const bogus = gzipSync(new Uint8Array(10));
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => gzipResponse(bogus))
    );

    // Then
    await expect(loadTable(course)).rejects.toThrow(Error);
  });
});
