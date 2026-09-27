import type { Course } from '../domain/course/types';
import type { DistanceTable } from '../domain/table/types';
import { decodeDistanceTable } from '../domain/table/tableCodec';

/**
 * コースの最短手数の表を、相対パスで読み込む。
 * 表はビルド時に gzip 圧縮して同梱されている(architecture.md「最短手数の表の用意」)
 */
export async function loadTable(course: Course): Promise<DistanceTable> {
  const url = `./tables/${course.definition.id}.bin.gz`;
  const response = await fetch(url);
  if (!response.ok || !response.body) {
    throw new Error(`表の読み込みに失敗しました(${course.definition.id})`);
  }
  // 配信サーバーによっては `.gz` ファイルに Content-Encoding: gzip を付け、
  // ブラウザ側で自動的に展開済みにしてしまう(例: vite preview)。
  // その場合に手動で DecompressionStream にかけると失敗するため、
  // 応答ヘッダーで自動展開の有無を判定する
  const alreadyDecompressed =
    response.headers.get('content-encoding') === 'gzip';
  const bytes = alreadyDecompressed
    ? new Uint8Array(await response.arrayBuffer())
    : new Uint8Array(
        await new Response(
          response.body.pipeThrough(new DecompressionStream('gzip'))
        ).arrayBuffer()
      );
  // サイズが、コースの盤の大きさ・速度の範囲から計算したサイズと一致しなければ、
  // decodeDistanceTable が Error を投げる(architecture.md「入力の検証」)
  return decodeDistanceTable(course, bytes);
}
