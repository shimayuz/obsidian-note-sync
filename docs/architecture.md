# アーキテクチャ概要

## 🏗️ システム構成（MCP + n8n オーケストレーション）

```
┌─────────────────────────────────────────────────────────────┐
│                     Editing Environment                       │
│  ┌──────────────┐              ┌──────────────┐             │
│  │   Cursor     │◄────────────►│  Obsidian    │             │
│  └──────────────┘              └──────────────┘             │
└─────────────────────────────────────────────────────────────┘
                    │                      ▲
                    │ Git push             │ Git pull
                    ▼                      │
┌─────────────────────────────────────────────────────────────┐
│                     Git Repository                            │
│  ┌──────────────────────────────────────────────────────┐   │
│  │  articles/                                           │   │
│  │    └── my-article/                                   │   │
│  │        ├── index.md      (Markdown source)           │   │
│  │        ├── meta.json     (Sync metadata)             │   │
│  │        └── assets/       (Images - Git LFS)          │   │
│  └──────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
                    │
                    │ GitHub Actions webhook
                    ▼
┌─────────────────────────────────────────────────────────────┐
│                    n8n Orchestration                          │
│  ┌──────────────┐         ┌──────────────┐                  │
│  │ Push Webhook │         │ Pull Webhook │                  │
│  └──────┬───────┘         └──────┬───────┘                  │
│         │                        │                           │
│         │  Execute Script        │  Execute Script           │
│         ▼                        ▼                           │
│  ┌─────────────────────────────────────────┐                │
│  │      node scripts/note-sync.js          │                │
│  │         push/pull <slug>                │                │
│  └─────────────────────────────────────────┘                │
└─────────────────────────────────────────────────────────────┘
                    │
                    │ MCP Protocol (stdio/SSE)
                    ▼
┌─────────────────────────────────────────────────────────────┐
│                   MCP Client Layer                            │
│  ┌─────────────────────────────────────────┐                │
│  │  scripts/mcp-client.js                  │                │
│  │  - Spawn note-mcp process               │                │
│  │  - Handle JSON-RPC communication        │                │
│  │  - Manage request/response lifecycle    │                │
│  └─────────────────────────────────────────┘                │
└─────────────────────────────────────────────────────────────┘
                    │
                    │ JSON-RPC over stdio
                    ▼
┌─────────────────────────────────────────────────────────────┐
│                   note-mcp Server                             │
│  ┌─────────────────────────────────────────┐                │
│  │  MCP Tools:                             │                │
│  │  - note_get_draft                       │                │
│  │  - note_update_draft                    │                │
│  │  - note_upload_image                    │                │
│  └─────────────────────────────────────────┘                │
└─────────────────────────────────────────────────────────────┘
                    │
                    │ note.com API (非公式)
                    ▼
┌─────────────────────────────────────────────────────────────┐
│                      note.com                                 │
│  ┌─────────────────────────────────────────┐                │
│  │  - Drafts                               │                │
│  │  - Published Articles                   │                │
│  │  - Image CDN                            │                │
│  └─────────────────────────────────────────┘                │
└─────────────────────────────────────────────────────────────┘
```

---

## 🔄 データフロー

### 1. Obsidian → note (Push)

```
1. [Cursor] 記事を編集
     ↓
2. [Git] コミット & push
     ↓
3. [GitHub Actions] 変更を検知 → n8n webhook をトリガー
     ↓
4. [n8n] note-sync.js push を実行
     ↓
5. [mcp-client.js] note-mcp サーバーを起動
     ↓
6. [MCP Protocol] JSON-RPC リクエスト送信
     ↓
7. [note-mcp] note API 呼び出し
     ↓
8. [note.com] 下書き更新
```

### 2. note → Obsidian (Pull)

```
1. [note.com] ブラウザで編集 & 自動保存
     ↓
2. [GitHub Actions] 15分ごとに実行 → n8n webhook をトリガー
     ↓
3. [n8n] note-sync.js pull を実行
     ↓
4. [mcp-client.js] note-mcp サーバーを起動
     ↓
5. [MCP Protocol] JSON-RPC リクエスト送信
     ↓
6. [note-mcp] note API 呼び出し
     ↓
7. [note.com] 最新の下書きを取得
     ↓
8. [note-sync.js] HTML → Markdown 変換
     ↓
9. [Git] 変更をコミット & push
     ↓
10. [Obsidian] 最新版に自動更新
```

---

## 🧩 コンポーネント詳細

### 1. MCP Client (`scripts/mcp-client.js`)

**役割**: note-mcp サーバーとの通信を抽象化

**主要機能**:
- `spawn()` で note-mcp プロセスを起動
- stdio 経由で JSON-RPC メッセージを送受信
- リクエスト/レスポンスのライフサイクル管理
- タイムアウト処理（30秒）

**使用例**:
```javascript
const client = new NoteMCPClient('../note-mcp/build/index.js');
await client.connect();
const draft = await client.getDraft('n/abc123');
await client.disconnect();
```

### 2. Sync Logic (`scripts/note-sync.js`)

**役割**: 同期ロジックの実装

**主要機能**:
- **push**: Markdown → HTML 変換 → note 更新
- **pull**: note HTML 取得 → Markdown 変換
- **競合検知**: 3-way diff で衝突を検出
- **画像処理**: ローカル ⇄ CDN の変換
- **メタデータ管理**: `meta.json` の更新

### 3. n8n Workflows (`n8n/*.json`)

**役割**: GitHub Actions と MCP の橋渡し

**ワークフロー**:
- `note-sync-push.json`: Obsidian → note
- `note-sync-pull.json`: note → Obsidian

**利点**:
- 可視化された同期フロー
- エラーハンドリング・リトライ
- 通知連携（Slack, Discord）
- 実行履歴の記録

### 4. note-mcp Server

**役割**: note.com の非公式 API ラッパー

**提供ツール**:
- `note_get_draft`: 下書き取得
- `note_update_draft`: 下書き更新
- `note_upload_image`: 画像アップロード
- `note_publish`: 公開（オプション）

---

## 🔐 通信プロトコル

### MCP (Model Context Protocol)

**特徴**:
- JSON-RPC 2.0 ベース
- stdio または SSE での通信
- ツールベースのインターフェース

**リクエスト例**:
```json
{
  "jsonrpc": "2.0",
  "id": 1,
  "method": "tools/call",
  "params": {
    "name": "note_get_draft",
    "arguments": {
      "noteId": "n/abc123"
    }
  }
}
```

**レスポンス例**:
```json
{
  "jsonrpc": "2.0",
  "id": 1,
  "result": {
    "content": [
      {
        "type": "text",
        "text": "{\"title\": \"記事タイトル\", \"body\": \"<p>本文...</p>\"}"
      }
    ]
  }
}
```

---

## 🛡️ エラーハンドリング

### 1. MCP 通信エラー

```
[mcp-client.js]
  → タイムアウト（30秒）
  → プロセス起動失敗
  → JSON-RPC エラー

対処: 
  - note-mcp の起動確認
  - NOTE_MCP_PATH の確認
  - ログ確認（stderr）
```

### 2. 同期エラー

```
[note-sync.js]
  → 競合検知
  → 画像アップロード失敗
  → ロック競合

対処:
  - index.CONFLICT.md で手動解決
  - --force オプションで強制実行
  - ロック期限まで待機（10分）
```

### 3. n8n エラー

```
[n8n Workflow]
  → Webhook タイムアウト
  → スクリプト実行失敗
  → 通知送信失敗

対処:
  - n8n の実行ログ確認
  - 手動リトライ
  - GitHub Actions から再実行
```

---

## 📊 パフォーマンス

### レイテンシ

| 操作 | 時間 | 備考 |
|------|------|------|
| **Push (Obsidian → note)** | 2-5秒 | 画像なし |
| **Push (画像あり)** | 5-15秒 | 画像サイズによる |
| **Pull (note → Obsidian)** | 3-7秒 | HTML解析含む |
| **MCP 起動** | 0.5-1秒 | 初回のみ |

### スケーラビリティ

- **同時接続**: note-mcp は1プロセス = 1接続
- **並列実行**: n8n で複数記事を並列処理可能
- **レート制限**: note API のレート制限に従う

---

## 🔧 カスタマイズポイント

### 1. MCP サーバーの変更

```javascript
// 他の MCP サーバーを使用
const client = new NoteMCPClient('/path/to/other-mcp/index.js');
```

### 2. n8n ワークフローの拡張

- Slack/Discord 通知
- 画像の自動最適化
- AI による校正
- 予約公開

### 3. 同期ロジックのカスタム

```javascript
// note-sync.js の拡張
class CustomNoteSync extends NoteSync {
  async customPreprocess(markdown) {
    // カスタム前処理
  }
}
```

---

## 📚 関連ドキュメント

- [セットアップガイド](../SETUP.md)
- [n8n セットアップ](n8n-setup.md)
- [トラブルシューティング](troubleshooting.md)
- [MCP プロトコル仕様](https://github.com/anthropics/mcp)


