#!/usr/bin/env node
/**
 * note-sync CLI
 * 
 * Usage:
 *   node scripts/note-sync.js push <slug> [options]
 *   node scripts/note-sync.js pull <slug> [options]
 *   node scripts/note-sync.js status <slug>
 *   node scripts/note-sync.js check-all
 */

import { existsSync } from 'fs';
import { join, resolve } from 'path';
import { pushToNote } from '../src/sync/sync-push.js';
import { pullFromNote } from '../src/sync/sync-pull.js';
import { loadMeta } from '../src/utils/meta.js';
import { getMarkdownHash } from '../src/utils/markdown.js';
import { readFile } from 'fs/promises';
import { glob } from 'glob';

const ARTICLES_DIR = 'articles';

async function main() {
  const args = process.argv.slice(2);
  const command = args[0];
  const slug = args[1];

  const options = {
    checkLock: args.includes('--check-lock') || !args.includes('--no-check-lock'),
    force: args.includes('--force'),
    dryRun: args.includes('--dry-run'),
  };

  try {
    switch (command) {
      case 'push':
        if (!slug) {
          console.error('Usage: note-sync push <slug> [--force] [--dry-run]');
          process.exit(1);
        }
        await handlePush(slug, options);
        break;

      case 'pull':
        if (!slug) {
          console.error('Usage: note-sync pull <slug> [--force] [--dry-run]');
          process.exit(1);
        }
        await handlePull(slug, options);
        break;

      case 'status':
        if (!slug) {
          console.error('Usage: note-sync status <slug>');
          process.exit(1);
        }
        await handleStatus(slug);
        break;

      case 'check-all':
        await handleCheckAll();
        break;

      default:
        console.error(`Unknown command: ${command}`);
        console.error('Available commands: push, pull, status, check-all');
        process.exit(1);
    }
  } catch (error: any) {
    console.error('❌ Error:', error.message);
    if (error.stack && process.env.DEBUG) {
      console.error(error.stack);
    }
    process.exit(1);
  }
}

async function handlePush(slug: string, options: any) {
  const articleDir = resolve(ARTICLES_DIR, slug);
  
  if (!existsSync(join(articleDir, 'meta.json'))) {
    throw new Error(`Article not found: ${slug} (meta.json missing)`);
  }

  await pushToNote(articleDir, options);
}

async function handlePull(slug: string, options: any) {
  const articleDir = resolve(ARTICLES_DIR, slug);
  
  if (!existsSync(join(articleDir, 'meta.json'))) {
    throw new Error(`Article not found: ${slug} (meta.json missing)`);
  }

  await pullFromNote(articleDir, options);
}

async function handleStatus(slug: string) {
  const articleDir = resolve(ARTICLES_DIR, slug);
  const meta = await loadMeta(articleDir);
  const mdPath = join(articleDir, 'index.md');

  let localHash = '';
  if (existsSync(mdPath)) {
    const markdown = await readFile(mdPath, 'utf-8');
    localHash = getMarkdownHash(markdown);
  }

  const icon = meta.editing.location === 'obsidian' ? '✏️' : '🔒';
  const location = meta.editing.location || 'none';

  console.log(`📄 ${meta.slug} (${meta.editing.version})`);
  console.log(`  ${icon} Editing location: ${location}`);
  
  if (meta.editing.locked_at) {
    const lockedAt = new Date(meta.editing.locked_at);
    const minutesAgo = Math.floor((Date.now() - lockedAt.getTime()) / 60000);
    console.log(`  📅 Locked at: ${meta.editing.locked_at} (${minutesAgo} minutes ago)`);
  }

  console.log(`  📊 Hashes:`);
  console.log(`    Obsidian: ${meta.versions.hash.obsidian || '(none)'}`);
  console.log(`    note:     ${meta.versions.hash.note || '(none)'}`);
  console.log(`    Local:    ${localHash || '(none)'}`);

  if (localHash && localHash !== meta.versions.hash.obsidian) {
    console.log(`  ⚠️  Diverged! Run pull to sync.`);
  }

  if (meta.sync.conflicts.length > 0) {
    console.log(`  ⚠️  ${meta.sync.conflicts.length} conflict(s) detected`);
  }
}

async function handleCheckAll() {
  const metaFiles = await glob('articles/*/meta.json');
  
  console.log(`Checking ${metaFiles.length} articles...\n`);

  for (const metaPath of metaFiles) {
    const articleDir = metaPath.replace('/meta.json', '');
    const slug = articleDir.split('/').pop()!;
    
    try {
      const meta = await loadMeta(articleDir);
      const mdPath = join(articleDir, 'index.md');
      
      let localHash = '';
      if (existsSync(mdPath)) {
        const markdown = await readFile(mdPath, 'utf-8');
        localHash = getMarkdownHash(markdown);
      }

      const synced = localHash === meta.versions.hash.obsidian;
      const diverged = localHash && localHash !== meta.versions.hash.obsidian;
      const locked = meta.editing.location === 'note' && 
                     !meta.editing.locked_at ? false :
                     !isLockExpired(meta.editing.locked_at);

      let status = '✓';
      let statusText = 'synced';
      
      if (diverged) {
        status = '⚠️';
        statusText = 'diverged: note has newer changes';
      } else if (locked) {
        status = '🔒';
        statusText = `locked by ${meta.editing.location}`;
      } else if (!synced && !localHash) {
        status = '📝';
        statusText = 'not initialized';
      }

      console.log(`${status} ${slug} (${meta.editing.version}, ${statusText})`);
    } catch (error: any) {
      console.error(`❌ ${slug}: ${error.message}`);
    }
  }
}

function isLockExpired(lockedAt?: string): boolean {
  if (!lockedAt) return true;
  const locked = new Date(lockedAt).getTime();
  const now = Date.now();
  const duration = 10 * 60 * 1000; // 10分
  return (now - locked) > duration;
}

main();

