/**
 * note-mcp クライアント
 * 
 * note-mcp HTTP wrapper経由でnote APIにアクセス
 */

import type { NoteDraftData, NoteImage } from '../types.js';

const DEFAULT_MCP_SERVER_URL =
  process.env.NOTE_MCP_SERVER_URL || 'http://localhost:3001';

/**
 * note-mcp HTTP wrapper経由で下書きを取得
 */
export async function getDraft(noteId: string): Promise<NoteDraftData> {
  const response = await fetch(`${DEFAULT_MCP_SERVER_URL}/api/draft/get`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ note_id: noteId }),
  });

  if (!response.ok) {
    throw new Error(
      `Failed to get draft: ${noteId} (${response.status} ${response.statusText})`
    );
  }

  return (await response.json()) as NoteDraftData;
}

/**
 * note-mcp HTTP wrapper経由で下書きを更新
 */
export async function updateDraft(params: {
  noteId: string;
  title: string;
  html: string;
  images?: Array<{ path: string; data: string }>; // base64
}): Promise<{ success: boolean; revision: string }> {
  const response = await fetch(`${DEFAULT_MCP_SERVER_URL}/api/draft/update`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      note_id: params.noteId,
      title: params.title,
      html: params.html,
      images: params.images || [],
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(
      `Failed to update draft: ${params.noteId} (${response.status} ${response.statusText}) - ${error}`
    );
  }

  return (await response.json()) as { success: boolean; revision: string };
}

/**
 * note-mcp HTTP wrapper経由で公開記事を取得
 */
export async function getPublishedArticle(
  noteId: string
): Promise<NoteDraftData> {
  const response = await fetch(
    `${DEFAULT_MCP_SERVER_URL}/api/published/get`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ note_id: noteId }),
    }
  );

  if (!response.ok) {
    throw new Error(
      `Failed to get published article: ${noteId} (${response.status} ${response.statusText})`
    );
  }

  return (await response.json()) as NoteDraftData;
}

/**
 * HTMLから画像URLを抽出
 */
export function extractImageUrls(html: string): string[] {
  const urls: string[] = [];
  const imgRegex = /<img[^>]+src="([^"]+)"/g;
  let match;

  while ((match = imgRegex.exec(html)) !== null) {
    urls.push(match[1]);
  }

  return urls;
}

