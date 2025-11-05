/**
 * Markdown → HTML変換
 */

import { remark } from 'remark';
import remarkGfm from 'remark-gfm';
import remarkRehype from 'remark-rehype';
import rehypeStringify from 'rehype-stringify';

const processor = remark()
  .use(remarkGfm) // GFM拡張（テーブル、タスクリスト）
  .use(remarkRehype, { allowDangerousHtml: false }) // HTML禁止
  .use(rehypeStringify);

/**
 * MarkdownをHTMLに変換
 */
export async function markdownToHtml(markdown: string): Promise<string> {
  const result = await processor.process(markdown);
  return result.toString();
}

/**
 * Markdown内の相対パス画像を処理
 * （画像は事前にnoteにアップロード済みと仮定）
 */
export function processImagePaths(
  html: string,
  imagePathMap: Map<string, string> // localPath → note URL
): string {
  // <img src="assets/..." /> → <img src="https://note.com/..." />
  return html.replace(
    /<img([^>]+)src="([^"]+)"/g,
    (match, attrs, src) => {
      // 相対パスの場合のみ置換
      if (src.startsWith('http')) {
        return match;
      }
      const noteUrl = imagePathMap.get(src);
      return noteUrl
        ? `<img${attrs}src="${noteUrl}"`
        : match;
    }
  );
}

