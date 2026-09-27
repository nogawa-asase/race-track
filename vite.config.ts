import { defineConfig } from 'vite';

export default defineConfig({
  // itch.io の配信先のパスに依存しないよう、すべて相対パスで参照する
  base: './',
});
