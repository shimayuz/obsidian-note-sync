/**
 * note → Obsidian 同期（pull）
 */

import { readFile, writeFile, mkdir } from 'fs/promises';
import { join } from 'path';
import { getDraft, getPublishedArticle, extractImageUrls } from './note-mcp-client.js';
import { htmlToMarkdown, replaceImageUrls } from './html-to-md.js';
import { downloadAndStoreImage } from '../utils/image-storage.js';
import { loadMeta, saveMeta, incrementVersion } from '../utils/meta.js';
import { getMarkdownHash, getMarkdownBody } from '../utils/markdown.js';
import { detectConflicts, formatConflictFile } from './conflict.js';
import type { SyncOptions } from '../types.js';

/**
 * noteからObsidianへpull
 */
export async function pullFromNote(
  articleDir: string,
  options: SyncOptions = {}
): Promise<{ success: boolean; conflicts: boolean }> {
  const meta = await loadMeta(articleDir);
  const mdPath = join(articleDir, 'index.md');

  // noteから取得
  const noteData =
    meta.status === 'published'
      ? await getPublishedArticle(meta.note_id)
      : await getDraft(meta.note_id);

  const noteHash = getMarkdownHash(noteData.body);

  // ローカルのMarkdownを読み込み
  let localMd: string;
  try {
    localMd = await readFile(mdPath, 'utf-8');
  } catch {
    // ファイルが存在しない場合は新規作成
    localMd = '';
  }

  const localHash = getMarkdownHash(localMd);
  const baseHash = meta.versions.hash.obsidian || '';

  // 競合チェック
  if (localHash !== baseHash && baseHash !== '') {
    // Obsidian側も変更されている → 競合
    console.error(`⚠️  Conflict detected in ${meta.slug}`);
    console.error(`  Obsidian hash: ${localHash}`);
    console.error(`  Expected: ${baseHash}`);
    console.error(`  note hash: ${noteHash}`);

    // 3-way diffを作成
    const baseContent = getMarkdownBody(localMd); // 簡易実装
    const obsidianContent = getMarkdownBody(localMd);
    const noteContent = htmlToMarkdown(noteData.body);

    const diffResult = detectConflicts(baseContent, obsidianContent, noteContent);

    if (!diffResult.success) {
      // 競合ファイルを保存
      const conflictPath = join(articleDir, 'index.CONFLICT.md');
      const conflictFile = formatConflictFile(
        obsidianContent,
        noteContent,
        diffResult.conflicts
      );
      await writeFile(conflictPath, conflictFile, 'utf-8');

      if (!options.force) {
        throw new Error(
          `Conflict detected. Resolve in index.CONFLICT.md or use --force`
        );
      }
    }
  }

  // 画像ダウンロード
  const imageUrls = extractImageUrls(noteData.body);
  const imageMap = new Map<string, string>();

  for (const url of imageUrls) {
    try {
      const { path } = await downloadAndStoreImage(
        url,
        process.env.NOTE_SESSION_COOKIE
      );
      // 記事からの相対パスに変換
      const relativePath = path; // 簡易実装（実際は相対パス計算が必要）
      imageMap.set(url, relativePath);
    } catch (error) {
      console.warn(`Failed to download image: ${url}`, error);
    }
  }

  // HTML → Markdown
  let markdown = htmlToMarkdown(noteData.body);
  markdown = replaceImageUrls(markdown, imageMap);

  // Frontmatterを追加
  const frontmatter = {
    title: noteData.title,
    note_id: meta.note_id,
    slug: meta.slug,
    status: meta.status,
    updated_at: noteData.updated_at,
  };

  const frontmatterStr = Object.entries(frontmatter)
    .map(([key, value]) => `${key}: ${JSON.stringify(value)}`)
    .join('\n');

  const finalMarkdown = `---\n${frontmatterStr}\n---\n\n${markdown}`;

  // 保存
  if (!options.dryRun) {
    await writeFile(mdPath, finalMarkdown, 'utf-8');

    // メタデータ更新
    meta.editing.location = 'obsidian';
    meta.editing.locked_at = new Date().toISOString();
    meta.editing.version = incrementVersion(meta.editing.version);
    meta.versions.hash.obsidian = getMarkdownHash(finalMarkdown);
    meta.versions.hash.note = noteHash;
    meta.versions.note_revision = noteData.updated_at;
    meta.sync.last_pull = new Date().toISOString();

    await saveMeta(articleDir, meta);
  }

  console.log(`✓ Pulled ${meta.editing.version}: ${meta.slug}`);

  return { success: true, conflicts: false };
}

