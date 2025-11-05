/**
 * meta.json管理ユーティリティ
 */

import { readFile, writeFile } from 'fs/promises';
import { join } from 'path';
import type { ArticleMeta } from '../types.js';

/**
 * meta.jsonを読み込む
 */
export async function loadMeta(articleDir: string): Promise<ArticleMeta> {
  const metaPath = join(articleDir, 'meta.json');
  const content = await readFile(metaPath, 'utf-8');
  return JSON.parse(content) as ArticleMeta;
}

/**
 * meta.jsonを保存
 */
export async function saveMeta(
  articleDir: string,
  meta: ArticleMeta
): Promise<void> {
  const metaPath = join(articleDir, 'meta.json');
  await writeFile(metaPath, JSON.stringify(meta, null, 2) + '\n', 'utf-8');
}

/**
 * 新規記事のmeta.jsonを初期化
 */
export function createInitialMeta(
  noteId: string,
  slug: string,
  title: string
): ArticleMeta {
  return {
    note_id: noteId,
    slug,
    title,
    status: 'draft',
    editing: {
      location: 'obsidian',
      version: 'v1',
    },
    versions: {
      hash: {
        obsidian: '',
        note: '',
      },
    },
    sync: {
      conflicts: [],
    },
  };
}

/**
 * バージョンをインクリメント
 */
export function incrementVersion(version: string): string {
  const match = version.match(/^v(\d+)$/);
  if (match) {
    const num = parseInt(match[1], 10);
    return `v${num + 1}`;
  }
  return 'v1';
}

/**
 * 編集ロックの有効期限チェック（デフォルト10分）
 */
export function isLockExpired(
  lockedAt: string | undefined,
  lockDurationMinutes: number = 10
): boolean {
  if (!lockedAt) return true;
  
  const locked = new Date(lockedAt).getTime();
  const now = Date.now();
  const duration = lockDurationMinutes * 60 * 1000;
  
  return (now - locked) > duration;
}

