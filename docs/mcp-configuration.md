# MCP サーバー設定ガイド

## 🌐 接続方法

note-mcp サーバーは **HTTP/SSE モード**で動作し、以下の2つの方法で接続できます：

### 1. ローカル接続

**URL**: `http://127.0.0.1:3000`

**用途**: 開発・テスト環境

**起動方法**:
```bash
cd /path/to/note-mcp
npm run start:http
```

### 2. 独自ドメイン接続

**URL**: `https://your-domain.com/mcp`（実際のドメインに置き換えてください）

**用途**: 本番環境、GitHub Actions など外部からのアクセス

**設定例**:
- **Base URL**: `https://your-domain.com`
- **MCP Endpoint**: `/mcp`（自動で付与される）
- **Health Check**: `https://your-domain.com/health`

---

## 🔧 n8n での設定

### MCP Client Credentials の設定

1. n8n で **Credentials** → **New Credential**
2. **MCP Client (HTTP Streamable)** を選択
3. 設定:

| 項目 | ローカル | 独自ドメイン |
|------|---------|------------|
| **Base URL** | `http://127.0.0.1:3000` | `https://your-domain.com` |
| **Connection Type** | HTTP | HTTP |

**注意**: 
- Base URL には `/mcp` パスを含めない（n8n が自動で付与）
- HTTPS を使用する場合、SSL 証明書が有効であることを確認

---

## 🔍 接続確認

### ヘルスチェック

**ローカル**:
```bash
curl http://127.0.0.1:3000/health
```

**独自ドメイン**:
```bash
curl https://your-domain.com/health
```

**期待される結果**:
```json
{
  "status": "ok",
  "version": "2.0.0"
}
```

### MCP ツール呼び出しテスト

**ローカル**:
```bash
curl -X POST http://127.0.0.1:3000/mcp \
  -H "Content-Type: application/json" \
  -d '{
    "jsonrpc": "2.0",
    "id": 1,
    "method": "tools/list"
  }'
```

**独自ドメイン**:
```bash
curl -X POST https://your-domain.com/mcp \
  -H "Content-Type: application/json" \
  -d '{
    "jsonrpc": "2.0",
    "id": 1,
    "method": "tools/list"
  }'
```

**期待される結果**:
```json
{
  "jsonrpc": "2.0",
  "id": 1,
  "result": {
    "tools": [
      {
        "name": "post-draft-note",
        "description": "note の下書きを更新"
      },
      ...
    ]
  }
}
```

---

## 🔐 環境変数の設定

### .env ファイル

```bash
# ローカル開発
NOTE_MCP_URL=http://127.0.0.1:3000

# 本番環境（独自ドメイン）
NOTE_MCP_URL=https://your-domain.com/mcp
```

### GitHub Secrets

GitHub Actions からアクセスする場合:

```bash
# Secrets に設定（実際のドメインに置き換えてください）
gh secret set NOTE_MCP_URL --body "https://your-domain.com/mcp"
```

---

## 🛡️ セキュリティ考慮事項

### HTTPS の使用

独自ドメインを使用する場合、**必ず HTTPS を有効化**してください：

- SSL/TLS 証明書が必要
- Let's Encrypt を使用する場合: Certbot など
- 証明書の自動更新を設定

### アクセス制限

必要に応じて以下の対策を検討：

1. **IP ホワイトリスト**: GitHub Actions IP 範囲のみ許可
2. **Basic Auth**: n8n の Credentials で設定可能
3. **API Key**: カスタム認証ヘッダー

### CORS 設定

note-mcp サーバー側で CORS を適切に設定：

```javascript
// note-mcp サーバー設定例
app.use(cors({
  origin: [
    'https://your-n8n-instance.com',
    'http://localhost:5678'  // ローカル開発
  ],
  credentials: true
}));
```

---

## 🐛 トラブルシューティング

### 接続エラー

**症状**: `Connection refused` または `timeout`

**確認事項**:
1. note-mcp サーバーが起動しているか
2. URL が正しいか（`/mcp` パスを含めるか確認）
3. ファイアウォール/セキュリティグループの設定

**デバッグ**:
```bash
# DNS 解決確認
nslookup your-domain.com

# ポート確認（実際のドメインに置き換えてください）
curl -v https://your-domain.com/health
```

### SSL 証明書エラー

**症状**: `SSL certificate problem` または `self-signed certificate`

**解決方法**:
1. 有効な SSL 証明書を使用
2. n8n の MCP Client で `verifySSL` を `false` に設定（開発環境のみ）

### CORS エラー

**症状**: `CORS policy` エラー

**解決方法**:
1. note-mcp サーバー側で CORS を設定
2. n8n のドメインを許可リストに追加

---

## 📚 関連ドキュメント

- [n8n AI Agent ガイド](n8n-ai-agent.md)
- [n8n ワークフロー詳細](n8n-workflows.md)
- [アーキテクチャ概要](architecture.md)

---

## ✅ チェックリスト

### ローカル開発環境

- [ ] note-mcp を `npm run start:http` で起動
- [ ] `http://127.0.0.1:3000/health` が応答する
- [ ] n8n の MCP Client で `http://127.0.0.1:3000` を設定

### 本番環境（独自ドメイン）

- [ ] DNS が正しく設定されている
- [ ] SSL 証明書が有効
- [ ] `https://your-domain.com/health` が応答する
- [ ] n8n の MCP Client で `https://your-domain.com` を設定
- [ ] ファイアウォール/セキュリティグループでポートが開放されている
- [ ] CORS が適切に設定されている

---

## 🎯 推奨構成

### 開発環境

```
note-mcp: http://127.0.0.1:3000
n8n: http://localhost:5678
```

### 本番環境

```
note-mcp: https://your-domain.com/mcp（実際のドメインに置き換えてください）
n8n: https://your-n8n-instance.com（または n8n Cloud）
GitHub Actions: secrets.NOTE_MCP_URL
```

---

**設定完了後、必ずヘルスチェックと MCP ツール呼び出しテストを実行してください！**

