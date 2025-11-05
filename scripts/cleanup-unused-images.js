#!/usr/bin/env node

/**
 * 未使用画像をクリーンアップするスクリプト
 */

import { glob } from 'glob';
import fs from 'fs/promises';
import path from 'path';
import chalk from 'chalk';

async function cleanupArticle(articleDir) {
  const mdPath = path.join(articleDir, 'index.md');
  const assetsDir = path.join(articleDir, 'assets');
  
  try {
    // Markdown 内で使われている画像を抽出
    const markdown = await fs.readFile(mdPath, 'utf-8');
    const usedImages = new Set();
    
    const imgRegex = /!\[[^\]]*\]\(([^)]+)\)/g;
    let match;
    
    while ((match = imgRegex.exec(markdown)) !== null) {
      const imgPath = match[1].replace('assets/', '');
      usedImages.add(imgPath);
    }
    
    // assets/ 内の全画像をチェック
    const allFiles = await fs.readdir(assetsDir);
    const imageFiles = allFiles.filter(file => 
      /\.(webp|png|jpg|jpeg|gif)$/i.test(file)
    );
    
    const unusedImages = imageFiles.filter(img => !usedImages.has(img));
    
    if (unusedImages.length === 0) {
      console.log(chalk.green(`✓ ${path.basename(articleDir)}: No unused images`));
      return { moved: 0 };
    }
    
    // 未使用画像を .trash/ へ移動
    const trashDir = path.join(articleDir, '.trash');
    await fs.mkdir(trashDir, { recursive: true });
    
    for (const img of unusedImages) {
      const timestamp = Date.now();
      await fs.rename(
        path.join(assetsDir, img),
        path.join(trashDir, `${img}.${timestamp}`)
      );
      
      console.log(chalk.yellow(`  Moved to trash: ${img}`));
    }
    
    return { moved: unusedImages.length };
    
  } catch (error) {
    console.error(chalk.red(`✗ ${path.basename(articleDir)}: ${error.message}`));
    return { moved: 0 };
  }
}

async function main() {
  console.log(chalk.bold('\n🧹 Cleaning up unused images...\n'));
  
  const articles = await glob('articles/*', { onlyDirectories: true });
  let totalMoved = 0;
  
  for (const articleDir of articles) {
    const result = await cleanupArticle(articleDir);
    totalMoved += result.moved;
  }
  
  console.log(chalk.bold(`\n📊 Summary: ${totalMoved} images moved to trash\n`));
  
  if (totalMoved > 0) {
    console.log(chalk.gray('Trash directories can be safely deleted after verification.'));
    console.log(chalk.gray('To restore: mv articles/*/.trash/* articles/*/assets/\n'));
  }
}

main();

