# n8n ワークフロー詳細ガイド

## 📋 利用可能なワークフロー

### 0. **Obsidian → note Push (AI Agent)** (`note-sync-push-ai-agent.json`) ⭐ **新方式**

**推奨**: ✅✅✅ **最もシンプルで柔軟**

**特徴**:
- AI Agent が自動で MCP ツールを選択・実行
- 自然言語で指示可能
- 3-5ノードで完結

**動作**:
1. Webhook で `slug` を受け取る
2. 記事データを取得（Markdown + メタデータ）
3. AI Agent に渡して、MCP ツールを実行
4. 結果を返す

**使用方法**:
```bash
curl -X POST http://localhost:5678/webhook/obsidian-push-ai \
  -H "Content-Type: application/json" \
  -d '{"slug": "my-article"}'
```

**メリット**:
- ✅ シンプル（AI Agent が判断）
- ✅ 柔軟性が高い
- ✅ エラーハンドリングが自動

**デメリット**:
- ⚠️ OpenAI API コストがかかる（$0.001/回程度）
- ⚠️ 実行時間が長い（2-5秒）

**詳細**: [AI Agent ワークフローガイド](n8n-ai-agent.md)

---

### 1. **Obsidian → note Push (Complete)** (`note-sync-push-complete.json`)

**推奨**: ✅ 確実で高速（コストなし）

**動作**:
1. Webhook で `slug` を受け取る
2. `note-sync.js push` を実行
3. 結果を返す

**使用方法**:
```bash
curl -X POST http://localhost:5678/webhook/obsidian-push \
  -H "Content-Type: application/json" \
  -d '{"slug": "my-article"}'
```

**メリット**:
- シンプルで理解しやすい
- エラーハンドリングが簡単
- デバッグしやすい

---

### 2. **Obsidian → note Push (Execute Tool)** (`note-sync-push-execute-tool.json`)

**用途**: MCP の Execute Tool を直接呼び出したい場合

**動作**:
1. Webhook で `slug`, `title`, `body` を受け取る
2. MCP の `post-draft-note` ツールを直接呼び出し
3. 結果を返す

**使用方法**:
```bash
curl -X POST http://localhost:5678/webhook/obsidian-push \
  -H "Content-Type: application/json" \
  -d '{
    "slug": "n/abc123",
    "title": "記事タイトル",
    "body": "<p>本文...</p>"
  }'
```

**メリット**:
- MCP ツールを直接使用
- カスタマイズしやすい
- 画像アップロードなど追加処理が可能

**デメリット**:
- 記事内容を事前に取得する必要がある
- Markdown → HTML 変換が必要

---

### 3. **note → Obsidian Pull (Execute Tool)** (`note-sync-pull-execute-tool.json`)

**動作**:
1. Webhook で `noteId` を受け取る
2. MCP の `get-note` ツールを呼び出し
3. レスポンスを処理
4. `note-sync.js pull` を実行
5. 結果を返す

**使用方法**:
```bash
curl -X POST http://localhost:5678/webhook/note-pull \
  -H "Content-Type: application/json" \
  -d '{"noteId": "n/abc123"}'
```

---

## 🔧 ワークフローのインポート

### 1. n8n を開く

```
http://localhost:5678
```

### 2. ワークフローをインポート

1. **New Workflow** をクリック
2. 右上の **...** → **Import from File**
3. `n8n/note-sync-push-complete.json` を選択
4. **Import** をクリック

### 3. パスを修正

**Execute Sync Script ノード**を開き、パスを修正:

```bash
# デフォルト
cd /Users/heavenlykiss0820/note-obsidian && node scripts/note-sync.js push {{ $json.slug }}

# あなたの環境に合わせて修正
cd /path/to/your/note-obsidian && node scripts/note-sync.js push {{ $json.slug }}
```

### 4. ワークフローをアクティブ化

右上の **Toggle** をクリックして **ON** にする

---

## 🧪 テスト方法

### Push ワークフローのテスト

```bash
# 1. note-mcp を起動
cd /path/to/note-mcp
npm run start:http

# 2. n8n を起動
n8n start

# 3. テスト実行
curl -X POST http://localhost:5678/webhook/obsidian-push \
  -H "Content-Type: application/json" \
  -d '{"slug": "test-article"}'
```

**期待される結果**:
```json
{
  "success": true,
  "slug": "test-article",
  "message": "Pushed successfully"
}
```

---

## 🔗 GitHub Actions との連携

### 1. n8n を公開

**ngrok（開発用）**:
```bash
ngrok http 5678
# → https://xxxx.ngrok.io
```

**n8n Cloud（本番）**:
- https://n8n.io/ でアカウント作成
- ワークフローをインポート
- 自動で公開される

### 2. GitHub Secrets を設定

```bash
gh secret set N8N_WEBHOOK_URL --body "https://your-n8n-url.com/webhook/"
```

### 3. GitHub Actions の確認

`.github/workflows/note-push.yml` で:

```yaml
- name: Push to note (via n8n)
  env:
    N8N_WEBHOOK_URL: ${{ secrets.N8N_WEBHOOK_URL }}
  run: |
    curl -X POST "${N8N_WEBHOOK_URL}/obsidian-push" \
      -H "Content-Type: application/json" \
      -d "{\"slug\": \"$slug\"}"
```

---

## 🎨 カスタマイズ例

### 通知を追加（Slack）

1. **Slack ノード**を追加
2. **Connection** で Slack を連携
3. **Channel**: `#dev-notifications`
4. **Message**:

```
📝 Article pushed: {{ $json.slug }}
Status: {{ $json.success ? '✅ Success' : '❌ Failed' }}
```

### リトライロジック

1. **Error Trigger** ノードを追加
2. **Retry** ノードを追加
3. **設定**:
   - Max Retries: 3
   - Retry Interval: 5 seconds

### 画像の自動最適化

1. **Execute Command** ノードを追加
2. **Command**:

```bash
cd /path/to/note-obsidian && \
node scripts/optimize-image.js articles/{{ $json.slug }}/assets/*
```

---

## 🐛 トラブルシューティング

### Webhook が応答しない

**確認事項**:
1. ワークフローがアクティブか（Toggle が ON）
2. Webhook のパスが正しいか
3. n8n が起動しているか

**デバッグ**:
```bash
# n8n のログを確認
docker logs n8n

# または
tail -f ~/.n8n/logs/n8n.log
```

### Execute Command が失敗する

**確認事項**:
1. パスが正しいか
2. 環境変数が設定されているか
3. note-mcp が起動しているか

**デバッグ**:
- n8n の **Executions** タブで実行ログを確認
- **Execute Command** ノードの出力を確認

### MCP ツールが呼び出せない

**確認事項**:
1. note-mcp が HTTP モードで起動しているか
2. `http://127.0.0.1:3000/health` が応答するか
3. `http://127.0.0.1:3000/mcp` が応答するか

**テスト**:
```bash
curl -X POST http://127.0.0.1:3000/mcp \
  -H "Content-Type: application/json" \
  -d '{
    "jsonrpc": "2.0",
    "id": 1,
    "method": "tools/call",
    "params": {
      "name": "get-note",
      "arguments": {
        "noteId": "n/example"
      }
    }
  }'
```

---

## 📊 実行履歴の確認

### n8n の Executions タブ

1. n8n で **Executions** タブを開く
2. 各実行の詳細を確認:
   - 成功/失敗
   - 実行時間
   - 入力/出力データ
   - エラーメッセージ

### ログの保存

**File ノード**を追加して実行ログを保存:

```json
{
  "timestamp": "={{ $now }}",
  "slug": "={{ $json.slug }}",
  "status": "={{ $json.success ? 'success' : 'failed' }}",
  "executionId": "={{ $execution.id }}"
}
```

保存先: `/var/log/n8n/sync-log.jsonl`

---

## 🚀 本番運用

### n8n Cloud の場合

1. https://n8n.io/ でアカウント作成
2. ワークフローをインポート
3. **Settings** → **Webhooks** で Webhook URL を確認
4. GitHub Secrets に設定

### セキュリティ

**Basic Auth を有効化**:
1. **Webhook** ノードを開く
2. **Authentication** → **Basic Auth**
3. ユーザー名・パスワードを設定
4. GitHub Actions で:

```bash
curl -X POST "${N8N_WEBHOOK_URL}/obsidian-push" \
  -u "username:password" \
  -H "Content-Type: application/json" \
  -d "{\"slug\": \"$slug\"}"
```

---

## 📚 関連ドキュメント

- [n8n セットアップガイド](n8n-setup.md)
- [アーキテクチャ概要](architecture.md)
- [トラブルシューティング](troubleshooting.md)


