/**
 * 3コースそれぞれの最短手数の表を作り、gzip で圧縮して public/tables/ に書き出す。
 * npm run dev・npm run build の前に自動で実行される(predev・prebuild)。
 * architecture.md「最短手数の表の用意」
 */
import { gzipSync } from 'node:zlib';
import { mkdirSync, writeFileSync } from 'node:fs';
import { COURSES } from '../src/courses';
import { buildCourse } from '../src/domain/course/buildCourse';
import { buildDistanceTable } from '../src/domain/table/buildDistanceTable';
import { encodeDistanceTable } from '../src/domain/table/tableCodec';

/** 生成時間の目標(architecture.md「パフォーマンス要件」) */
const TARGET_MS = 2000;
const OUT_DIR = 'public/tables';

mkdirSync(OUT_DIR, { recursive: true });

for (const definition of COURSES) {
  const t0 = performance.now();
  const course = buildCourse(definition);
  const table = buildDistanceTable(course);
  const bytes = encodeDistanceTable(course, table);
  const elapsedMs = performance.now() - t0;
  const gz = gzipSync(bytes);
  writeFileSync(`${OUT_DIR}/${definition.id}.bin.gz`, gz);

  const kb = (n: number) => `${(n / 1024).toFixed(1)}KB`;
  console.log(
    `${definition.id}: ${elapsedMs.toFixed(0)}ms, ${kb(bytes.length)} → ${kb(gz.length)}(gzip)`
  );
  if (elapsedMs > TARGET_MS) {
    console.warn(`  警告: 生成時間が目標(${TARGET_MS}ms)を超えています`);
  }
}
