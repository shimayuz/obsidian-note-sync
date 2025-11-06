# n8n AI Agent + MCP ワークフロー

## 🎯 概要

n8n の **AI Agent** ノードを使って MCP ツールを呼び出す方法です。これにより、**自然言語で指示を出せる**シンプルなワークフローが実現できます。

---

## ✨ メリット

| 項目 | AI Agent 方式 | 従来方式 |
|------|--------------|---------|
| **複雑さ** | ⭐ シンプル（3ノード） | ⭐⭐⭐ 複雑（6-8ノード） |
| **柔軟性** | ⭐⭐⭐ 自然言語対応 | ⭐ 固定処理 |
| **保守性** | ⭐⭐⭐ システムメッセージのみ | ⭐⭐ 各ノードを個別管理 |
| **コスト** | ⭐⭐ API コストあり | ⭐ コストなし |
| **予測可能性** | ⭐⭐ AI が判断 | ⭐⭐⭐ 完全に予測可能 |

---

## 🏗️ ワークフロー構成

```
[Webhook] 
    ↓
[AI Agent] ← [MCP Client] (note-mcp ツール)
    ↓        ↑
[OpenAI] ────┘
    ↓
[Format Output]
    ↓
[Response]
```

### ノードの役割

1. **Webhook**: リクエストを受け取る
2. **AI Agent**: 自然言語を解釈して適切なツールを選択
3. **MCP Client**: note-mcp のツールを提供
4. **OpenAI Chat Model**: AI Agent の頭脳
5. **Format Output**: レスポンスを整形
6. **Response**: 結果を返す

---

## 🚀 セットアップ

### 1. MCP Client ノードの設定

#### Credentials の作成

1. n8n で **Credentials** → **New Credential**
2. **MCP Client (HTTP Streamable)** を選択
3. 設定:
   - **Base URL**: `http://127.0.0.1:3000`
   - **Connection Type**: HTTP

#### MCP Client ノードの設定

1. **MCP Client** ノードを追加
2. **Credentials** で上記で作成した認証情報を選択
3. **Connection Type**: HTTP
4. **Base URL**: 
   - ローカル: `http://127.0.0.1:3000`
   - 独自ドメイン: `https://your-domain.com`（パス `/mcp` は自動で付与されます。実際のドメインに置き換えてください）

### 2. OpenAI Chat Model の設定

1. **OpenAI Chat Model** ノードを追加
2. **Credentials** で OpenAI API キーを設定
3. **Model**: `gpt-4o-mini`（コスト効率が良い）

### 3. AI Agent の設定

1. **AI Agent** ノードを追加
2. **System Message** を設定:

```
あなたは note.com と Obsidian の同期を管理するアシスタントです。

利用可能なツール:
- post-draft-note: note の下書きを更新
- get-note: note の記事を取得
- get-my-notes: 自分の記事一覧を取得

ユーザーからの指示に従って、適切なツールを選択して実行してください。

指示の形式:
- "push <slug>" → post-draft-note で下書きを更新
- "pull <noteId>" → get-note で記事を取得
- "list" → get-my-notes で記事一覧を取得
```

3. **Language Model** に OpenAI Chat Model を接続
4. **Tools** に MCP Client を接続

---

## 📝 使用方法

### Push（Obsidian → note）

```bash
curl -X POST http://localhost:5678/webhook/obsidian-sync \
  -H "Content-Type: application/json" \
  -d '{
    "message": "push my-article"
  }'
```

**または自然言語で**:
```bash
curl -X POST http://localhost:5678/webhook/obsidian-sync \
  -H "Content-Type: application/json" \
  -d '{
    "message": "my-article という記事を note の下書きに更新して"
  }'
```

### Pull（note → Obsidian）

```bash
curl -X POST http://localhost:5678/webhook/obsidian-sync \
  -H "Content-Type: application/json" \
  -d '{
    "message": "pull n/abc123"
  }'
```

### 記事一覧取得

```bash
curl -X POST http://localhost:5678/webhook/obsidian-sync \
  -H "Content-Type: application/json" \
  -d '{
    "message": "自分の記事一覧を取得して"
  }'
```

---

## 🎨 カスタマイズ例

### より詳細な指示

```json
{
  "message": "n/abc123 という記事を取得して、タイトルと本文を教えて"
}
```

### 複数の操作

```json
{
  "message": "自分の記事一覧を取得して、最新の3つを表示して"
}
```

### エラーハンドリング

AI Agent は自動でエラーを検知して、適切なメッセージを返します。

---

## 💰 コスト考慮

### OpenAI API コスト（概算）

| モデル | 入力 | 出力 | 1回あたり |
|--------|------|------|----------|
| **gpt-4o-mini** | $0.15/1M tokens | $0.60/1M tokens | ~$0.001 |
| **gpt-4o** | $2.50/1M tokens | $10.00/1M tokens | ~$0.01 |

**月20-30記事の場合**:
- Push: 30回 × $0.001 = **$0.03/月**
- Pull: 30回 × $0.001 = **$0.03/月**
- **合計: $0.06/月** ✨

### コスト削減のコツ

1. **gpt-4o-mini を使用**（十分に高品質）
2. **System Message を簡潔に**（トークン節約）
3. **Temperature を低く**（0.3 推奨、予測可能性向上）

---

## 🔄 従来方式との比較

### 従来方式（Execute Command）

**メリット**:
- ✅ API コストなし
- ✅ 完全に予測可能
- ✅ 高速

**デメリット**:
- ❌ 複雑なワークフロー
- ❌ エラーハンドリングが大変
- ❌ 柔軟性が低い

### AI Agent 方式

**メリット**:
- ✅ シンプル（3ノード）
- ✅ 自然言語対応
- ✅ 柔軟性が高い

**デメリット**:
- ❌ API コストあり（ただし安い）
- ❌ 予測可能性がやや低い
- ❌ 実行時間が長い（数秒）

---

## 🎯 推奨使い分け

| 用途 | 推奨方式 | 理由 |
|------|---------|------|
| **定期実行（自動化）** | Execute Command | コストなし、高速 |
| **手動実行（柔軟性重視）** | AI Agent | 自然言語で指示可能 |
| **複雑な処理** | AI Agent | AI が判断して最適化 |
| **単純な同期** | Execute Command | シンプルで確実 |

---

## 🛠️ トラブルシューティング

### MCP Client が接続できない

**確認事項**:
1. note-mcp が HTTP モードで起動しているか
2. `http://127.0.0.1:3000/health` が応答するか
3. Base URL が正しいか

**テスト**:
```bash
curl http://127.0.0.1:3000/health
```

### AI Agent がツールを選択しない

**確認事項**:
1. System Message にツールの説明があるか
2. MCP Client が正しく接続されているか
3. OpenAI API キーが有効か

**デバッグ**:
- AI Agent ノードの出力を確認
- System Message を詳しく書く

### レスポンスが遅い

**原因**:
- OpenAI API のレイテンシ（2-5秒）
- MCP ツールの実行時間

**対策**:
- gpt-4o-mini を使用（高速）
- タイムアウトを設定（30秒）

---

## 📚 関連ドキュメント

- [n8n ワークフロー詳細ガイド](n8n-workflows.md)
- [n8n セットアップガイド](n8n-setup.md)
- [アーキテクチャ概要](architecture.md)

---

## 🎉 まとめ

**AI Agent + MCP 方式**は、シンプルさと柔軟性を両立した優れたアプローチです。

**適用場面**:
- ✅ 手動実行が多い場合
- ✅ 複雑な処理が必要な場合
- ✅ 自然言語で指示したい場合

**従来方式との併用**も可能です：
- 定期実行 → Execute Command
- 手動実行 → AI Agent

用途に応じて使い分けることで、**最適な運用**が実現できます！

