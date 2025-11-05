# n8n セットアップガイド

## 🎯 概要

n8n は **オーケストレーションレイヤー**として機能し、GitHub Actions と note-mcp を橋渡しします。

---

## 📋 前提条件

- Node.js 18+
- note-mcp が動作している
- このリポジトリがクローン済み

---

## 🚀 インストール（3つの選択肢）

### オプション A: Docker（推奨）

```bash
# Docker Compose でn8n を起動
docker run -it --rm \
  --name n8n \
  -p 5678:5678 \
  -v ~/.n8n:/home/node/.n8n \
  n8nio/n8n
```

**アクセス**: http://localhost:5678

### オプション B: npm

```bash
npm install -g n8n
n8n start
```

### オプション C: npx（一時使用）

```bash
npx n8n
```

---

## 🔧 初期設定

### 1. n8n にアクセス

```
http://localhost:5678
```

### 2. アカウント作成

初回アクセス時にアカウントを作成します。

---

## 📥 ワークフローのインポート

### 1. Push ワークフロー

1. n8n で **New Workflow** をクリック
2. 右上の **...** → **Import from File**
3. `n8n/note-sync-push.json` を選択
4. **Import** をクリック

### 2. Pull ワークフロー

同様に `n8n/note-sync-pull.json` をインポート

---

## ⚙️ ワークフローの設定

### Push ワークフロー (`note-sync-push`)

#### 1. Webhook ノードを設定

- **HTTP Method**: POST
- **Path**: `obsidian-push`
- **Authentication**: None（または Basic Auth）

**Webhook URL**:
```
http://localhost:5678/webhook/obsidian-push
```

#### 2. Execute Command ノードを設定

- **Command**: 
```bash
cd /Users/heavenlykiss0820/note-obsidian && \
node scripts/note-sync.js push {{ $json.slug }}
```

> 📝 **注意**: `/Users/heavenlykiss0820/note-obsidian` を**あなたのパス**に変更してください。

#### 3. Response ノードを設定

- **Respond With**: JSON
- **Response Body**:
```json
{
  "success": true,
  "slug": "={{ $json.slug }}",
  "timestamp": "={{ $now }}"
}
```

### Pull ワークフロー (`note-sync-pull`)

#### 1. Webhook ノードを設定

- **Path**: `note-pull`

**Webhook URL**:
```
http://localhost:5678/webhook/note-pull
```

#### 2. Execute Command ノードを設定

- **Command**:
```bash
cd /Users/heavenlykiss0820/note-obsidian && \
node scripts/note-sync.js pull {{ $json.slug }}
```

#### 3. If ノードで競合チェック

- **Condition**: `{{ $json.conflicts }}` equals `true`

#### 4. Notify ノード（オプション）

Slack または Discord への通知を設定:

**Slack の場合**:
- **Channel**: `#dev-notifications`
- **Message**: `⚠️ Conflict detected in {{ $json.slug }}`

---

## 🧪 動作確認

### 1. Webhook のテスト（Push）

```bash
curl -X POST http://localhost:5678/webhook/obsidian-push \
  -H "Content-Type: application/json" \
  -d '{"slug": "test-article"}'
```

**期待される結果**:
```json
{
  "success": true,
  "slug": "test-article",
  "timestamp": "2025-11-05T10:30:00Z"
}
```

### 2. Webhook のテスト（Pull）

```bash
curl -X POST http://localhost:5678/webhook/note-pull \
  -H "Content-Type: application/json" \
  -d '{"slug": "test-article"}'
```

---

## 🔐 GitHub Actions との連携

### 1. n8n を公開

n8n をインターネットに公開する必要があります（GitHub Actions からアクセスできるように）。

#### オプション A: ngrok（開発用）

```bash
ngrok http 5678
```

**Webhook URL**: `https://xxxx.ngrok.io/webhook/`

#### オプション B: Cloudflare Tunnel（本番推奨）

```bash
cloudflared tunnel --url http://localhost:5678
```

#### オプション C: n8n Cloud

n8n Cloud を使用すれば、自動で公開されます。

### 2. GitHub Secrets を設定

```bash
gh secret set N8N_WEBHOOK_URL --body "https://your-n8n-url.com/webhook/"
```

---

## 🛠️ カスタマイズ

### 通知の追加（Slack）

1. **Slack ノード**を追加
2. **Connection** で Slack Workspace を連携
3. **Channel** を選択
4. **Message** を設定:

```
📝 Article updated: {{ $json.slug }}
Version: {{ $json.version }}
```

### 通知の追加（Discord）

1. **HTTP Request ノード**を追加
2. **Method**: POST
3. **URL**: Discord Webhook URL
4. **Body**:

```json
{
  "content": "📝 Article updated: {{ $json.slug }}"
}
```

### 画像の自動最適化

1. **Execute Command ノード**を追加
2. **Command**:

```bash
cd /Users/heavenlykiss0820/note-obsidian && \
node scripts/optimize-image.js articles/{{ $json.slug }}/assets/*
```

---

## 📊 n8n の監視

### 実行履歴の確認

1. n8n で **Executions** タブを開く
2. 各実行の詳細を確認（成功/失敗、実行時間）

### エラーハンドリング

1. **Error Trigger** ノードを追加
2. エラー時に通知を送信

**設定例**:
```
Workflow: note-sync-push
Trigger: On Error
Action: Send Slack notification
```

---

## 🐛 トラブルシューティング

### Webhook が応答しない

```bash
# n8n が起動しているか確認
curl http://localhost:5678/healthz

# ワークフローがアクティブか確認
# n8n の UI でワークフローを開き、右上の Toggle をONに
```

### スクリプト実行エラー

```bash
# パスを確認
which node
# → /usr/local/bin/node

# n8n の Execute Command で絶対パスを使用
/usr/local/bin/node /path/to/note-sync.js push test-article
```

### GitHub Actions から接続できない

```bash
# ngrok のステータス確認
curl https://xxxx.ngrok.io/webhook/obsidian-push

# GitHub Secrets を確認
gh secret list
```

---

## 💡 ベストプラクティス

### 1. 環境ごとに設定を分ける

```bash
# 開発環境
N8N_WEBHOOK_URL=http://localhost:5678/webhook/

# 本番環境
N8N_WEBHOOK_URL=https://n8n.your-domain.com/webhook/
```

### 2. リトライロジックを追加

n8n の **Error Workflow** 機能を使用:
- 1回目: 即座にリトライ
- 2回目: 5分後
- 3回目: 30分後
- 失敗時: 通知送信

### 3. ログの保存

**File ノード**を追加して実行ログを保存:

```json
{
  "timestamp": "={{ $now }}",
  "slug": "={{ $json.slug }}",
  "status": "={{ $json.success ? 'success' : 'failed' }}"
}
```

保存先: `/var/log/n8n/sync-log.jsonl`

---

## 🚀 本番運用

### n8n のデプロイ先

| サービス | 特徴 | 推奨 |
|---------|------|------|
| **n8n Cloud** | マネージド、自動スケール | ✅ 本番推奨 |
| **Railway** | 簡単デプロイ、無料枠あり | ✅ 小規模 |
| **Fly.io** | グローバルエッジ展開 | ✅ 中規模 |
| **Docker** | 自前サーバー | オンプレ |

### n8n Cloud の場合

1. https://n8n.io/ でアカウント作成
2. ワークフローをインポート
3. Webhook URL を GitHub Secrets に設定

```bash
gh secret set N8N_WEBHOOK_URL --body "https://your-instance.n8n.cloud/webhook/"
```

---

## 📚 関連ドキュメント

- [アーキテクチャ概要](architecture.md)
- [トラブルシューティング](troubleshooting.md)
- [n8n 公式ドキュメント](https://docs.n8n.io/)

