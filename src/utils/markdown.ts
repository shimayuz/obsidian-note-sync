/**
 * Markdown操作ユーティリティ
 */

import matter from 'gray-matter';
import { hashMarkdown } from './hash.js';

/**
 * Frontmatterを抽出
 */
export function parseFrontmatter(markdown: string): {
  frontmatter: Record<string, any>;
  content: string;
} {
  const parsed = matter(markdown);
  return {
    frontmatter: parsed.data,
    content: parsed.content,
  };
}

/**
 * Frontmatterを追加/更新
 */
export function updateFrontmatter(
  markdown: string,
  updates: Record<string, any>
): string {
  const { frontmatter, content } = parseFrontmatter(markdown);
  const merged = { ...frontmatter, ...updates };
  return matter.stringify(content, merged);
}

/**
 * Markdown本文のみを取得（Frontmatter除外）
 */
export function getMarkdownBody(markdown: string): string {
  const { content } = parseFrontmatter(markdown);
  return content.trim();
}

/**
 * Markdownのハッシュを計算（Frontmatter除外）
 */
export function getMarkdownHash(markdown: string): string {
  return hashMarkdown(markdown);
}

