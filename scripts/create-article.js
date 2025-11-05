#!/usr/bin/env node

/**
 * 新規記事作成スクリプト
 */

import fs from 'fs/promises';
import path from 'path';
import chalk from 'chalk';
import readline from 'readline';

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

function question(prompt) {
  return new Promise((resolve) => {
    rl.question(prompt, resolve);
  });
}

function slugify(text) {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

async function main() {
  console.log(chalk.bold('\n📝 Create New Article\n'));
  
  const title = await question('Title: ');
  if (!title) {
    console.error(chalk.red('Error: Title required'));
    process.exit(1);
  }
  
  const defaultSlug = slugify(title);
  const slugInput = await question(`Slug [${defaultSlug}]: `);
  const slug = slugInput || defaultSlug;
  
  const noteId = await question('note ID (e.g., n/xxxxxxxx): ');
  if (!noteId || !noteId.startsWith('n/')) {
    console.error(chalk.red('Error: Valid note ID required (e.g., n/xxxxxxxx)'));
    process.exit(1);
  }
  
  rl.close();
  
  // ディレクトリ作成
  const articleDir = path.join('articles', slug);
  const assetsDir = path.join(articleDir, 'assets');
  const cdnDir = path.join(assetsDir, '.note-cdn');
  
  await fs.mkdir(cdnDir, { recursive: true });
  
  // index.md 作成
  const mdContent = `# ${title}

記事の内容をここに書きます。

## セクション1

本文...

## セクション2

本文...
`;
  
  await fs.writeFile(path.join(articleDir, 'index.md'), mdContent);
  
  // meta.json 作成
  const meta = {
    note_id: noteId,
    slug: slug,
    title: title,
    status: 'draft',
    editing: {
      location: 'obsidian',
      locked_by: process.env.USER || 'user',
      locked_at: new Date().toISOString(),
      version: 'v0'
    },
    versions: {
      git_commit: null,
      note_revision: null,
      hash: {
        obsidian: null,
        html: null
      }
    },
    sync: {
      last_push: null,
      last_pull: null,
      conflicts: []
    }
  };
  
  await fs.writeFile(
    path.join(articleDir, 'meta.json'),
    JSON.stringify(meta, null, 2) + '\n'
  );
  
  console.log(chalk.green('\n✅ Article created!\n'));
  console.log(chalk.bold('📁 Directory:'));
  console.log(`   ${articleDir}/`);
  console.log('');
  console.log(chalk.bold('📄 Files:'));
  console.log(`   ✓ index.md`);
  console.log(`   ✓ meta.json`);
  console.log(`   ✓ assets/`);
  console.log('');
  console.log(chalk.bold('🚀 Next steps:'));
  console.log(`   1. Edit: cursor ${path.join(articleDir, 'index.md')}`);
  console.log(`   2. Push: npm run sync:push ${slug}`);
  console.log('');
}

main();

