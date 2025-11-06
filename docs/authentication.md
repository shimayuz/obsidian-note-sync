# 認証戦略ガイド

## 🔐 課題

GitHub Actions から note.com に投稿する際、**どうやって認証するか？**

---

## 📊 2つの選択肢

### 選択肢A: GitHub Secrets（シンプル・リスクあり）

**認証情報を GitHub に保存**

```yaml
# GitHub Secrets
NOTE_EMAIL: your@email.com
NOTE_PASSWORD: your-password
```

**メリット**:
- ✅ すぐに動く（15分でセットアップ完了）
- ✅ note-mcp 不要
- ✅ 実装がシンプル

**デメリット**:
- ❌ パスワードを GitHub に保存（セキュリティリスク）
- ❌ 毎回ログイン（レート制限リスク）
- ❌ GitHub Actions ログにパスワードが漏れる可能性

**推奨**: テスト・個人利用のみ

---

### 選択肢B: note-mcp（安全・推奨）

**認証情報を note-mcp サーバーで管理**

```yaml
# GitHub Secrets
NOTE_MCP_URL: https://your-domain.com/mcp  # URLのみ
```

```bash
# note-mcp サーバー側の環境変数
NOTE_EMAIL=your@email.com
NOTE_PASSWORD=your-password
```

**メリット**:
- ✅ **GitHub にパスワードを保存しない**
- ✅ **ログイン状態を維持**（24時間）
- ✅ **レート制限を回避**
- ✅ **2段階認証にも対応可能**
- ✅ **Cookie/XSRF Token を自動管理**

**デメリット**:
- ❌ note-mcp のデプロイが必要

**推奨**: 本番運用

---

## 🎯 推奨パターン

### フェーズ 1: まずシンプル版で動かす

**使用**: 選択肢A（GitHub Secrets）

1. GitHub Secrets を設定
2. `note-push-simple.yml` を有効化
3. 動作確認

**所要時間**: 15分

---

### フェーズ 2: 本番運用に移行

**使用**: 選択肢B（note-mcp）

1. note-mcp をデプロイ（あなたは既に完了）
2. GitHub Secrets を変更（パスワード削除、URL のみ）
3. `note-push-mcp.yml` に切り替え

**所要時間**: 30分

---

## 🔧 実装ファイル

| 方式 | ワークフロー | スクリプト | Secrets |
|------|------------|-----------|---------|
| **A** | `note-push-simple.yml` | `github-to-note.py` | `NOTE_EMAIL`<br>`NOTE_PASSWORD` |
| **B** | `note-push-mcp.yml` | `github-to-note-mcp.py` | `NOTE_MCP_URL` |

**両方実装済み** - 切り替え可能

---

## 💡 結論

**「認証情報の突破」の答え**:

### 短期・テスト
→ **GitHub Secrets** でOK（リスク許容）

### 長期・本番
→ **note-mcp** を推奨（安全）

**あなたは既に note-mcp をデプロイ済み**なので、選択肢Bがすぐに使えます！

---

**まずは選択肢Aで動作確認して、動いたら選択肢Bに移行するのが賢いです。**

