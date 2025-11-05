#!/usr/bin/env node

/**
 * 画像最適化スクリプト
 * WebP 変換 + リサイズ + Content-addressable naming
 */

import sharp from 'sharp';
import crypto from 'crypto';
import fs from 'fs/promises';
import path from 'path';
import chalk from 'chalk';

const MAX_WIDTH = 1200;
const QUALITY = 85;

async function optimizeImage(inputPath, outputDir) {
  try {
    // 画像を読み込み
    const buffer = await fs.readFile(inputPath);
    
    // SHA256 計算
    const hash = crypto.createHash('sha256').update(buffer).digest('hex').slice(0, 16);
    
    // WebP 変換 + 最適化
    const optimized = await sharp(buffer)
      .resize(MAX_WIDTH, null, {
        withoutEnlargement: true,
        fit: 'inside'
      })
      .webp({ quality: QUALITY })
      .toBuffer();
    
    // 保存
    const outputPath = path.join(outputDir, `${hash}.webp`);
    await fs.writeFile(outputPath, optimized);
    
    // 元ファイルとの比較
    const originalSize = buffer.length;
    const optimizedSize = optimized.length;
    const savings = ((1 - optimizedSize / originalSize) * 100).toFixed(1);
    
    console.log(chalk.green(`✓ ${path.basename(inputPath)}`));
    console.log(chalk.gray(`  → ${hash}.webp (${savings}% smaller)`));
    
    return {
      hash,
      outputPath,
      originalSize,
      optimizedSize
    };
    
  } catch (error) {
    console.error(chalk.red(`✗ ${path.basename(inputPath)}: ${error.message}`));
    return null;
  }
}

async function main() {
  const [,, inputPath, outputDir = 'assets'] = process.argv;
  
  if (!inputPath) {
    console.error(chalk.red('Error: Input path required'));
    console.log('Usage: node optimize-image.js <input> [output-dir]');
    process.exit(1);
  }
  
  console.log(chalk.bold('\n🖼️  Optimizing image...\n'));
  
  await fs.mkdir(outputDir, { recursive: true });
  
  const result = await optimizeImage(inputPath, outputDir);
  
  if (result) {
    console.log(chalk.bold('\n✅ Optimization complete!\n'));
  } else {
    process.exit(1);
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}

export { optimizeImage };

