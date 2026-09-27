import eslint from '@eslint/js';
import tseslint from 'typescript-eslint';
import prettierConfig from 'eslint-config-prettier';

/**
 * import を禁止する層の指定を作る。
 * 相対パスの深さに左右されないよう、パスの途中にディレクトリ名が現れるかで判定する。
 */
function forbidLayers(layers, reason) {
  return {
    'no-restricted-imports': [
      'error',
      {
        patterns: layers.map((layer) => ({
          group: [`**/${layer}`, `**/${layer}/**`],
          message: reason,
        })),
      },
    ],
  };
}

export default tseslint.config(
  eslint.configs.recommended,
  ...tseslint.configs.recommended,
  prettierConfig,
  {
    rules: {
      '@typescript-eslint/no-unused-vars': [
        'error',
        { argsIgnorePattern: '^_' },
      ],
      '@typescript-eslint/explicit-function-return-type': 'off',
      '@typescript-eslint/explicit-module-boundary-types': 'off',
      '@typescript-eslint/no-explicit-any': 'error',
      'no-restricted-syntax': [
        'error',
        {
          selector: 'TSEnumDeclaration',
          message:
            'enum ではなく文字列リテラルの合併型を使う(開発ガイドラインの「型定義」)',
        },
      ],
    },
  },
  // 層の依存ルール(architecture.md の「層のルールの強制」)
  {
    files: ['src/domain/**/*.ts'],
    rules: {
      ...forbidLayers(
        ['app', 'ui', 'courses'],
        'ドメイン層は app・ui・courses に依存しない'
      ),
      'no-restricted-globals': [
        'error',
        ...[
          'window',
          'document',
          'setTimeout',
          'setInterval',
          'requestAnimationFrame',
        ].map((name) => ({
          name,
          message: 'ドメイン層は画面やタイマーに依存しない(純粋な関数で書く)',
        })),
      ],
      'no-restricted-properties': [
        'error',
        {
          object: 'Math',
          property: 'random',
          message: '乱数は Random インターフェースで引数として受け取る',
        },
      ],
    },
  },
  {
    files: ['src/app/**/*.ts'],
    rules: forbidLayers(
      ['ui'],
      'アプリケーション層は ui に依存しない(GameView インターフェースを通す)'
    ),
  },
  {
    files: ['src/courses/**/*.ts'],
    rules: forbidLayers(['app', 'ui'], 'コース定義は app・ui に依存しない'),
  },
  {
    files: ['scripts/**/*.ts'],
    rules: forbidLayers(['app', 'ui'], 'スクリプトは app・ui に依存しない'),
  },
  {
    ignores: [
      'node_modules/**',
      'dist/**',
      'coverage/**',
      '.steering/**',
      'public/tables/**',
      'test-results/**',
      'playwright-report/**',
    ],
  }
);
