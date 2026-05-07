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

## デプロイ (Cloudflare Pages)

GitHub にプッシュ → Cloudflare Pages が自動ビルド & 公開:

1. GitHub リポジトリ `denkeez-lp` を作成
2. このフォルダの内容を push
3. https://dash.cloudflare.com → **Workers & Pages** → **Create** → **Pages**
4. **Connect to Git** で `denkeez-lp` を接続
5. Build 設定:
   - Framework preset: `Astro`
   - Build command: `npm run build`
   - Build output directory: `dist`
   - 環境変数: `NODE_VERSION = 20` (`.nvmrc` でも OK、本リポジトリは `.nvmrc=20` 同梱)
6. Save and Deploy → 2〜3 分で `https://denkeez-lp.pages.dev` が公開

セキュリティヘッダ・キャッシュ制御は `public/_headers` で定義。

### 独自ドメイン

Cloudflare 上のプロジェクトページ → Custom domains → Add domain。
Cloudflare 取得ドメインなら自動で繋がる。他社取得ドメインは表示される DNS レコードを設定する。

## ライセンス

LP のソースコードおよびゲームは [Denkeez License v1.0](https://github.com/nattoucurry331/denkeez/blob/main/LICENSE) に準ずる。
