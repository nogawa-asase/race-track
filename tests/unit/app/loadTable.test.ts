import { readFileSync } from 'node:fs';
import { afterEach, vi } from 'vitest';
import { buildCourse } from '../../../src/domain/course/buildCourse';
import { loadTable } from '../../../src/app/loadTable';
import { hairpin } from '../../../src/courses/hairpin';

function gzipResponse(bytes: Uint8Array, ok = true): Response {
  return {
    ok,
    body: new Blob([bytes as unknown as ArrayBuffer]).stream(),
  } as Response;
}

describe('loadTable', () => {
  const course = buildCourse(hairpin);

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('生成済みの表(npm run gen:tables)を、展開して DistanceTable にする', async () => {
    // Given: 実際に生成された表のファイルを、fetch の代わりに返す
    const gz = readFileSync('public/tables/hairpin.bin.gz');
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => gzipResponse(new Uint8Array(gz)))
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
    const gz = readFileSync('public/tables/hairpin.bin.gz');
    const fetchMock = vi.fn(async () => gzipResponse(new Uint8Array(gz)));
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
