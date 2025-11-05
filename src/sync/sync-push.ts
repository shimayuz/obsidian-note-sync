/**
 * Obsidian → note 同期（push）
 */

import { readFile } from 'fs/promises';
import { join } from 'path';
import { updateDraft } from './note-mcp-client.js';
import { markdownToHtml } from './md-to-html.js';
import { loadMeta, saveMeta, incrementVersion, isLockExpired } from '../utils/meta.js';
import { getMarkdownHash, parseFrontmatter } from '../utils/markdown.js';
import type { SyncOptions } from '../types.js';

/**
 * Obsidianからnoteへpush
 */
export async function pushToNote(
  articleDir: string,
  options: SyncOptions = {}
): Promise<{ success: boolean }> {
  const meta = await loadMeta(articleDir);
  const mdPath = join(articleDir, 'index.md');

  // Markdownを読み込み
  const markdown = await readFile(mdPath, 'utf-8');
  const { frontmatter, content } = parseFrontmatter(markdown);

  // ロックチェック
  if (options.checkLock && meta.editing.location === 'note') {
    if (!isLockExpired(meta.editing.locked_at)) {
      const lockedAt = new Date(meta.editing.locked_at!);
      const minutesAgo = Math.floor(
        (Date.now() - lockedAt.getTime()) / 60000
      );

      if (!options.force) {
        throw new Error(
          `⚠️  Article is being edited on note. ` +
            `Last edit: ${meta.editing.locked_at} (${minutesAgo} minutes ago). ` +
            `Run with --force to override.`
        );
      }

      // 強制モードの場合、警告を表示
      console.warn(
        `⚠️  Warning: Article is locked by note editing (${minutesAgo} minutes ago).`
      );
      console.warn(`   note version: ${meta.editing.version}`);
      console.warn(`   Your version will overwrite note's changes.`);
    }
  }

  // Markdown → HTML
  const html = await markdownToHtml(content);

  // 画像処理（簡易実装：実際には画像をnoteにアップロードする必要がある）
  // TODO: 画像のアップロード処理を実装

  // noteへpush
  if (!options.dryRun) {
    const result = await updateDraft({
      noteId: meta.note_id,
      title: frontmatter.title || meta.title,
      html,
    });

    // メタデータ更新
    meta.editing.location = 'note';
    meta.editing.locked_at = new Date().toISOString();
    meta.editing.version = incrementVersion(meta.editing.version);
    meta.versions.hash.obsidian = getMarkdownHash(markdown);
    meta.versions.note_revision = result.revision;
    meta.sync.last_push = new Date().toISOString();

    await saveMeta(articleDir, meta);
  }

  console.log(`✓ Pushed ${meta.editing.version}: ${meta.slug}`);

  return { success: true };
}

