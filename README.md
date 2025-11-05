# Obsidian ⇄ note.com 双方向同期システム

Cursor + Obsidian + note.com を Git 中心で統合し、画像も含めた完全な往復編集を実現します。

## 🎯 特徴

- **Git が真実の源泉**: バージョン管理・競合解決を Git に任せる
- **双方向同期**: Obsidian ⇄ note を何度でも往復可能
- **画像管理**: Git LFS で自動最適化・CDN マッピング
- **編集ロック**: 同時編集を防ぐメタデータ管理
- **競合検知**: 3-way diff で安全なマージ

## 📁 ディレクトリ構造

```
.
├── articles/                 # 記事ディレクトリ
│   └── <slug>/
│       ├── index.md          # Markdown 本文
│       ├── meta.json         # 同期メタデータ
│       ├── note.html         # note 版 HTML（バックアップ）
│       └── assets/           # 画像
│           ├── *.webp        # 最適化済み画像（Git LFS）
│           └── .note-cdn/    # CDN URL マッピング
│               └── *.url
├── scripts/                  # 同期スクリプト
│   ├── note-sync.js          # メイン同期ロジック
│   ├── watch-note-edits.js   # note 編集監視
│   └── cleanup-unused-images.js
├── .github/
│   └── workflows/
│       ├── note-push.yml     # Obsidian → note 自動同期
│       └── note-pull.yml     # note → Obsidian 自動同期
└── package.json
```

## 🚀 セットアップ

### 1. 依存関係のインストール

```bash
npm install
```

### 2. Git LFS の有効化

```bash
npm run setup:lfs
```

### 3. note-mcp の起動

```bash
# note-mcp リポジトリで
npm start
# → http://localhost:3000 で起動
```

### 4. 環境変数の設定

```bash
# .env ファイルを作成
echo "NOTE_MCP_URL=http://localhost:3000" > .env
```

## 📝 使い方

### 基本フロー

1. **Cursor で執筆**
   ```bash
   cursor articles/my-article/index.md
   # 保存 → Git commit → push
   # → GitHub Actions が note へ自動 push
   ```

2. **note で編集**
   ```
   ブラウザで note を開いて編集
   # 自動保存される
   ```

3. **Obsidian へ pull**
   ```bash
   npm run sync:pull my-article
   # または GitHub Actions が15分ごとに自動実行
   ```

4. **繰り返し**（何度でも往復可能）

### コマンドリファレンス

```bash
# 記事を note へ push
npm run sync:push my-article

# note から記事を pull
npm run sync:pull my-article

# ステータス確認
npm run sync:status my-article

# 全記事の同期チェック
npm run sync:check-all

# note 編集の監視（常駐）
npm run watch:note

# 未使用画像のクリーンアップ
npm run cleanup:images
```

## 🔒 編集ロックの仕組み

`meta.json` の `editing.location` で編集場所を管理：

- `obsidian`: Cursor/Obsidian で編集中（note への push が可能）
- `note`: note で編集中（Obsidian からの push は警告）
- `none`: 編集完了（どちらからでも編集可能）

ロックは **10分間有効**、経過後は自動解除されます。

## ⚠️ 競合が発生したら

```bash
# 競合ファイルが自動生成される
articles/my-article/index.CONFLICT.md

# 手動で解決後
git add articles/my-article/index.md
git commit -m "resolve: manual merge"
git push
```

## 📊 月間コスト（想定）

- GitHub LFS: 無料枠（1GB）で十分（20-30記事/月 = 約50MB）
- note-mcp: ローカル実行（無料）
- GitHub Actions: 無料枠（2000分/月）で十分

## 🛠️ トラブルシューティング

### note へ push できない

```bash
# ロック状態を確認
npm run sync:status my-article

# 強制 push（注意: note 側の変更が消える）
node scripts/note-sync.js push my-article --force
```

### 画像が同期されない

```bash
# Git LFS の状態確認
git lfs status

# LFS ファイルを再取得
git lfs pull
```

### GitHub Actions が動かない

```bash
# Secrets が設定されているか確認
gh secret list

# ワークフローを手動実行
gh workflow run note-push.yml
```

## 📖 詳細ドキュメント

- [同期ロジックの詳細](docs/sync-logic.md)
- [画像処理の仕組み](docs/image-processing.md)
- [トラブルシューティング](docs/troubleshooting.md)

## ライセンス

MIT

