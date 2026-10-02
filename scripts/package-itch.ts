/**
 * itch.io にアップロードする zip を作る。
 *
 * architecture.md の「デプロイ(itch.io)」どおり、dist/ の中身を、
 * dist/ というフォルダを含めずに zip 化する(zip の直下に index.html が
 * 来るようにする。itch.io は zip 直下の index.html をゲームの入り口として
 * 扱うため、1階層深いとそのまま遊べない)
 */
import { execFileSync } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, rmSync, statSync } from 'node:fs';
import { join } from 'node:path';

const DIST_DIR = 'dist';
const OUT_DIR = 'release';

if (!existsSync(DIST_DIR)) {
  console.error(
    `${DIST_DIR}/ がありません。先に npm run build を実行してください`
  );
  process.exit(1);
}

const { version } = JSON.parse(readFileSync('package.json', 'utf-8')) as {
  version: string;
};

mkdirSync(OUT_DIR, { recursive: true });
const outPath = join(OUT_DIR, `race-track-v${version}.zip`);
rmSync(outPath, { force: true });

// dist/ の中に cd してから zip することで、zip 直下に index.html が来るようにする
execFileSync('zip', ['-r', '-X', join('..', outPath), '.'], {
  cwd: DIST_DIR,
  stdio: 'inherit',
});

const { size } = statSync(outPath);
console.log(`\n作成しました: ${outPath} (${(size / 1024).toFixed(1)}KB)`);
console.log(
  'itch.io の管理画面(Edit game > Uploads)で、この zip を "This file will be played in the browser" にチェックしてアップロードしてください'
);
