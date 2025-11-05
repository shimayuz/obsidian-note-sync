# Obsidian ↔ note 同期システム

Obsidian（2nd draft）とnote（Final draft）間の双方向同期システム。Git中心アーキテクチャで競合検知・バージョン管理を実現。

## 🏗️ アーキテクチャ

```
[Cursor] 1st → [Obsidian] 2nd ──► (push) ──► [note] Final
                                 ▲                         │
                                 │  (pull)                 │
                                 │  (GitHub Actions)       ▼
                           [Obsidian] Final（同期反映 & ローカル画像）
```

## 📁 ディレクトリ構造

```
/articles/
  /<slug>/
    index.md          # Markdown本文
    meta.json         # メタデータ（編集ロック、バージョン、ハッシュ）
    *.CONFLICT.md     # 競合時（手動解決用）

/assets/
  /images/            # Content-addressable画像ストレージ
    /<hash-prefix>/
      <hash>.jpg

._backup/             # バックアップファイル
```

## 🚀 クイックスタート

### 1. 環境変数の設定

```bash
# .env を作成（.env.exampleを参考に）
cp .env.example .env

# 必要な環境変数を設定
NOTE_MCP_SERVER_URL=http://localhost:3001
NOTE_SESSION_COOKIE=your-note-session-cookie
```

### 2. 依存関係のインストール

```bash
pnpm install
pnpm build
```

### 3. 記事の初期化

```bash
# 新規記事のディレクトリとmeta.jsonを作成
mkdir -p articles/my-article
cat > articles/my-article/meta.json <<EOF
{
  "note_id": "n/xxxxxxxx",
  "slug": "my-article",
  "title": "記事タイトル",
  "status": "draft",
  "editing": {
    "location": "obsidian",
    "version": "v1"
  },
  "versions": {
    "hash": {
      "obsidian": "",
      "note": ""
    }
  },
  "sync": {
    "conflicts": []
  }
}
EOF
```

### 4. 基本的な使い方

```bash
# Obsidian → note へpush（下書き更新）
pnpm sync:push my-article

# note → Obsidian へpull（公開版取得）
pnpm sync:pull my-article

# ステータス確認
pnpm sync:status my-article

# 全記事の同期状態確認
pnpm sync:check
```

## 📋 コマンドリファレンス

### `pnpm sync:push <slug>`

Obsidian側のMarkdownをnoteの下書きに反映します。

**オプション:**
- `--force`: ロックを無視して強制push
- `--dry-run`: 実行せず確認のみ
- `--check-lock`: ロックチェックを有効化（デフォルト）

**例:**
```bash
pnpm sync:push my-article
pnpm sync:push my-article --force  # ロック無視
```

### `pnpm sync:pull <slug>`

note側の下書き/公開記事をObsidianに取得します。

**オプション:**
- `--force`: 競合があっても強制pull
- `--dry-run`: 実行せず確認のみ

**例:**
```bash
pnpm sync:pull my-article
```

### `pnpm sync:status <slug>`

記事の同期状態を表示します。

**出力例:**
```
📄 my-article (v3)
  ✏️ Editing location: obsidian
  📅 Locked at: 2025-11-05T10:30:00+09:00 (5 minutes ago)
  📊 Hashes:
    Obsidian: sha256:abc...
    note:     sha256:def...
    Local:    sha256:abc...
```

### `pnpm sync:check`

全記事の同期状態を一括確認します。

**出力例:**
```
✓ article-1 (v2, synced)
✓ article-2 (v1, synced)
⚠️  article-3 (v3, diverged: note has newer changes)
🔒 article-4 (v2, locked by note)
```

## 🔄 運用フロー

### 標準的な執筆フロー

1. **Cursorで1st draft作成**
   ```bash
   # articles/my-article/index.md を作成・編集
   # 保存するとGitに自動コミット
   ```

2. **Obsidianで2nd draft編集**
   ```bash
   # 同じファイルをObsidianで開いて編集
   ```

3. **noteへpush**
   ```bash
   pnpm sync:push my-article
   # → noteの下書きが更新される
   # → editing.location = "note" に変更
   ```

4. **noteでFinal draft編集・公開**
   ```
   # ブラウザでnoteを開いて編集・公開
   ```

5. **公開版をpull（GitHub Actionsで自動実行）**
   ```bash
   # .github/workflows/note-pull.yml が毎時実行
   # または手動実行:
   pnpm sync:pull my-article
   # → ObsidianにFinal版が反映される
   # → editing.location = "obsidian" に変更
   ```

### 往復編集フロー

```bash
# 1. Obsidian → note
pnpm sync:push my-article

# 2. noteで編集（ブラウザ）

# 3. note → Obsidian
pnpm sync:pull my-article

# 4. Cursorで再編集
# articles/my-article/index.md を編集

# 5. 再度push
pnpm sync:push my-article

# 繰り返し可能
```

## 🛡️ 競合検知・ロック機能

### 編集ロック

- **ロック期間**: 10分（デフォルト）
- **ロック条件**: `editing.location = "note"` の場合、Obsidianからのpushはブロック
- **強制上書き**: `--force` オプションでロックを無視可能

### 競合検知

- **3-way diff**: ベース、Obsidian版、note版を比較
- **自動マージ**: 変更箇所が重複しない場合は自動マージ
- **手動解決**: 競合時は `index.CONFLICT.md` が生成される

### 競合解決

```bash
# 1. 競合ファイルを確認
cat articles/my-article/index.CONFLICT.md

# 2. 手動で解決（Obsidian版またはnote版を選択）

# 3. 解決後、再度pull
pnpm sync:pull my-article --force
```

## 📊 GitHub Actions

### 自動pull（毎時実行）

`.github/workflows/note-pull.yml` が毎時15分に実行され、noteから最新版を取得します。

**手動実行:**
```bash
# GitHub ActionsのUIから "Run workflow" をクリック
# または特定の記事のみ:
# - slug: my-article を入力
```

### 競合時のPR作成

競合が検出された場合、自動的にPRが作成されます。

## 🔧 設定

### meta.json の構造

```json
{
  "note_id": "n/xxxxxxxx",
  "slug": "my-article",
  "title": "記事タイトル",
  "status": "draft",
  "editing": {
    "location": "obsidian",
    "locked_by": "user@local",
    "locked_at": "2025-11-05T10:30:00+09:00",
    "version": "v3"
  },
  "versions": {
    "git_commit": "a1b2c3d4",
    "note_revision": "2025-11-05T10:25:00+09:00",
    "hash": {
      "obsidian": "sha256:abc...",
      "note": "sha256:def..."
    }
  },
  "sync": {
    "last_push": "2025-11-05T10:20:00+09:00",
    "last_pull": "2025-11-05T10:25:00+09:00",
    "conflicts": []
  }
}
```

## 🖼️ 画像管理

### Content-addressable Storage

画像はハッシュベースで保存され、重複が自動的に排除されます。

```
/assets/images/
  /ab/           # ハッシュの先頭2文字でディレクトリ分割
    abc123.jpg
  /cd/
    cdef456.png
```

### 画像の同期

- **note → Obsidian**: 画像は自動的にダウンロードされ、ローカルストレージに保存
- **Obsidian → note**: 画像は事前にnoteにアップロード済みと仮定（TODO: 自動アップロード機能）

## 📝 関連リポジトリ

- [note-mcp](https://github.com/your-username/note-mcp): note非公式APIクライアント（MCP）

## 🐛 トラブルシューティング

### ロックが解除されない

```bash
# ロックを強制的に解除（注意して使用）
# meta.json の editing.locked_at を削除または古い日時に変更
```

### 競合が解決できない

```bash
# 1. 競合ファイルを確認
cat articles/my-article/index.CONFLICT.md

# 2. どちらかの版を選択して手動マージ

# 3. 強制pull
pnpm sync:pull my-article --force
```

### note-mcpサーバーに接続できない

```bash
# 環境変数を確認
echo $NOTE_MCP_SERVER_URL

# note-mcp-http-wrapperが起動しているか確認
curl http://localhost:3001/health
```

## 📄 ライセンス

ISC
