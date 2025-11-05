/**
 * ハッシュ計算ユーティリティ
 */

import { createHash } from 'crypto';

/**
 * テキストのSHA256ハッシュを計算
 */
export function hashContent(content: string): string {
  return createHash('sha256').update(content, 'utf-8').digest('hex');
}

/**
 * Markdown本文を正規化してハッシュ計算
 * （改行・空白の統一、Frontmatter除外）
 */
export function hashMarkdown(markdown: string): string {
  // Frontmatterを除去
  const withoutFrontmatter = markdown.replace(
    /^---\n[\s\S]*?\n---\n/,
    ''
  );
  
  // 改行を統一（LF）
  const normalized = withoutFrontmatter
    .replace(/\r\n/g, '\n')
    .replace(/\r/g, '\n')
    // 連続する空行を1つに
    .replace(/\n{3,}/g, '\n\n')
    // 行末の空白を除去
    .replace(/[ \t]+$/gm, '')
    .trim();
  
  return hashContent(normalized);
}

/**
 * 画像パス一覧のハッシュ（ソート済み）
 */
export function hashImages(imagePaths: string[]): string {
  const sorted = [...imagePaths].sort();
  return hashContent(sorted.join('\n'));
}

