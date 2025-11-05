#!/bin/bash

# Git LFS セットアップスクリプト

set -e

echo "🔧 Setting up Git LFS..."

# Git LFS がインストールされているか確認
if ! command -v git-lfs &> /dev/null; then
    echo "❌ Git LFS is not installed."
    echo ""
    echo "Install Git LFS:"
    echo "  macOS:   brew install git-lfs"
    echo "  Ubuntu:  sudo apt-get install git-lfs"
    echo "  Windows: Download from https://git-lfs.github.com/"
    exit 1
fi

# Git LFS を有効化
git lfs install

echo "✓ Git LFS initialized"

# .gitattributes が既に存在するか確認
if [ ! -f .gitattributes ]; then
    echo "❌ .gitattributes not found. Creating..."
    cat > .gitattributes << 'EOF'
# Git LFS 設定
*.png filter=lfs diff=lfs merge=lfs -text
*.jpg filter=lfs diff=lfs merge=lfs -text
*.jpeg filter=lfs diff=lfs merge=lfs -text
*.webp filter=lfs diff=lfs merge=lfs -text
*.gif filter=lfs diff=lfs merge=lfs -text

# テキストファイルは通常管理
*.md text
*.json text
*.url text
EOF
    git add .gitattributes
fi

echo "✓ .gitattributes configured"

# 既存の画像を LFS に移行
echo "🔄 Migrating existing images to LFS..."

IMAGE_COUNT=$(find articles -type f \( -name "*.png" -o -name "*.jpg" -o -name "*.jpeg" -o -name "*.webp" -o -name "*.gif" \) 2>/dev/null | wc -l | tr -d ' ')

if [ "$IMAGE_COUNT" -gt 0 ]; then
    # LFS に移行
    git lfs migrate import --include="*.png,*.jpg,*.jpeg,*.webp,*.gif" --everything
    echo "✓ Migrated $IMAGE_COUNT images to LFS"
else
    echo "ℹ️  No existing images found"
fi

echo ""
echo "✅ Git LFS setup complete!"
echo ""
echo "Next steps:"
echo "  1. Commit changes: git commit -m 'chore: setup Git LFS'"
echo "  2. Push to remote: git push"
echo ""

