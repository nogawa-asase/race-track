import { gzipSync } from 'node:zlib';
import { buildCourse } from '../../../src/domain/course/buildCourse';
import { buildDistanceTable } from '../../../src/domain/table/buildDistanceTable';
import { encodeDistanceTable } from '../../../src/domain/table/tableCodec';
import { hairpin } from '../../../src/courses/hairpin';

/**
 * hairpin コースの最短手数の表を、その場で作って gzip 圧縮したもの。
 * `public/tables/*.bin.gz` は `npm run gen:tables`(prebuild・predev)が
 * 生成する副産物で、CI の lint・型チェック・テストのジョブはビルドを
 * 経由しないため存在しない。テストはファイルに頼らず、自分で用意する
 */
export function buildHairpinTableGz(): Buffer {
  const course = buildCourse(hairpin);
  const table = buildDistanceTable(course);
  const bytes = encodeDistanceTable(course, table);
  return gzipSync(bytes);
}
