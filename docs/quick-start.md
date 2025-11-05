# クイックスタート

## 前提条件

- Node.js 18 以上
- Git LFS
- note-mcp（ローカルで起動済み）
- note.com アカウント

## セットアップ（5分）

### 1. リポジトリのクローン

```bash
git clone <your-repo-url>
cd <repo-name>
```

### 2. 依存関係のインストール

```bash
npm install
```

### 3. Git LFS の有効化

```bash
chmod +x scripts/setup-git-lfs.sh
npm run setup:lfs
```

### 4. 環境変数の設定

```bash
cp .env.example .env
# .env を編集して NOTE_MCP_URL を設定
```

### 5. note-mcp の起動

```bash
# 別のターミナルで
cd /path/to/note-mcp
npm start
```

## 最初の記事を同期

### 1. 新しい記事を作成

```bash
mkdir -p articles/my-first-article/assets
```

**articles/my-first-article/index.md:**
```markdown
# 私の最初の記事

これは Cursor で書いた記事です。
```

**articles/my-first-article/meta.json:**
```json
{
  "note_id": "n/xxxxxxxx",
  "slug": "my-first-article",
  "title": "私の最初の記事",
  "status": "draft",
  "editing": {
    "location": "obsidian",
    "locked_by": "me",
    "locked_at": "2025-11-05T10:00:00+09:00",
    "version": "v0"
  },
  "versions": {},
  "sync": {}
}
```

> `note_id` は note で下書きを作成して取得するか、note-mcp で取得してください。

### 2. note へ push

```bash
npm run sync:push my-first-article
```

### 3. note で編集

ブラウザで note を開き、下書きを編集します。

### 4. Obsidian へ pull

```bash
npm run sync:pull my-first-article
```

### 5. ステータス確認

```bash
npm run sync:status my-first-article
```

出力例:
```
📄 my-first-article (v2)
  🔒 Editing location: obsidian
  📅 Locked at: 2025-11-05T10:30:00+09:00
     (5 minutes ago)
  📊 Hashes:
     Obsidian: sha256:abc123...
     note:     sha256:abc123...
```

## 日常の運用

### Cursor で執筆 → note へ自動反映

```bash
# Cursor で articles/my-article/index.md を編集
# 保存 → Obsidian Git が自動コミット

git push origin main
# → GitHub Actions が自動実行
# → note の下書きが更新される
```

### note で編集 → Obsidian へ自動反映

```bash
# ローカルで監視スクリプトを起動（任意）
npm run watch:note

# または、GitHub Actions が15分ごとに自動で pull
```

### 往復編集

```
Obsidian → note → Obsidian → note → 公開
```

何度でも往復可能です。編集場所は `meta.json` で管理されます。

## トラブルシューティング

### ロックエラー

```bash
# 強制 push（note 側の変更を破棄）
node scripts/note-sync.js push my-article --force
```

### 競合発生

```bash
# 競合ファイルを確認
cat articles/my-article/index.CONFLICT.md

# 手動マージ後
git add articles/my-article/
git commit -m "resolve: manual merge"
```

### GitHub Actions が動かない

```bash
# Secrets を設定
gh secret set NOTE_MCP_URL --body "http://localhost:3000"

# 手動実行
gh workflow run note-push.yml
```

## 次のステップ

- [同期ロジックの詳細](sync-logic.md)
- [画像処理の仕組み](image-processing.md)
- [運用のベストプラクティス](best-practices.md)

