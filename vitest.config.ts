import { configDefaults, defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    include: ['tests/**/*.test.ts'],
    // E2E テスト(Playwright)とシミュレーション(npm run test:sim)は対象外
    exclude: [...configDefaults.exclude, 'tests/e2e/**', '**/*.sim.test.ts'],
    passWithNoTests: true,
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      // カバレッジの目標はドメイン層だけに課す(開発ガイドラインの「テスト」)
      include: ['src/domain/**/*.ts'],
      thresholds: {
        branches: 80,
        functions: 80,
        lines: 80,
        statements: 80,
      },
    },
  },
});
