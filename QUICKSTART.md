# クイックスタート（最もシンプルな方法）

## 🎯 目標

**15分で動かす** - GitHub Actions のみで Obsidian ⇄ note.com を自動同期

---

## 📋 前提条件

- [x] GitHub アカウント
- [x] note.com アカウント
- [x] Obsidian

---

## 🚀 セットアップ（3ステップ）

### Step 1: GitHub Secrets を設定（2分）

```bash
gh secret set NOTE_EMAIL --body "your@email.com"
gh secret set NOTE_PASSWORD --body "your-note-password"
```

### Step 2: Obsidian Git をインストール（5分）

1. Obsidian で **Settings** → **Community plugins**
2. **Browse** → "Obsidian Git" を検索
3. **Install** → **Enable**
4. 設定:
   - **Vault backup interval**: `5`（分）
   - **Auto pull interval**: `3`（分）
   - **Push on backup**: `✓`

### Step 3: 動作確認（5分）

1. **記事を作成**:
```bash
npm run create:article
# Title: テスト記事
# note ID: n/xxxxxxxx（note で下書きを作成して取得）
```

2. **記事を編集**:
```bash
cursor articles/test-article/index.md
```

3. **保存して待つ**:
   - 保存（Cmd+S）
   - 5分待つ（Obsidian Git が自動 push）
   - GitHub Actions が実行される
   - note.com の下書きが更新される

4. **note.com で確認** ✅

---

## 🔄 往復編集

### Obsidian → note.com

```
1. Cursor で編集 & 保存
2. 5分待つ
3. note.com で確認 ✅
```

### note.com → Obsidian

```
1. note.com で編集
2. 15-20分待つ
3. Obsidian で確認 ✅
```

**何もコマンドを実行する必要なし！**

---

## 📐 アーキテクチャ

```
[Obsidian]
    ↓ Obsidian Git（5分ごと）
[GitHub]
    ↓ GitHub Actions（Python）
[note.com] ✅
```

**使用する技術**:
- Obsidian Git プラグイン
- GitHub Actions
- Python スクリプト
- note API

**不要なもの**:
- ❌ n8n
- ❌ MCP
- ❌ AI Agent
- ❌ 複雑な設定

---

## 💰 コスト

| サービス | コスト |
|---------|--------|
| GitHub Actions | $0（無料枠） |
| GitHub LFS | $0（無料枠） |
| **合計** | **$0/月** ✨ |

---

## 🐛 トラブルシューティング

### GitHub Actions が失敗する

```bash
# ログを確認
gh run list
gh run view <run-id> --log

# Secrets が設定されているか確認
gh secret list
```

### note.com に反映されない

1. note ID が正しいか確認（`meta.json`）
2. note.com でログインできるか確認
3. GitHub Actions のログを確認

### Obsidian に反映されない

1. Obsidian Git の設定を確認（Auto pull が有効か）
2. Git の状態を確認（`git status`）
3. 手動で pull（Ctrl+P → "Obsidian Git: Pull"）

---

## 📚 詳細ドキュメント

- [完全ガイド](COMPLETE_GUIDE.md)
- [実装方式の比較](docs/implementation-comparison.md)
- [Obsidian Git 設定](docs/obsidian-git-setup.md)

---

## 🎉 完了！

**15分で Obsidian ⇄ note.com の自動同期が動作します。**

**ユーザーがやること**: **保存するだけ** 🚀

