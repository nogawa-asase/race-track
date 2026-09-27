import { defineConfig } from 'vitest/config';

// CPU同士の対戦シミュレーション(npm run test:sim)専用の設定
export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    include: ['tests/sim/**/*.sim.test.ts'],
    passWithNoTests: true,
    // 全コース × 全強度の対戦を行うため、時間に余裕を持たせる
    testTimeout: 10 * 60 * 1000,
  },
});
