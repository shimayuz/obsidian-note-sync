#!/usr/bin/env node

import { marked } from 'marked';
import TurndownService from 'turndown';
import { gfm } from 'turndown-plugin-gfm';
import { diffLines } from 'diff';
import { glob } from 'glob';
import path from 'path';
import fs from 'fs/promises';
import crypto from 'crypto';
import chalk from 'chalk';
import ora from 'ora';

/**
 * note-mcp クライアント（HTTP/SSE モード対応）
 */
import { NoteMCPHTTPClient } from './mcp-client-http.js';

class NoteMcpClient {
  constructor(baseUrl) {
    // HTTP/SSE モードを使用
    this.baseUrl = baseUrl || process.env.NOTE_MCP_URL || 'http://127.0.0.1:3000';
    this.client = new NoteMCPHTTPClient(this.baseUrl);
  }

  async connect() {
    // HTTP モードでは接続チェックのみ
    const healthy = await this.client.client.healthCheck();
    if (!healthy) {
      throw new Error(`MCP server is not healthy at ${this.baseUrl}`);
    }
  }

  async disconnect() {
    // HTTP モードでは何もしない
  }

  async getDraft(noteId) {
    await this.connect();
    return await this.client.getDraft(noteId);
  }

  async updateDraft({ noteId, title, body, images = [] }) {
    await this.connect();
    // note-mcp の post-draft-note ツールを使用
    return await this.client.updateDraft({ noteId, title, body, isPublic: false });
  }

  async uploadImage({ filename, data, contentType }) {
    await this.connect();
    return await this.client.uploadImage({ filename, data, contentType });
  }
}

/**
 * メイン同期クラス
 */
class NoteSync {
  constructor(baseUrl) {
    this.mcp = new NoteMcpClient(baseUrl);
    
    // Turndown 設定
    this.turndown = new TurndownService({
      headingStyle: 'atx',
      codeBlockStyle: 'fenced',
      emDelimiter: '*',
      bulletListMarker: '-',
      hr: '---'
    });
    
    // GitHub Flavored Markdown サポート
    this.turndown.use(gfm);
    
    // カスタムルール
    this.turndown.addRule('figcaption', {
      filter: 'figcaption',
      replacement: (content) => `\n> ${content}\n`
    });
    
    this.turndown.addRule('removeSpans', {
      filter: ['span', 'div'],
      replacement: (content) => content
    });
  }

  /**
   * Obsidian → note への push
   */
  async push(slug, options = {}) {
    const spinner = ora(`Pushing ${slug} to note...`).start();
    
    try {
      const articleDir = path.join('articles', slug);
      const mdPath = path.join(articleDir, 'index.md');
      const metaPath = path.join(articleDir, 'meta.json');
      
      // メタデータ読み込み
      const meta = JSON.parse(await fs.readFile(metaPath, 'utf-8'));
      
      // ロックチェック
      if (options.checkLock && !options.force) {
        this.checkEditLock(meta, 'note');
      }
      
      // Markdown 読み込み
      const markdown = await fs.readFile(mdPath, 'utf-8');
      const currentHash = this.hashContent(markdown);
      
      // 変更チェック
      if (currentHash === meta.versions?.hash?.obsidian && !options.force) {
        spinner.succeed(chalk.green(`✓ No changes: ${slug}`));
        return;
      }
      
      // 画像処理
      const images = await this.processImages(markdown, articleDir);
      
      // HTML 変換
      const html = this.markdownToNoteHtml(markdown, images);
      
      // note へ送信
      if (!options.dryRun) {
        const result = await this.mcp.updateDraft({
          noteId: meta.note_id,
          title: meta.title,
          body: html,
          images: images.map(img => img.cdn)
        });
        
        // HTML バックアップ
        await fs.writeFile(path.join(articleDir, 'note.html'), html);
        
        // メタデータ更新
        meta.editing = {
          location: 'note',
          locked_by: process.env.USER || 'system',
          locked_at: new Date().toISOString(),
          version: this.incrementVersion(meta.editing?.version || 'v0')
        };
        
        meta.versions = meta.versions || {};
        meta.versions.git_commit = process.env.GITHUB_SHA || 'local';
        meta.versions.hash = meta.versions.hash || {};
        meta.versions.hash.obsidian = currentHash;
        meta.versions.hash.html = this.hashContent(html);
        meta.versions.note_revision = result.updatedAt;
        
        meta.sync = meta.sync || {};
        meta.sync.last_push = new Date().toISOString();
        
        await fs.writeFile(metaPath, JSON.stringify(meta, null, 2) + '\n');
        
        spinner.succeed(chalk.green(`✓ Pushed: ${slug} (${meta.editing.version})`));
      } else {
        spinner.info(chalk.blue(`[DRY RUN] Would push: ${slug}`));
      }
      
    } catch (error) {
      spinner.fail(chalk.red(`✗ Failed to push ${slug}`));
      throw error;
    }
  }

  /**
   * note → Obsidian への pull
   */
  async pull(slug, options = {}) {
    const spinner = ora(`Pulling ${slug} from note...`).start();
    
    try {
      const articleDir = path.join('articles', slug);
      const mdPath = path.join(articleDir, 'index.md');
      const metaPath = path.join(articleDir, 'meta.json');
      
      // メタデータ読み込み
      const meta = JSON.parse(await fs.readFile(metaPath, 'utf-8'));
      
      // note から取得
      const noteData = await this.mcp.getDraft(meta.note_id);
      const noteHash = this.hashContent(noteData.body);
      
      // 変更チェック
      if (noteHash === meta.versions?.hash?.html && !options.force) {
        spinner.succeed(chalk.green(`✓ No changes from note: ${slug}`));
        return { conflicts: false };
      }
      
      // 競合検知
      const localMd = await fs.readFile(mdPath, 'utf-8');
      const localHash = this.hashContent(localMd);
      
      if (localHash !== meta.versions?.hash?.obsidian && !options.force) {
        spinner.warn(chalk.yellow(`⚠ Conflict detected: ${slug}`));
        
        // 競合ファイル作成
        const images = await this.downloadNoteImages(noteData.body, articleDir);
        const noteMarkdown = this.htmlToMarkdown(noteData.body, images);
        
        await fs.writeFile(
          path.join(articleDir, 'index.CONFLICT.md'),
          this.formatConflictFile(localMd, noteMarkdown, meta)
        );
        
        return {
          conflicts: true,
          conflictFile: 'index.CONFLICT.md'
        };
      }
      
      // 画像ダウンロード
      const images = await this.downloadNoteImages(noteData.body, articleDir);
      
      // HTML → Markdown
      const markdown = this.htmlToMarkdown(noteData.body, images);
      
      // 保存
      await fs.writeFile(mdPath, markdown);
      await fs.writeFile(path.join(articleDir, 'note.html'), noteData.body);
      
      // メタデータ更新
      meta.editing = {
        location: 'obsidian',
        locked_by: process.env.USER || 'system',
        locked_at: new Date().toISOString(),
        version: this.incrementVersion(meta.editing?.version || 'v0')
      };
      
      meta.versions = meta.versions || {};
      meta.versions.hash = meta.versions.hash || {};
      meta.versions.hash.obsidian = this.hashContent(markdown);
      meta.versions.hash.html = noteHash;
      meta.versions.note_revision = noteData.updatedAt;
      
      meta.sync = meta.sync || {};
      meta.sync.last_pull = new Date().toISOString();
      
      await fs.writeFile(metaPath, JSON.stringify(meta, null, 2) + '\n');
      
      spinner.succeed(chalk.green(`✓ Pulled: ${slug} (${meta.editing.version})`));
      
      return { conflicts: false };
      
    } catch (error) {
      spinner.fail(chalk.red(`✗ Failed to pull ${slug}`));
      throw error;
    }
  }

  /**
   * ステータス表示
   */
  async status(slug) {
    const articleDir = path.join('articles', slug);
    const metaPath = path.join(articleDir, 'meta.json');
    
    const meta = JSON.parse(await fs.readFile(metaPath, 'utf-8'));
    
    console.log(chalk.bold(`\n📄 ${slug} (${meta.editing?.version || 'v0'})`));
    console.log(`  ${this.getLocationIcon(meta.editing?.location)} Editing location: ${meta.editing?.location || 'none'}`);
    console.log(`  📅 Locked at: ${meta.editing?.locked_at || 'never'}`);
    
    if (meta.editing?.locked_at) {
      const lockAge = Date.now() - new Date(meta.editing.locked_at).getTime();
      const lockMinutes = Math.floor(lockAge / 60000);
      console.log(`     (${lockMinutes} minutes ago)`);
    }
    
    console.log(`  📊 Hashes:`);
    console.log(`     Obsidian: ${meta.versions?.hash?.obsidian?.slice(0, 16) || 'none'}...`);
    console.log(`     note:     ${meta.versions?.hash?.html?.slice(0, 16) || 'none'}...`);
    
    // 発散チェック
    const mdPath = path.join(articleDir, 'index.md');
    const localMd = await fs.readFile(mdPath, 'utf-8');
    const localHash = this.hashContent(localMd);
    
    if (localHash !== meta.versions?.hash?.obsidian) {
      console.log(chalk.yellow(`  ⚠️  Diverged! Local changes not synced.`));
    }
    
    console.log('');
  }

  /**
   * 全記事のチェック
   */
  async checkAll() {
    const metaFiles = await glob('articles/*/meta.json');
    
    console.log(chalk.bold(`\n📋 Checking ${metaFiles.length} articles...\n`));
    
    for (const metaPath of metaFiles) {
      const slug = path.basename(path.dirname(metaPath));
      const meta = JSON.parse(await fs.readFile(metaPath, 'utf-8'));
      
      const mdPath = path.join(path.dirname(metaPath), 'index.md');
      const localMd = await fs.readFile(mdPath, 'utf-8');
      const localHash = this.hashContent(localMd);
      
      const icon = this.getLocationIcon(meta.editing?.location);
      const version = meta.editing?.version || 'v0';
      
      if (localHash === meta.versions?.hash?.obsidian) {
        console.log(chalk.green(`✓ ${slug} (${version}, synced) ${icon}`));
      } else {
        console.log(chalk.yellow(`⚠️  ${slug} (${version}, diverged) ${icon}`));
      }
    }
    
    console.log('');
  }

  /**
   * 画像処理
   */
  async processImages(markdown, articleDir) {
    const imgRegex = /!\[([^\]]*)\]\(([^)]+)\)/g;
    const images = [];
    let match;
    
    while ((match = imgRegex.exec(markdown)) !== null) {
      const [, alt, localPath] = match;
      
      if (localPath.startsWith('http')) {
        // 外部URL はスキップ
        continue;
      }
      
      const fullPath = path.join(articleDir, localPath);
      
      try {
        const buffer = await fs.readFile(fullPath);
        const hash = crypto.createHash('sha256').update(buffer).digest('hex').slice(0, 16);
        
        // CDN マッピングをチェック
        const cdnMappingPath = path.join(articleDir, 'assets', '.note-cdn', `${hash}.url`);
        let noteUrl;
        
        try {
          noteUrl = (await fs.readFile(cdnMappingPath, 'utf-8')).trim();
        } catch {
          // マッピングがなければアップロード
          const result = await this.mcp.uploadImage({
            filename: `${hash}${path.extname(localPath)}`,
            data: buffer.toString('base64'),
            contentType: this.getContentType(localPath)
          });
          
          noteUrl = result.url;
          
          // マッピング保存
          await fs.mkdir(path.dirname(cdnMappingPath), { recursive: true });
          await fs.writeFile(cdnMappingPath, noteUrl);
        }
        
        images.push({
          local: localPath,
          cdn: noteUrl,
          hash,
          alt
        });
        
      } catch (error) {
        console.error(chalk.yellow(`Warning: Failed to process image ${localPath}: ${error.message}`));
      }
    }
    
    return images;
  }

  /**
   * note 画像のダウンロード
   */
  async downloadNoteImages(html, articleDir) {
    const imgRegex = /<img[^>]+src="([^"]+)"[^>]*alt="([^"]*)"[^>]*>/g;
    const images = [];
    const assetsDir = path.join(articleDir, 'assets');
    const cdnDir = path.join(assetsDir, '.note-cdn');
    
    await fs.mkdir(cdnDir, { recursive: true });
    
    let match;
    while ((match = imgRegex.exec(html)) !== null) {
      const [, cdnUrl, alt] = match;
      
      if (!cdnUrl.startsWith('http')) continue;
      
      // 既存マッピングをチェック
      const existingMapping = await this.findExistingMapping(cdnDir, cdnUrl);
      
      if (existingMapping) {
        images.push({
          cdn: cdnUrl,
          local: `assets/${existingMapping.hash}.webp`,
          hash: existingMapping.hash,
          alt
        });
        continue;
      }
      
      // 新規画像をダウンロード
      try {
        const response = await fetch(cdnUrl);
        const buffer = Buffer.from(await response.arrayBuffer());
        const hash = crypto.createHash('sha256').update(buffer).digest('hex').slice(0, 16);
        
        const localPath = `assets/${hash}.webp`;
        await fs.writeFile(path.join(articleDir, localPath), buffer);
        
        // マッピング保存
        await fs.writeFile(path.join(cdnDir, `${hash}.url`), cdnUrl);
        
        images.push({ cdn: cdnUrl, local: localPath, hash, alt });
        
      } catch (error) {
        console.error(chalk.yellow(`Warning: Failed to download image ${cdnUrl}: ${error.message}`));
      }
    }
    
    return images;
  }

  /**
   * Markdown → note HTML
   */
  markdownToNoteHtml(markdown, images) {
    // 画像を CDN URL に置換
    let processed = markdown;
    for (const img of images) {
      const escapedPath = img.local.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      processed = processed.replace(
        new RegExp(`!\\[([^\\]]*)\\]\\(${escapedPath}\\)`, 'g'),
        `<img src="${img.cdn}" alt="$1">`
      );
    }
    
    // Markdown → HTML
    const html = marked(processed, {
      gfm: true,
      breaks: true
    });
    
    // note 用の調整
    return this.adjustForNote(html);
  }

  /**
   * HTML → Markdown
   */
  htmlToMarkdown(html, images) {
    // CDN URL をローカルパスに置換
    let processed = html;
    for (const img of images) {
      const escapedUrl = img.cdn.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      processed = processed.replace(
        new RegExp(`<img[^>]*src="${escapedUrl}"[^>]*>`, 'g'),
        `![${img.alt || ''}](${img.local})`
      );
    }
    
    return this.turndown.turndown(processed);
  }

  /**
   * note 用 HTML 調整
   */
  adjustForNote(html) {
    return html
      .replace(/<p><\/p>/g, '<br>')
      .replace(/<p>/g, '<p style="margin-bottom: 1em;">');
  }

  /**
   * 競合ファイルのフォーマット
   */
  formatConflictFile(localContent, noteContent, meta) {
    return `# ⚠️ CONFLICT DETECTED

## メタ情報
- Slug: ${meta.slug}
- Version: ${meta.editing?.version || 'unknown'}
- Last sync: ${meta.sync?.last_push || 'never'}

## 対処方法
1. 下記の2つのバージョンを確認
2. 必要な内容を \`index.md\` にマージ
3. このファイルを削除
4. \`git add\` & \`git commit\`

---

## <<<<<<< LOCAL (Obsidian)

${localContent}

## ======= 

## >>>>>>> REMOTE (note)

${noteContent}

---
`;
  }

  /**
   * ロックチェック
   */
  checkEditLock(meta, expectedLocation) {
    if (!meta.editing || meta.editing.location === expectedLocation) {
      return;
    }
    
    const lockedAt = new Date(meta.editing.locked_at).getTime();
    const now = Date.now();
    const lockDuration = 10 * 60 * 1000; // 10分
    
    if ((now - lockedAt) < lockDuration) {
      const remainingMinutes = Math.ceil((lockDuration - (now - lockedAt)) / 60000);
      throw new Error(
        chalk.red(`🔒 Article is locked by ${meta.editing.location} editing.\n`) +
        chalk.yellow(`   Locked ${Math.floor((now - lockedAt) / 60000)} minutes ago.\n`) +
        chalk.yellow(`   Will auto-unlock in ${remainingMinutes} minutes.\n`) +
        chalk.blue(`   Use --force to override (this will discard ${meta.editing.location} changes).`)
      );
    }
  }

  /**
   * 既存マッピングの検索
   */
  async findExistingMapping(cdnDir, cdnUrl) {
    try {
      const files = await fs.readdir(cdnDir);
      for (const file of files) {
        if (!file.endsWith('.url')) continue;
        
        const savedUrl = await fs.readFile(path.join(cdnDir, file), 'utf-8');
        if (savedUrl.trim() === cdnUrl) {
          return {
            hash: path.basename(file, '.url'),
            url: savedUrl
          };
        }
      }
    } catch {
      return null;
    }
    return null;
  }

  /**
   * ユーティリティ
   */
  hashContent(content) {
    return 'sha256:' + crypto.createHash('sha256')
      .update(content.trim())
      .digest('hex');
  }

  incrementVersion(version) {
    const match = version.match(/^v(\d+)$/);
    if (match) {
      return `v${parseInt(match[1]) + 1}`;
    }
    return 'v1';
  }

  getContentType(filename) {
    const ext = path.extname(filename).toLowerCase();
    const types = {
      '.jpg': 'image/jpeg',
      '.jpeg': 'image/jpeg',
      '.png': 'image/png',
      '.gif': 'image/gif',
      '.webp': 'image/webp'
    };
    return types[ext] || 'application/octet-stream';
  }

  getLocationIcon(location) {
    const icons = {
      'obsidian': '✏️',
      'note': '🔒',
      'none': '✓'
    };
    return icons[location] || '❓';
  }
}

/**
 * CLI
 */
async function main() {
  const [,, command, ...args] = process.argv;
  
  const sync = new NoteSync(process.env.NOTE_MCP_URL);
  
  try {
    switch (command) {
      case 'push': {
        const slug = args[0];
        const force = args.includes('--force');
        const dryRun = args.includes('--dry-run');
        
        if (!slug) {
          console.error(chalk.red('Error: Slug required'));
          process.exit(1);
        }
        
        await sync.push(slug, { checkLock: true, force, dryRun });
        break;
      }
      
      case 'pull': {
        const slug = args[0];
        const force = args.includes('--force');
        
        if (!slug) {
          console.error(chalk.red('Error: Slug required'));
          process.exit(1);
        }
        
        const result = await sync.pull(slug, { force });
        
        if (result.conflicts) {
          console.error(chalk.yellow(`\n⚠️  Conflicts detected. Resolve in ${result.conflictFile}`));
          process.exit(1);
        }
        break;
      }
      
      case 'status': {
        const slug = args[0];
        
        if (!slug) {
          console.error(chalk.red('Error: Slug required'));
          process.exit(1);
        }
        
        await sync.status(slug);
        break;
      }
      
      case 'check-all': {
        await sync.checkAll();
        break;
      }
      
      default:
        console.error(chalk.red(`Unknown command: ${command}`));
        console.log(`
Usage:
  node note-sync.js push <slug> [--force] [--dry-run]
  node note-sync.js pull <slug> [--force]
  node note-sync.js status <slug>
  node note-sync.js check-all
        `);
        process.exit(1);
    }
    
  } catch (error) {
    console.error(chalk.red(`\n✗ Error: ${error.message}\n`));
    if (process.env.DEBUG) {
      console.error(error.stack);
    }
    process.exit(1);
  } finally {
    // MCP 接続をクリーンアップ
    await sync.mcp.disconnect();
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}

export { NoteSync, NoteMcpClient };

