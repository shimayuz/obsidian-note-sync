#!/usr/bin/env node

/**
 * note 側の編集を監視し、自動で pull するスクリプト
 * ローカル開発環境で常駐させる
 */

import { NoteSync, NoteMcpClient } from './note-sync.js';
import { glob } from 'glob';
import fs from 'fs/promises';
import path from 'path';
import chalk from 'chalk';

const WATCH_INTERVAL = 30000; // 30秒
const mcp = new NoteMcpClient(process.env.NOTE_MCP_URL);
const sync = new NoteSync(process.env.NOTE_MCP_URL);

async function checkForUpdates() {
  const metaFiles = await glob('articles/*/meta.json');
  
  for (const metaPath of metaFiles) {
    const meta = JSON.parse(await fs.readFile(metaPath, 'utf-8'));
    
    // note 側で編集中の記事のみチェック
    if (meta.editing?.location !== 'note') {
      continue;
    }
    
    try {
      // note から最新版を取得
      const noteData = await mcp.getDraft(meta.note_id);
      const noteHash = sync.hashContent(noteData.body);
      
      // hash が変わっていれば編集されている
      if (noteHash !== meta.versions?.hash?.html) {
        const slug = path.basename(path.dirname(metaPath));
        
        console.log(chalk.yellow(`\n📝 Detected edit on note: ${slug}`));
        console.log(chalk.blue(`🔄 Auto-pulling...`));
        
        await sync.pull(slug);
      }
      
    } catch (error) {
      const slug = path.basename(path.dirname(metaPath));
      console.error(chalk.red(`\n✗ Failed to check ${slug}: ${error.message}`));
    }
  }
}

async function main() {
  console.log(chalk.bold('\n👀 Watching for note edits...\n'));
  console.log(chalk.gray(`Checking every ${WATCH_INTERVAL / 1000} seconds`));
  console.log(chalk.gray('Press Ctrl+C to stop\n'));
  
  // 初回実行
  await checkForUpdates();
  
  // 定期実行
  setInterval(async () => {
    try {
      await checkForUpdates();
    } catch (error) {
      console.error(chalk.red(`\n✗ Error: ${error.message}\n`));
    }
  }, WATCH_INTERVAL);
}

main();

