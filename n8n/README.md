# n8n ワークフロー

このディレクトリには、Obsidian ⇄ note.com 同期のための n8n ワークフローが含まれています。

## 📋 ワークフロー一覧

### AI Agent 方式（推奨）

| ファイル | 説明 | ノード数 |
|---------|------|---------|
| `note-sync-simple-ai-agent.json` | ⭐ シンプル版（3ノード） | 3 |
| `note-sync-push-ai-agent.json` | 実用版（記事データ取得含む） | 5-7 |
| `note-sync-ai-agent.json` | 汎用版 | 3-4 |

### Execute Command 方式

| ファイル | 説明 | ノード数 |
|---------|------|---------|
| `note-sync-push-complete.json` | スクリプト実行版 | 4-5 |
| `note-sync-push-execute-tool.json` | MCP ツール直接呼び出し | 5-6 |
| `note-sync-pull-execute-tool.json` | Pull ワークフロー | 6-7 |

---

## ⚙️ インポート前の設定

### 1. MCP サーバーの URL を確認

ワークフローファイルにはデフォルトで `http://127.0.0.1:3000` が設定されています。

**独自ドメインを使用する場合**、インポート後に以下を変更してください：

#### AI Agent 方式のワークフロー

1. **MCP Client** ノードを開く
2. **Base URL** を変更:
   - ローカル: `http://127.0.0.1:3000`
   - 独自ドメイン: `https://your-domain.com`（実際のドメインに置き換えてください）

#### Execute Command 方式のワークフロー

1. **HTTP Request** ノードを開く
2. **URL** を変更:
   - ローカル: `http://127.0.0.1:3000/mcp`
   - 独自ドメイン: `https://your-domain.com/mcp`（実際のドメインに置き換えてください）

### 2. パスの確認

**Execute Command** ノードを含むワークフローでは、以下のパスを変更してください：

```bash
# デフォルト
cd /Users/heavenlykiss0820/note-obsidian && node scripts/note-sync.js ...

# あなたの環境に合わせて変更
cd /path/to/your/note-obsidian && node scripts/note-sync.js ...
```

---

## 🚀 インポート手順

1. n8n を開く（`http://localhost:5678`）
2. **New Workflow** → **...** → **Import from File**
3. ワークフローファイルを選択
4. インポート後、上記の設定を確認・変更
5. ワークフローをアクティブ化（右上の Toggle を ON）

---

## 📚 詳細ドキュメント

- [AI Agent ワークフローガイド](../docs/n8n-ai-agent.md)
- [n8n ワークフロー詳細](../docs/n8n-workflows.md)
- [MCP サーバー設定](../docs/mcp-configuration.md)

---

## 🔍 動作確認

### ヘルスチェック

```bash
# ローカル
curl http://127.0.0.1:3000/health

# 独自ドメイン（実際のドメインに置き換えてください）
curl https://your-domain.com/health
```

### ワークフローのテスト

```bash
# AI Agent 方式
curl -X POST http://localhost:5678/webhook/note-sync \
  -H "Content-Type: application/json" \
  -d '{"message": "list my notes"}'

# Execute Command 方式
curl -X POST http://localhost:5678/webhook/obsidian-push \
  -H "Content-Type: application/json" \
  -d '{"slug": "test-article"}'
```

---

## ⚠️ 注意事項

- ワークフローファイルは**テンプレート**です
- インポート後、必ず**あなたの環境に合わせて設定を変更**してください
- MCP サーバーの URL は環境変数 `NOTE_MCP_URL` で管理することも可能です

---

**設定完了後、必ずテスト実行で動作確認をしてください！**

