/**
 * ビルド結果(dist/)の合計サイズが上限を超えていないかを確認する。
 *
 * 上限は architecture.md の「リソース使用量」の配信サイズ。
 * 超えた場合は、大きいファイルから順に内訳を表示して終了コード1で終わる。
 */
import { existsSync, readdirSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';

const DIST_DIR = 'dist';
const MAX_DIST_BYTES = 500 * 1024;

interface FileSize {
  readonly path: string;
  readonly bytes: number;
}

function listFiles(dir: string): FileSize[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) {
      return listFiles(path);
    }
    return [{ path: relative(DIST_DIR, path), bytes: statSync(path).size }];
  });
}

function formatKB(bytes: number): string {
  return `${(bytes / 1024).toFixed(1)}KB`;
}

if (!existsSync(DIST_DIR)) {
  console.error(
    `${DIST_DIR}/ がありません。先に npm run build を実行してください`
  );
  process.exit(1);
}

const files = listFiles(DIST_DIR).sort((a, b) => b.bytes - a.bytes);
const total = files.reduce((sum, file) => sum + file.bytes, 0);
const summary = `配信サイズ: ${formatKB(total)} / 上限 ${formatKB(MAX_DIST_BYTES)}`;

if (total > MAX_DIST_BYTES) {
  console.error(`${summary}(上限を超えています)`);
  for (const file of files) {
    console.error(`  ${formatKB(file.bytes).padStart(10)}  ${file.path}`);
  }
  process.exit(1);
}

console.log(summary);
