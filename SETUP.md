# セットアップガイド

このガイドに従って、Obsidian ⇄ note.com 同期システムを構築します。

## 📋 前提条件

### 必須

- [x] **Node.js 18+** インストール済み
- [x] **Git** インストール済み
- [x] **Git LFS** インストール済み
- [x] **note.com アカウント** 作成済み
- [x] **GitHub アカウント** 作成済み

### 推奨

- [x] **Cursor** または **VS Code**
- [x] **Obsidian**（Obsidian Git プラグイン）

## 🚀 ステップ 1: リポジトリの準備

### 1.1 リポジトリを作成

GitHub で新しいリポジトリを作成するか、このリポジトリを使用します。

### 1.2 クローン

```bash
git clone https://github.com/<your-username>/<repo-name>.git
cd <repo-name>
```

### 1.3 依存関係のインストール

```bash
npm install
```

## 🔧 ステップ 2: Git LFS の設定

### 2.1 Git LFS のインストール（未インストールの場合）

**macOS:**
```bash
brew install git-lfs
```

**Ubuntu/Debian:**
```bash
sudo apt-get install git-lfs
```

**Windows:**
[https://git-lfs.github.com/](https://git-lfs.github.com/) からダウンロード

### 2.2 Git LFS を有効化

```bash
chmod +x scripts/setup-git-lfs.sh
npm run setup:lfs
```

### 2.3 コミット & プッシュ

```bash
git add .
git commit -m "chore: setup Git LFS"
git push origin main
```

## 🔌 ステップ 3: note-mcp の設定

### 3.1 note-mcp のインストール

```bash
# 別のディレクトリで
cd /path/to/projects
git clone https://github.com/<your-username>/note-mcp.git
cd note-mcp
npm install
```

### 3.2 note-mcp の設定

note-mcp のドキュメントに従って、note.com の認証情報を設定します。

### 3.3 note-mcp の起動

```bash
npm start
# → http://localhost:3000 で起動
```

> ⚠️ **note-mcp は常時起動**しておく必要があります。
> ターミナルを閉じると停止するので、`screen` や `tmux` の使用を推奨。

## 🔐 ステップ 4: 環境変数の設定

### 4.1 .env ファイルを作成

```bash
cp env.example .env
```

### 4.2 .env を編集

```bash
NOTE_MCP_URL=http://localhost:3000
DEBUG=false
```

> 📝 **note-mcp をリモートサーバーで起動する場合:**
> `NOTE_MCP_URL=https://your-note-mcp-server.com`

## ⚙️ ステップ 5: GitHub Actions の設定

### 5.1 GitHub Secrets を設定

```bash
gh secret set NOTE_MCP_URL --body "http://localhost:3000"
```

> ⚠️ **GitHub Actions から note-mcp にアクセスできる必要があります。**
> ローカルの `localhost:3000` は使えないので、以下のいずれかを選択：
> 
> **オプション A: ngrok を使う（開発用）**
> ```bash
> ngrok http 3000
> # → https://xxxx.ngrok.io を GitHub Secrets に設定
> ```
> 
> **オプション B: note-mcp をクラウドにデプロイ（推奨）**
> - Vercel, Railway, Fly.io などにデプロイ
> - そのURLをGitHub Secretsに設定

### 5.2 ワークフローの有効化

GitHub リポジトリの Settings → Actions → General で:
- [x] Allow all actions and reusable workflows
- [x] Read and write permissions

## 📝 ステップ 6: 最初の記事を作成

### 6.1 note で下書きを作成

1. note.com にログイン
2. 新規下書きを作成
3. URL から note ID を取得（例: `n/abc123xyz`）

### 6.2 記事を作成

```bash
node scripts/create-article.js
```

対話形式で入力:
```
Title: 私の最初の記事
Slug [my-first-article]: 
note ID (e.g., n/xxxxxxxx): n/abc123xyz
```

### 6.3 記事を編集

```bash
cursor articles/my-first-article/index.md
```

### 6.4 note へ push

```bash
npm run sync:push my-first-article
```

成功すると:
```
✓ Pushed: my-first-article (v1)
```

### 6.5 note で確認

ブラウザで note を開き、下書きが更新されていることを確認。

## 🔄 ステップ 7: 往復同期のテスト

### 7.1 note で編集

1. note の下書きを編集（例: 太字を追加）
2. 自動保存される

### 7.2 Obsidian へ pull

```bash
npm run sync:pull my-first-article
```

### 7.3 確認

```bash
cat articles/my-first-article/index.md
# note での変更が反映されているはず
```

## 🤖 ステップ 8: 自動同期の確認

### 8.1 Git push でトリガー

```bash
# 記事を編集
vim articles/my-first-article/index.md

# コミット & プッシュ
git add articles/my-first-article/
git commit -m "feat: update article"
git push origin main
```

### 8.2 GitHub Actions を確認

GitHub リポジトリの Actions タブで:
- `Push to note` ワークフローが実行される
- note の下書きが自動更新される

### 8.3 定期 pull の確認

- GitHub Actions の `Pull from note` は **15分ごと** に実行される
- note で編集 → 15分以内に Obsidian に反映される

## 🎉 完了！

これで Obsidian ⇄ note.com の往復同期システムが動作します。

## 📚 次のステップ

### 日常の使い方

1. **Cursor で執筆**
   ```bash
   cursor articles/my-article/index.md
   # 保存 → Git コミット → push
   # → 自動で note に反映
   ```

2. **note で装飾**
   ```
   ブラウザで note を開いて編集
   # 15分以内に Obsidian に反映
   ```

3. **ステータス確認**
   ```bash
   npm run sync:status my-article
   ```

4. **手動同期**
   ```bash
   npm run sync:push my-article
   npm run sync:pull my-article
   ```

### ローカル監視（オプション）

```bash
# note の編集を30秒ごとに監視
npm run watch:note
```

### 画像の追加

```bash
# Obsidian に画像をドラッグ&ドロップ
# または
node scripts/optimize-image.js path/to/image.jpg articles/my-article/assets/
```

## 🛠️ トラブルシューティング

### note-mcp に接続できない

```bash
# note-mcp が起動しているか確認
curl http://localhost:3000/health

# 環境変数を確認
echo $NOTE_MCP_URL
```

### GitHub Actions が動かない

```bash
# Secrets を確認
gh secret list

# ワークフローログを確認
gh run list
gh run view <run-id>
```

### 競合が発生

```bash
# 競合ファイルを確認
cat articles/my-article/index.CONFLICT.md

# 手動マージ
vim articles/my-article/index.md

# コミット
git add articles/my-article/
git commit -m "resolve: manual merge"
```

## 📖 詳細ドキュメント

- [クイックスタート](docs/quick-start.md)
- [運用のベストプラクティス](docs/best-practices.md)
- [トラブルシューティング](docs/troubleshooting.md)

## 💬 サポート

問題が発生した場合:
1. [README.md](README.md) を確認
2. [Issues](https://github.com/<your-repo>/issues) を検索
3. 新しい Issue を作成

---

**おめでとうございます！🎉 セットアップ完了です。**

