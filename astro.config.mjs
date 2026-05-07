// Astro 設定 — Denkeez LP は静的サイト + ゲーム部分のみ vanilla JS で interactive
// (React / フレームワーク "島" は不要、HTML+CSS+TS で軽量化)
import { defineConfig } from 'astro/config';

export default defineConfig({
  site: 'https://denkeez.app',
  // GitHub Pages や Vercel 直サブドメインでも動くよう base は省略
  output: 'static',
  build: {
    inlineStylesheets: 'auto',
  },
});
