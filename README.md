# 揚げ物の達人 — GitHub / Cloudflare Pages 用ソース

ゲーム本体の最新版をGitHubに登録し、Cloudflare PagesのGit連携で公開するための構成です。3Dモデル、食材のテクスチャ、共有画像用フォント、音声生成コード、CSS、JavaScript、結果画像用サーバー処理を含みます。効果音はブラウザで合成するため音声ファイルはありません。

## GitHub → Cloudflare Pages

1. このZIPを展開し、**中身のファイルとフォルダー**をGitHubの新しいリポジトリのルートに登録します。ZIP自体をリポジトリへ置かないでください。
2. Cloudflareの「Workers & Pages」→「Create」→「Pages」→「Connect to Git」でリポジトリと公開ブランチを選びます。
3. Framework preset: **None**、Root directory: リポジトリのルート、Build command: **`npm run build:pages`**、Build output directory: **`dist`** を設定します。
4. Node.js 20以上を使用します。Cloudflareのビルド環境が古い場合はビルド環境変数 `NODE_VERSION=20` を設定します。
5. デプロイ完了後、Cloudflareが発行した `.pages.dev` の公開URLを開いて動作を確認します。GitHubの次回の更新時もGit連携で再ビルドされます。

手元で確認するには、展開先で `npm ci` → `npm run build:pages`。`dist/` に静的ファイル、`_worker.js`、`_routes.json` が生成されます。`dist` と `node_modules` は生成物なのでGitHubへの登録は不要です。

## 結果画像の保存とSNSリンクカード

結果画像のサーバー保存とプレイごとのリンクカードには **Cloudflare R2** が必要です。CloudflareでR2バケットを作成し、Pagesプロジェクトの Settings → Bindings から **R2 bucket binding** を追加してください。Variable name は **`BUCKET`**、紐づけるバケットは作成したものを指定します。Productionだけでなくプレビューでも使う場合は両環境へ設定し、設定後に再デプロイします。

R2未設定でもゲームの調理・採点、端末への共有画像の保存は動作します。結果専用URLの発行とSNSの画像付きリンクカードだけは使用できません。R2の利用料金・上限はCloudflareの契約に依存します。

公開先URLは閲覧中のサイトから自動判定します。旧サイトやプレビューのURLを新しい公開URLとして埋め込みません。カスタムドメインに変更した場合、そのドメインから開いて共有してください。共有結果のリンクカードは保存時のドメインを参照します。

**必要なAPIキー・秘密鍵・ログイン情報はありません。** Cloudflareのアカウント連携とR2 bindingはソース内では設定できないため、管理画面で設定してください。

## 全プレイヤー共通の累計調理品数

Pages Functions の `/api/cooked-count` は Cloudflare D1 の `COOKED_DB` binding を使います。既存の Pages プロジェクト `agetatsu-game` の production 環境には、D1 `agetatsu-cooked-dishes` を binding 済みです。別環境で公開する場合は、D1 に `cooked_results(id TEXT PRIMARY KEY, completed_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP)`、`cooked_total(singleton INTEGER PRIMARY KEY CHECK(singleton=1), total INTEGER NOT NULL DEFAULT 0)` を作成し、`(1,0)` を挿入して、`cooked_results` の INSERT 後に `cooked_total.total` を 1 増やすトリガーを追加してください。同じ結果IDの再送は主キーで除外されます。production の既存データベースやカウントを再作成・初期化しないでください。

## 主な構成

- `src/`：ゲーム、採点、3D描画、Web Audio、共有画像
- `src/assets/`：料理用テクスチャと共有画像用フォント
- `models/`：食材のGLBモデル
- `index.html`、`style.css`：ゲーム画面
- `worker/`：プレイごとの結果画像保存・共有リンク
- `build.mjs`、`build-pages.mjs`：Pages向けビルド
- `package.json`、`package-lock.json`：Node.js依存関係
- `LICENSES/`、`src/assets/SHARE-FONT-LICENSE.txt`：同梱素材のライセンス

これはGitHubへのアップロード用の**ソース一式**です。`npm run build:pages` 以外の既存ビルド方法は元の制作環境向けです。
