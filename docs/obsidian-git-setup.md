# Obsidian Git プラグイン設定ガイド

## 🎯 目的

Obsidian Git プラグインで **Obsidian ⇄ GitHub を自動同期**します。

これにより、ユーザーは **保存するだけ** で自動的に GitHub にコミット・push されます。

---

## 📥 インストール

### 1. Obsidian で Community Plugins を有効化

1. **Settings** → **Community plugins**
2. **Turn on community plugins** をクリック

### 2. Obsidian Git をインストール

1. **Browse** をクリック
2. "Obsidian Git" を検索
3. **Install** → **Enable**

---

## ⚙️ 設定

### 基本設定

**Settings** → **Obsidian Git** で以下を設定:

| 項目 | 推奨値 | 説明 |
|------|--------|------|
| **Vault backup interval** | `5` | 5分ごとに自動コミット |
| **Auto pull interval** | `3` | 3分ごとに自動 pull |
| **Commit message** | `vault backup: {{date}}` | コミットメッセージ |
| **Pull updates on startup** | `✓` | 起動時に pull |
| **Push on backup** | `✓` | バックアップ時に push |

### 詳細設定

| 項目 | 推奨値 |
|------|--------|
| **Disable notifications** | お好みで |
| **Show status bar** | `✓`（同期状況を表示） |
| **Disable on this device** | `✗`（有効にする） |

---

## 🔧 GitHub との連携

### 1. リモートリポジトリを設定

Obsidian の Vault ディレクトリで:

```bash
cd /path/to/your/vault
git init
git remote add origin https://github.com/username/obsidian-note-sync.git
git branch -M main
git add .
git commit -m "Initial commit"
git push -u origin main
```

### 2. 認証設定

**SSH 推奨**（パスワード不要）:

```bash
# SSH キーを生成
ssh-keygen -t ed25519 -C "your_email@example.com"

# 公開鍵を GitHub に追加
cat ~/.ssh/id_ed25519.pub
# → GitHub Settings → SSH Keys に追加

# リモート URL を SSH に変更
git remote set-url origin git@github.com:username/obsidian-note-sync.git
```

### 3. 動作確認

Obsidian で:
1. ファイルを編集して保存
2. 5分待つ（または Ctrl+P → "Obsidian Git: Commit"）
3. GitHub で確認（コミットが作成されているはず）

---

## 📊 自動同期の流れ

```
[編集] → 保存
   ↓ (5分ごと)
[自動コミット]
   ↓
[自動 push]
   ↓
[GitHub]
   ↓ (GitHub Actions)
[n8n → note.com]
```

逆方向:

```
[note.com] → 編集
   ↓ (15分ごと)
[n8n pull]
   ↓
[GitHub コミット]
   ↓ (3分ごと)
[Obsidian 自動 pull]
   ↓
[Obsidian に反映]
```

---

## 🐛 トラブルシューティング

### 自動コミットされない

**確認事項**:
1. プラグインが有効か
2. Vault backup interval が設定されているか
3. Git リポジトリが正しく初期化されているか

**デバッグ**:
- Obsidian のコンソールを開く（Ctrl+Shift+I）
- Obsidian Git のログを確認

### 自動 push されない

**確認事項**:
1. "Push on backup" が有効か
2. リモートリポジトリが設定されているか
3. 認証が正しいか（SSH または HTTPS）

**デバッグ**:
```bash
# ターミナルで手動 push
cd /path/to/vault
git push origin main
```

### 自動 pull されない

**確認事項**:
1. "Auto pull interval" が設定されているか
2. リモートリポジトリに変更があるか

**手動 pull**:
- Ctrl+P → "Obsidian Git: Pull"

---

## 💡 ベストプラクティス

### 1. .gitignore を設定

Vault ディレクトリに `.gitignore` を作成:

```
.obsidian/workspace*
.obsidian/plugins/*/data.json
.trash/
*.CONFLICT.md
```

### 2. コンフリクトを避ける

- 複数デバイスで同時編集しない
- 編集前に必ず pull
- Obsidian Git のステータスバーを確認

### 3. 大きなファイルは Git LFS

画像は Git LFS で管理（already set up）。

---

## 📚 関連ドキュメント

- [実用的なワークフロー](real-world-workflow.md)
- [n8n セットアップ](n8n-setup.md)
- [GitHub Actions 設定](../README.md)

---

**これで Obsidian ⇄ GitHub の自動同期が完了です！**

