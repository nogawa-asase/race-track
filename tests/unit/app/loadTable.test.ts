import { afterEach, vi } from 'vitest';
import { buildCourse } from '../../../src/domain/course/buildCourse';
import { loadTable } from '../../../src/app/loadTable';
import { hairpin } from '../../../src/courses/hairpin';
import { buildHairpinTableGz } from '../fixtures/tables';

function gzipResponse(bytes: Uint8Array, ok = true): Response {
  const blob = new Blob([bytes as unknown as ArrayBuffer]);
  return {
    ok,
    body: blob.stream(),
    headers: new Headers(),
    arrayBuffer: () => blob.arrayBuffer(),
  } as Response;
}

/** 配信サーバーが Content-Encoding: gzip を付け、ブラウザ側で自動展開済みの応答 */
function decodedResponse(bytes: Uint8Array): Response {
  const blob = new Blob([bytes as unknown as ArrayBuffer]);
  return {
    ok: true,
    body: blob.stream(),
    headers: new Headers({ 'content-encoding': 'gzip' }),
    arrayBuffer: () => blob.arrayBuffer(),
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

  it('Content-Encoding: gzip の応答(配信サーバーが自動展開済み)も読み込める', async () => {
    // Given: vite preview のように、サーバー側が .gz を自動展開して返す場合
    const { gunzipSync } = await import('node:zlib');
    const rawBytes = gunzipSync(tableGz);
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => decodedResponse(new Uint8Array(rawBytes)))
    );

    // When
    const table = await loadTable(course);

    // Then
    for (const point of course.startPoints) {
      expect(table.get(point, { x: 0, y: 0 })).not.toBeNull();
    }
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
