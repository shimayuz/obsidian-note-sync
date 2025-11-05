# 運用のベストプラクティス

## 📝 執筆フロー

### 推奨フロー

```
[1st Draft]
Cursor で執筆
  ↓
[2nd Draft]
Obsidian で構成調整
  ↓ (自動 push)
[note 下書き]
note で装飾・微調整
  ↓ (自動 pull)
[Final Draft]
Cursor で技術的な修正
  ↓ (自動 push)
[公開]
note で最終確認 & 公開
```

### ポイント

1. **大きな変更は Cursor/Obsidian で**（バージョン管理の恩恵）
2. **装飾は note で**（リアルタイムプレビュー）
3. **公開前に必ず pull**（最新版を Obsidian に反映）

## 🔒 編集ロックの活用

### ルール

- `editing.location = "obsidian"` → Cursor/Obsidian で編集中
- `editing.location = "note"` → note で編集中
- **10分間有効**（経過後は自動解除）

### 運用

```bash
# 編集開始前にステータス確認
npm run sync:status my-article

# note で編集中なら pull してから編集
npm run sync:pull my-article
```

## 🖼️ 画像の扱い

### 推奨フロー

1. **Obsidian に画像を追加**（ドラッグ&ドロップ）
2. **自動で WebP 最適化**（pre-commit hook）
3. **note へ push**（自動で CDN アップロード）
4. **note で差し替え可能**（次回 pull で反映）

### 注意点

- **相対パス必須**: `![](assets/image.webp)`
- **外部 URL は避ける**: note CDN に移行する
- **大きすぎる画像**: 1200px 幅に自動リサイズ推奨

### クリーンアップ

```bash
# 月1回実行
npm run cleanup:images
```

## 🔄 同期の頻度

### 推奨設定

| タイミング | 方法 |
|----------|------|
| **Obsidian → note** | Git push 時に自動 |
| **note → Obsidian** | 15分ごとに自動 |
| **手動同期** | 編集開始前・公開前 |

### GitHub Actions の調整

```yaml
# 頻度を変更したい場合
on:
  schedule:
    - cron: '*/30 * * * *'  # 30分ごと
```

## ⚠️ トラブル回避

### 1. 同時編集を避ける

```bash
# 編集前に必ずステータス確認
npm run sync:status my-article
```

### 2. 大きな変更は分割

- 1つのコミットで複数記事を変更しない
- 画像の大量追加は別コミット

### 3. 競合発生時の対処

```bash
# 1. 競合ファイルを確認
cat articles/my-article/index.CONFLICT.md

# 2. どちらを採用するか決める
# - LOCAL (Obsidian) を採用する場合
cp articles/my-article/index.md articles/my-article/index.md.bak

# - REMOTE (note) を採用する場合
mv articles/my-article/index.CONFLICT.md articles/my-article/index.md

# 3. コミット
git add articles/my-article/
git commit -m "resolve: accept note version"
```

## 📊 バージョン管理

### meta.json の活用

```json
{
  "editing": {
    "version": "v5"  // ← ドラフトのバージョン
  },
  "versions": {
    "git_commit": "a1b2c3d4",  // ← Git コミット
    "hash": {
      "obsidian": "sha256:...",  // ← Obsidian の hash
      "note": "sha256:..."        // ← note の hash
    }
  }
}
```

### 履歴の追跡

```bash
# Git 履歴で変更を確認
git log articles/my-article/index.md

# 特定バージョンに戻す
git checkout a1b2c3d4 articles/my-article/index.md
```

## 🚀 パフォーマンス最適化

### 画像の最適化

```bash
# WebP 変換 + リサイズ
sharp input.jpg -o output.webp --resize 1200
```

### Git LFS の効率化

```bash
# 古い記事の画像を lazy fetch
git lfs fetch --recent

# 特定の記事だけ取得
git lfs pull -I "articles/my-article/*"
```

## 📈 月間運用コスト（試算）

### 20-30記事/月の場合

| 項目 | 使用量 | コスト |
|------|--------|--------|
| **GitHub LFS** | 50MB | $0（無料枠内） |
| **GitHub Actions** | 100分 | $0（無料枠内） |
| **note-mcp** | ローカル | $0 |
| **合計** | - | **$0/月** |

### 100記事超えた場合

- Git LFS: 250MB（無料枠内）
- 500記事: 1.2GB → $5/月
- 外部ストレージ (R2) への移行を検討

## 🛡️ バックアップ戦略

### 推奨設定

1. **Git リポジトリ**: GitHub にプッシュ（自動）
2. **note.html**: 各記事に保存（自動）
3. **画像**: Git LFS + CDN マッピング（自動）

### 復元手順

```bash
# 誤って削除した場合
git checkout HEAD~1 articles/my-article/

# 特定バージョンに戻す
git revert a1b2c3d4
```

## 📋 チェックリスト

### 公開前

- [ ] ステータス確認: `npm run sync:status`
- [ ] 最新版を pull: `npm run sync:pull`
- [ ] ローカルで校正
- [ ] note へ push: `npm run sync:push`
- [ ] note でプレビュー
- [ ] 公開
- [ ] 公開版を pull（最終版の保存）

### 週次メンテナンス

- [ ] 未使用画像のクリーンアップ: `npm run cleanup:images`
- [ ] 全記事の同期チェック: `npm run sync:check-all`
- [ ] Git LFS のストレージ確認: `git lfs ls-files`

### 月次メンテナンス

- [ ] GitHub Actions のログ確認
- [ ] `.trash/` の削除
- [ ] バックアップの確認

## 🔗 関連ドキュメント

- [クイックスタート](quick-start.md)
- [同期ロジックの詳細](sync-logic.md)
- [トラブルシューティング](troubleshooting.md)

