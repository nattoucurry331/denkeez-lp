// Astro 設定 — Denkeez LP は静的サイト + ゲーム部分のみ vanilla JS で interactive
// (React / フレームワーク "島" は不要、HTML+CSS+TS で軽量化)
import { defineConfig } from 'astro/config';

export default defineConfig({
  // 公開 URL (OGP / Sitemap / canonical で使用)。
  // 独自ドメイン取得時に変更すること。
  site: 'https://denkeez-lp.pages.dev',
  output: 'static',
  build: {
    inlineStylesheets: 'auto',
  },
});
