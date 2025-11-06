# 完全ガイド: Obsidian ⇄ note.com 自動同期

## 🎯 目標

**完全自動化**: ユーザーは **保存するだけ** で、Obsidian ⇄ note.com が自動で同期される。

---

## 📐 アーキテクチャ

```
┌──────────────┐
│   Obsidian   │ ← ユーザーはここで執筆・編集
│  (編集環境)  │
└──────┬───────┘
       │ Obsidian Git プラグイン（5分ごと自動）
       ▼
┌──────────────┐
│   GitHub     │ ← Git が真実の源泉
│ (Git Repo)   │
└──┬────────┬──┘
   │        │
   │ push   │ webhook
   ▼        ▼
   │   ┌────────────┐
   │   │ GitHub     │
   │   │ Actions    │
   │   └──────┬─────┘
   │          │ HTTP POST
   │          ▼
   │   ┌────────────┐
   │   │    n8n     │ ← オーケストレーション
   │   │ Workflow   │
   │   └──────┬─────┘
   │          │ MCP Protocol
   │          ▼
   │   ┌────────────┐
   │   │  note-mcp  │ ← note API ラッパー
   │   │   Server   │
   │   └──────┬─────┘
   │          │ note API
   │          ▼
   └───────► ┌────────────┐
             │  note.com  │ ← 公開プラットフォーム
             │  (下書き)  │
             └────────────┘
```

---

## 🔄 完全フロー

### Push（Obsidian → note.com）

```
1. Cursor で articles/my-article/index.md を編集
     ↓
2. 保存（Cmd+S）
     ↓ Obsidian Git プラグイン（5分ごと）
3. Git commit & push
     ↓ GitHub Actions（自動トリガー）
4. n8n webhook 呼び出し
     ↓ n8n: github-to-note ワークフロー
5. GitHub Raw API でファイル取得
   ├─ index.md
   └─ meta.json
     ↓
6. Markdown → HTML 変換
     ↓ MCP Protocol
7. note-mcp 経由で note API 呼び出し
     ↓
8. note.com 下書き更新 ✅
```

**所要時間**: 5-10分（Obsidian Git の自動コミット待ち含む）

### Pull（note.com → Obsidian）

```
1. note.com で下書きを編集
     ↓ 自動保存
2. note.com 下書き保存
     ↓ n8n スケジュール（15分ごと）
3. n8n: note-to-github ワークフロー起動
     ↓
4. GitHub API で meta.json 取得
   → editing.location === "note" の記事を抽出
     ↓ MCP Protocol
5. note-mcp 経由で note API 呼び出し
   → HTML を取得
     ↓
6. HTML → Markdown 変換
     ↓ GitHub API
7. GitHub に commit
     ↓ Obsidian Git プラグイン（3分ごと）
8. Obsidian に pull ✅
```

**所要時間**: 15-20分（最大）

---

## 🎯 核心機能

### MCP の役割

**MCP は note.com との通信にのみ使用**:
- `post-draft-note`: 下書き更新
- `get-note`: 記事取得

**MCPなしでも動く**: note API を直接叩けば MCP は不要

### n8n の役割

1. GitHub ⇄ note.com の橋渡し
2. Markdown ⇄ HTML 変換
3. エラーハンドリング・リトライ
4. 通知（Slack, Discord）

### Obsidian Git の役割

1. Obsidian ⇄ GitHub を完全自動同期
2. ユーザーは**保存するだけ**
3. 3分ごとに pull、5分ごとに commit & push

---

## 🛠️ コンポーネント一覧

| コンポーネント | 役割 | 自動化 |
|--------------|------|--------|
| **Obsidian Git** | Obsidian ⇄ GitHub | ✅ 完全自動 |
| **GitHub Actions** | push 検知 → n8n webhook | ✅ 自動 |
| **n8n** | GitHub ⇄ note.com 橋渡し | ✅ 自動 |
| **note-mcp** | note.com API ラッパー | ー |
| **note.com** | 公開プラットフォーム | ー |

---

## 📊 同期のタイミング

| イベント | タイミング | 処理時間 |
|---------|-----------|---------|
| **Obsidian 保存** | 即座 | 0秒 |
| **Git commit** | 5分後 | 1秒 |
| **GitHub → note** | commit直後 | 3-5秒 |
| **note → GitHub** | 15分ごと | 5-10秒 |
| **GitHub pull** | 3分ごと | 1秒 |
| **合計（worst case）** | 最大23分 | ー |

---

## 💰 月間コスト（20-30記事）

| サービス | 使用量 | コスト |
|---------|--------|--------|
| GitHub LFS | ~50MB | $0（無料枠） |
| GitHub Actions | ~100分 | $0（無料枠） |
| note-mcp | 独自ドメイン | $0（セルフホスト） |
| n8n | 月60回 × 2フロー | $0（セルフホスト） |
| OpenAI API（AI Agent使用時） | 60回 × $0.001 | ~$0.06 |
| **合計** | ー | **$0-0.06/月** ✨ |

---

## 🚀 クイックスタート

### 最小構成（30分で動かす）

1. **Obsidian Git をインストール**（5分）
   - Obsidian で Community Plugins → "Obsidian Git" をインストール
   - Auto commit: 5分、Auto pull: 3分に設定

2. **note-mcp を起動**（5分）
   - 既にデプロイ済み: `https://your-domain.com`

3. **n8n でワークフローをインポート**（10分）
   - `n8n/github-to-note.json`
   - `n8n/note-to-github.json`
   - MCP Server URL を設定

4. **GitHub Secrets を設定**（5分）
   ```bash
   gh secret set N8N_WEBHOOK_URL --body "https://your-n8n-url.com/webhook/"
   gh secret set GITHUB_TOKEN --body "ghp_xxxxxxxxxxxx"
   ```

5. **テスト実行**（5分）
   - Cursor で記事を編集
   - 保存 → 5分待つ → note.com で確認

---

## 📚 ドキュメント

| ドキュメント | 内容 |
|------------|------|
| [実用的なワークフロー](docs/real-world-workflow.md) | ⭐ **必読** |
| [Obsidian Git 設定](docs/obsidian-git-setup.md) | Obsidian Git プラグインの設定 |
| [n8n ワークフロー](docs/n8n-workflows.md) | n8n ワークフローの詳細 |
| [MCP 設定](docs/mcp-configuration.md) | note-mcp の設定 |

---

## 🎉 結論

**MCP は最小限**（note.com との通信のみ）、**Obsidian Git で自動同期**、**n8n で橋渡し** という構成で、**完全自動化**が実現します。

**ユーザーがやること**:
- Cursor で執筆
- 保存するだけ

**あとは全て自動で同期されます！** 🚀

