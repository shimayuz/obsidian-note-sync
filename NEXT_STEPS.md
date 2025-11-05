# 🎯 次のステップ

実装が完了しました！以下の順序で進めてください。

## ✅ 完了したこと

- [x] プロジェクト構造の作成
- [x] note-sync.js（コア同期ロジック）
- [x] GitHub Actions ワークフロー（自動同期）
- [x] 補助スクリプト（watch, cleanup, optimize）
- [x] Git LFS 設定
- [x] ドキュメント作成

## 📋 今すぐやること（5分）

### 1. 依存関係のインストール

```bash
npm install
```

### 2. 環境ファイルを作成

```bash
cp env.example .env
```

`.env` を編集して、note-mcp の URL を設定：
```
NOTE_MCP_URL=http://localhost:3000
```

### 3. Git の初期化（必要な場合）

```bash
git init
git add .
git commit -m "feat: initial setup of obsidian-note sync system"
```

### 4. GitHub にプッシュ

```bash
# リモートリポジトリを追加（未設定の場合）
git remote add origin https://github.com/<your-username>/<repo-name>.git

# プッシュ
git push -u origin main
```

## 🔧 note-mcp の準備（10分）

### オプション A: ローカルで起動（開発用）

```bash
# note-mcp リポジトリをクローン
cd /path/to/projects
git clone https://github.com/<your-username>/note-mcp.git
cd note-mcp
npm install

# 起動
npm start
# → http://localhost:3000
```

### オプション B: クラウドにデプロイ（本番推奨）

note-mcp を Vercel, Railway, Fly.io などにデプロイ。

デプロイ後、`.env` と GitHub Secrets を更新：
```
NOTE_MCP_URL=https://your-note-mcp.vercel.app
```

## 🚀 最初の記事で動作確認（5分）

### 1. note で下書きを作成

1. note.com にログイン
2. 新規下書きを作成（タイトル: "テスト記事"）
3. URL から note ID を取得（例: `https://note.com/xxx/n/abc123` → `n/abc123`）

### 2. 記事を作成

```bash
npm run create:article
```

対話形式で入力:
```
Title: テスト記事
Slug [test-article]: 
note ID: n/abc123
```

### 3. 記事を編集

```bash
cursor articles/test-article/index.md
```

内容を編集して保存。

### 4. note へ push

```bash
npm run sync:push test-article
```

成功すると:
```
✓ Pushed: test-article (v1)
```

### 5. note で確認

ブラウザで note を開き、下書きが更新されていることを確認。

### 6. note で編集

note の下書きを編集（例: **太字** を追加）。

### 7. Obsidian へ pull

```bash
npm run sync:pull test-article
```

成功すると:
```
✓ Pulled: test-article (v2)
```

### 8. 確認

```bash
cat articles/test-article/index.md
# note での変更が反映されているはず
```

## 🤖 GitHub Actions の設定（5分）

### 1. GitHub Secrets を設定

```bash
# note-mcp の URL を設定
gh secret set NOTE_MCP_URL --body "https://your-note-mcp.vercel.app"

# または GitHub の Web UI で設定
# Settings → Secrets and variables → Actions → New repository secret
```

> ⚠️ **重要**: `localhost:3000` は GitHub Actions からアクセスできません。
> note-mcp をクラウドにデプロイするか、ngrok を使用してください。

### 2. Actions の権限を設定

GitHub リポジトリの Settings → Actions → General で:

- [x] **Allow all actions and reusable workflows**
- [x] **Read and write permissions** （Workflow permissions）

### 3. 動作確認

```bash
# 記事を編集
echo "\n追加のテキスト" >> articles/test-article/index.md

# コミット & プッシュ
git add articles/test-article/
git commit -m "test: trigger github actions"
git push origin main
```

GitHub の Actions タブで:
- `Push to note` ワークフローが実行される
- note の下書きが自動更新される

## 📝 日常の使い方

### パターン 1: Cursor → note

```bash
# 1. Cursor で執筆
cursor articles/my-article/index.md

# 2. Git commit & push
git add articles/my-article/
git commit -m "feat: add new article"
git push

# → 自動で note に反映（GitHub Actions）
```

### パターン 2: note → Cursor

```bash
# 1. note で編集
# （ブラウザで編集 & 自動保存）

# 2. 手動で pull（または15分以内に自動 pull）
npm run sync:pull my-article

# 3. Cursor で再編集
cursor articles/my-article/index.md
```

### パターン 3: 往復編集

```
Cursor → note → Cursor → note → 公開
```

何度でも往復可能！

## 🛠️ 便利なコマンド

### ステータス確認

```bash
# 1つの記事
npm run sync:status test-article

# 全記事
npm run sync:check-all
```

### 手動同期

```bash
# push
npm run sync:push test-article

# pull
npm run sync:pull test-article

# 強制 push（ロック無視）
node scripts/note-sync.js push test-article --force
```

### note の編集を監視（ローカル開発用）

```bash
npm run watch:note
# → 30秒ごとにチェック、変更があれば自動 pull
```

### 画像最適化

```bash
npm run optimize:image path/to/image.jpg articles/my-article/assets/
```

### 未使用画像のクリーンアップ

```bash
npm run cleanup:images
```

## 📚 ドキュメント

- **[SETUP.md](SETUP.md)**: 詳細なセットアップ手順
- **[README.md](README.md)**: プロジェクト概要
- **[docs/quick-start.md](docs/quick-start.md)**: クイックスタート
- **[docs/best-practices.md](docs/best-practices.md)**: 運用のベストプラクティス

## 🐛 トラブルシューティング

### note-mcp に接続できない

```bash
# note-mcp が起動しているか確認
curl http://localhost:3000/health

# 環境変数を確認
cat .env
```

### Git LFS のエラー

```bash
# Git LFS を再インストール
npm run setup:lfs

# 画像を再取得
git lfs pull
```

### 競合が発生

```bash
# 競合ファイルを確認
cat articles/my-article/index.CONFLICT.md

# 手動マージ後
git add articles/my-article/
git commit -m "resolve: manual merge"
```

## 🎉 完了！

おめでとうございます！Obsidian ⇄ note.com の往復同期システムが動作しています。

### 次にやること

1. ✅ 実際の記事で試す
2. ✅ Obsidian を設定（Obsidian Git プラグイン）
3. ✅ 日常の執筆フローに組み込む

---

**Happy writing! 📝✨**

