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
  const decompressed = response.body.pipeThrough(
    new DecompressionStream('gzip')
  );
  const bytes = new Uint8Array(await new Response(decompressed).arrayBuffer());
  // サイズが、コースの盤の大きさ・速度の範囲から計算したサイズと一致しなければ、
  // decodeDistanceTable が Error を投げる(architecture.md「入力の検証」)
  return decodeDistanceTable(course, bytes);
}
