/**
 * HTML → Markdown変換
 */

import TurndownService from 'turndown';
import { gfm } from 'turndown-plugin-gfm';

const turndownService = new TurndownService({
  headingStyle: 'atx', // # 形式
  codeBlockStyle: 'fenced', // ```形式
  bulletListMarker: '-', // - 形式
  emDelimiter: '*', // *強調*
  strongDelimiter: '**', // **太字**
  linkStyle: 'inlined', // [text](url)
  linkReferenceStyle: 'full',
});

turndownService.use(gfm);

// カスタムルール: figcaption → blockquote
turndownService.addRule('figcaption', {
  filter: 'figcaption',
  replacement: (content) => `> ${content}\n`,
});

// カスタムルール: 空のdivを除去
turndownService.addRule('removeEmptyDivs', {
  filter: (node) =>
    node.tagName === 'DIV' && !node.textContent?.trim(),
  replacement: () => '',
});

// カスタムルール: spanは除去（テキストのみ抽出）
turndownService.addRule('span', {
  filter: 'span',
  replacement: (content) => content,
});

/**
 * HTMLをMarkdownに変換
 */
export function htmlToMarkdown(html: string): string {
  return turndownService.turndown(html);
}

/**
 * HTML内の画像URLを相対パスに置換
 */
export function replaceImageUrls(
  markdown: string,
  imageMap: Map<string, string>
): string {
  // ![](https://...) → ![](assets/...)
  return markdown.replace(
    /!\[([^\]]*)\]\((https:\/\/[^\)]+)\)/g,
    (match, alt, url) => {
      const localPath = imageMap.get(url);
      return localPath ? `![${alt}](${localPath})` : match;
    }
  );
}

