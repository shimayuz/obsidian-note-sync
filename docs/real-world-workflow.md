# 実用的なワークフロー

## 🎯 目標

**Obsidian ⇄ GitHub ⇄ note.com** の完全な自動同期を実現する。

---

## 🔑 核心原則

**MCP は note.com との通信にのみ使用**し、それ以外は既存の仕組みを活用する。

| 区間 | 実装方法 | 自動化 |
|------|---------|--------|
| **Obsidian ⇄ GitHub** | Obsidian Git プラグイン | ✅ 自動（5分ごと） |
| **GitHub → note.com** | GitHub Actions + n8n + MCP | ✅ 自動（push時） |
| **note.com → GitHub** | n8n + MCP + GitHub API | ✅ 自動（15分ごと） |

**MCPが不要な場合**: note API を直接叩けば、MCP なしでも動作します。

---

## 📐 完全なフロー

### フロー 1: Obsidian → note.com (Push)

```
[Cursor で執筆]
    ↓
[Obsidian に保存]
    ↓ (Obsidian Git プラグイン - 5分ごと)
[Git commit & push]
    ↓ (GitHub webhook)
[GitHub Actions]
    ↓ (HTTP POST)
[n8n: github-to-note ワークフロー]
    ├─ GitHub Raw から index.md を取得
    ├─ GitHub Raw から meta.json を取得
    ├─ Markdown → HTML 変換
    └─ MCP で note.com に送信
         ↓
[note.com 下書き更新] ✅
```

### フロー 2: note.com → Obsidian (Pull)

```
[note.com で編集]
    ↓ (自動保存)
[note.com 下書き]
    ↓ (n8n スケジュール - 15分ごと)
[n8n: note-to-github ワークフロー]
    ├─ GitHub API で meta.json 一覧を取得
    ├─ editing.location === "note" の記事を抽出
    ├─ MCP で note.com から HTML を取得
    ├─ HTML → Markdown 変換
    └─ GitHub API で index.md にコミット
         ↓
[GitHub にコミット]
    ↓ (Obsidian Git プラグイン - 自動 pull)
[Obsidian に反映] ✅
```

---

## 🛠️ 必要なコンポーネント

### 1. Obsidian Git プラグイン

**設定**:
- Auto pull: 3分ごと
- Auto commit: 5分ごと
- Commit message: `vault backup: {{date}}`

**役割**:
- Obsidian ⇄ GitHub を自動同期
- ユーザーは保存するだけ

### 2. GitHub Actions

**役割**:
- push を検知して n8n に webhook を送信
- 記事の slug を抽出して渡す

### 3. n8n ワークフロー（2つ）

#### `github-to-note.json`

**トリガー**: GitHub Actions からの webhook

**処理**:
1. GitHub Raw API からファイル取得
2. Markdown → HTML 変換
3. MCP で note.com に送信

#### `note-to-github.json`

**トリガー**: スケジュール（15分ごと）

**処理**:
1. GitHub API で記事一覧を取得
2. `editing.location === "note"` の記事を抽出
3. MCP で note.com から取得
4. HTML → Markdown 変換
5. GitHub API でコミット

### 4. note-mcp サーバー

**役割**:
- note.com API のラッパー
- MCP Protocol で提供

**使用するツール**:
- `post-draft-note`: 下書き更新
- `get-note`: 記事取得

---

## 🚀 セットアップ手順

### Step 1: Obsidian Git プラグインを設定

1. Obsidian で **Settings** → **Community Plugins**
2. **Browse** → "Obsidian Git" を検索してインストール
3. 設定:
   - **Vault backup interval**: 5（分）
   - **Auto pull interval**: 3（分）
   - **Commit message**: `vault backup: {{date}}`

### Step 2: GitHub リポジトリを準備

1. このリポジトリを GitHub にプッシュ（済み）
2. GitHub Actions を有効化
3. Secrets を設定:

```bash
gh secret set GITHUB_TOKEN --body "ghp_xxxxxxxxxxxx"
gh secret set N8N_WEBHOOK_URL --body "https://your-n8n-url.com/webhook/"
```

### Step 3: note-mcp を起動

```bash
cd /path/to/note-mcp
npm run start:http
# → http://127.0.0.1:3000
```

**本番環境**: 独自ドメインでデプロイ済み

### Step 4: n8n でワークフローをインポート

1. `n8n/github-to-note.json` をインポート
2. `n8n/note-to-github.json` をインポート
3. 各ワークフローの設定を確認:
   - MCP Server URL: `http://127.0.0.1:3000` または独自ドメイン
   - GitHub repository: `username/repo-name`
4. ワークフローをアクティブ化

### Step 5: GitHub Actions を更新

`.github/workflows/note-push.yml` を修正:

```yaml
- name: Trigger n8n workflow
  env:
    N8N_WEBHOOK_URL: ${{ secrets.N8N_WEBHOOK_URL }}
  run: |
    echo "${{ steps.changes.outputs.changed }}" | while read slug; do
      if [ -n "$slug" ]; then
        curl -X POST "${N8N_WEBHOOK_URL}/github-to-note" \
          -H "Content-Type: application/json" \
          -d "{\"slug\": \"$slug\", \"repository\": \"${{ github.repository }}\", \"branch\": \"${{ github.ref_name }}\"}"
      fi
    done
```

---

## 🧪 動作確認

### テスト 1: Obsidian → note.com

1. Cursor で記事を編集
2. Obsidian に保存
3. 5分待つ（または手動で Git push）
4. GitHub Actions が実行される
5. n8n ワークフローが実行される
6. note.com の下書きが更新される

**確認**:
```bash
# GitHub Actions のログ
gh run list

# n8n の Executions タブで確認
```

### テスト 2: note.com → Obsidian

1. note.com で下書きを編集
2. 自動保存される
3. 15分以内に n8n が実行される
4. GitHub にコミットされる
5. Obsidian が自動で pull して反映される

**確認**:
```bash
# GitHub の最新コミット
git log -1

# Obsidian でファイルを開いて確認
```

---

## 💡 MCPが不要なケース

**もし note API を直接呼び出せる場合**:

```javascript
// MCP なし版（n8n の HTTP Request ノード）
// note の下書き更新
curl -X POST https://note.com/api/v3/notes \
  -H "Cookie: _note_session_v5=xxx" \
  -H "Content-Type: application/json" \
  -d '{
    "note": {
      "name": "記事タイトル",
      "body": "<p>本文</p>"
    }
  }'
```

**MCP のメリット**:
- 認証の抽象化（Cookie管理が不要）
- エラーハンドリング
- ツールとして再利用可能

**MCP が不要な場合**:
- note API が公式にサポートされる
- 認証が簡単になる

---

## 🎯 まとめ

### 最小構成（MCP なし）

```
Obsidian Git → GitHub → GitHub Actions → note API 直接
note API → GitHub API commit → Obsidian Git pull
```

### 推奨構成（MCP あり）

```
Obsidian Git → GitHub → GitHub Actions → n8n → MCP → note.com
note.com → n8n (schedule) → MCP → GitHub API → Obsidian Git
```

**MCP の役割**:
- note.com との通信を抽象化
- 認証・エラーハンドリングを簡潔に
- 他のツールでも再利用可能

**n8n の役割**:
- GitHub ⇄ note.com の橋渡し
- Markdown ⇄ HTML 変換
- エラーハンドリング・リトライ

**Obsidian Git の役割**:
- Obsidian ⇄ GitHub を自動同期
- ユーザーは保存するだけ

---

## 📚 関連ドキュメント

- [GitHub Actions 設定](../README.md)
- [n8n ワークフロー詳細](n8n-workflows.md)
- [Obsidian Git プラグイン設定](obsidian-git-setup.md)

---

**これで Obsidian ⇄ note.com の完全な往復編集が実現します！**

