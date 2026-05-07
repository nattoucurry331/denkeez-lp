# Denkeez LP

[Denkeez(電気工事の平面図エディタ)](https://github.com/nattoucurry331/denkeez) のランディングページ。

**遊べる要素**:
- 🔌 ネオン配線パズル (Flow Free 風)
- 📐 製図トレース (画力診断)

スマホタッチで遊べる、SNS 映えするネオン UI。

---

## 開発

```sh
# 依存インストール
npm install

# 開発サーバ (http://localhost:4321)
npm run dev

# 本番ビルド
npm run build

# ビルド結果のローカル確認
npm run preview
```

## 構成

```
denkeez-lp/
├── src/
│   ├── pages/
│   │   └── index.astro             ← トップページ
│   ├── layouts/
│   │   └── Layout.astro            ← html shell + global CSS
│   ├── components/
│   │   ├── Hero.astro              ← ファーストビュー
│   │   ├── WirePuzzle.astro        ← 🔌 ゲーム A コンテナ
│   │   ├── Features.astro          ← 機能紹介
│   │   ├── DrawingTrace.astro      ← 📐 ゲーム C コンテナ
│   │   ├── DevStory.astro          ← 開発者の物語
│   │   ├── Download.astro          ← β版 DL CTA
│   │   ├── EmailSignup.astro       ← メアド登録 (Substack 接続予定)
│   │   └── Footer.astro
│   └── games/
│       ├── wire-puzzle.ts          ← Game A 本体ロジック (vanilla TS + Canvas)
│       └── drawing-trace.ts        ← Game C 本体ロジック
└── public/
    └── favicon.svg
```

## デプロイ

Vercel にプッシュベースで連動する想定:

1. GitHub リポジトリ `denkeez-lp` を作成
2. このフォルダの内容を push
3. https://vercel.com で Import Repository
4. ビルドコマンド: `npm run build`、出力ディレクトリ: `dist`
5. 公開 URL を取得 → 必要なら独自ドメインを向ける

## ライセンス

LP のソースコードおよびゲームは [Denkeez License v1.0](https://github.com/nattoucurry331/denkeez/blob/main/LICENSE) に準ずる。
