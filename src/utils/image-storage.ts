/**
 * Content-addressable画像ストレージ
 * 
 * 画像はハッシュベースで保存し、重複を排除
 */

import { readFile, writeFile, mkdir, access } from 'fs/promises';
import { join, dirname, extname } from 'path';
import { createHash } from 'crypto';
import { hashContent } from './hash.js';

const IMAGE_STORAGE_DIR = 'assets/images';

/**
 * 画像をContent-addressable storageに保存
 * 既に存在する場合は既存のパスを返す
 */
export async function storeImage(
  imageBuffer: Buffer,
  originalUrl?: string
): Promise<{ hash: string; path: string; isNew: boolean }> {
  // 画像のハッシュを計算
  const hash = createHash('sha256').update(imageBuffer).digest('hex');
  
  // URLから拡張子を推測（なければContent-Typeから、なければjpg）
  const ext = originalUrl
    ? extname(new URL(originalUrl).pathname) || '.jpg'
    : '.jpg';
  
  const filename = `${hash}${ext}`;
  const dir = join(IMAGE_STORAGE_DIR, hash.substring(0, 2)); // 2文字目まででディレクトリ分割
  const path = join(dir, filename);
  
  // 既に存在するかチェック
  try {
    await access(path);
    return { hash, path, isNew: false };
  } catch {
    // 存在しないので保存
    await mkdir(dir, { recursive: true });
    await writeFile(path, imageBuffer);
    return { hash, path, isNew: true };
  }
}

/**
 * 画像URLをダウンロードしてストレージに保存
 */
export async function downloadAndStoreImage(
  url: string,
  cookieHeader?: string
): Promise<{ hash: string; path: string; isNew: boolean }> {
  const response = await fetch(url, {
    headers: cookieHeader
      ? {
          Cookie: cookieHeader,
          'User-Agent':
            'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
        }
      : undefined,
  });
  
  if (!response.ok) {
    throw new Error(`Failed to download image: ${url} (${response.status})`);
  }
  
  const buffer = Buffer.from(await response.arrayBuffer());
  return storeImage(buffer, url);
}

/**
 * 画像パスを相対パスに変換（記事からの相対パス）
 */
export function getRelativeImagePath(
  imagePath: string,
  articleDir: string
): string {
  // 既に相対パスの場合はそのまま
  if (!imagePath.startsWith('/') && !imagePath.match(/^[A-Z]:/)) {
    return imagePath;
  }
  
  // 絶対パスから相対パスに変換
  const path = require('path');
  return path.relative(articleDir, imagePath);
}

