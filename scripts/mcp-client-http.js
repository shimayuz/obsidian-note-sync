#!/usr/bin/env node

/**
 * MCP (Model Context Protocol) HTTP/SSE クライアント
 * note-mcp の HTTP/SSE モードに対応
 */

import fetch from 'node-fetch';
import { EventEmitter } from 'events';

export class MCPHTTPClient extends EventEmitter {
  constructor(baseUrl) {
    super();
    // デフォルト URL（環境変数または引数で上書き可能）
    const defaultUrl = process.env.NOTE_MCP_URL || 'http://127.0.0.1:3000';
    this.baseUrl = baseUrl || defaultUrl;
    
    // /mcp パスが含まれていない場合、追加
    if (!this.baseUrl.endsWith('/mcp')) {
      this.mcpEndpoint = this.baseUrl.endsWith('/') 
        ? `${this.baseUrl}mcp` 
        : `${this.baseUrl}/mcp`;
    } else {
      this.mcpEndpoint = this.baseUrl;
    }
    
    this.messageId = 0;
    this.pendingRequests = new Map();
  }

  /**
   * MCP サーバーにリクエストを送信（HTTP POST）
   */
  async call(method, params = {}) {
    const id = ++this.messageId;
    const request = {
      jsonrpc: '2.0',
      id,
      method,
      params
    };

    try {
      const response = await fetch(this.mcpEndpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(request)
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const result = await response.json();

      if (result.error) {
        throw new Error(result.error.message || 'MCP error');
      }

      return result.result;

    } catch (error) {
      throw new Error(`MCP call failed: ${error.message}`);
    }
  }

  /**
   * Tools/Call 形式でツールを実行
   */
  async executeTool(toolName, arguments_) {
    return this.call('tools/call', {
      name: toolName,
      arguments: arguments_
    });
  }

  /**
   * ヘルスチェック
   */
  async healthCheck() {
    try {
      const response = await fetch(`${this.baseUrl}/health`);
      return response.ok;
    } catch {
      return false;
    }
  }
}

/**
 * note-mcp 専用クライアント（HTTP/SSE 対応）
 */
export class NoteMCPHTTPClient {
  constructor(baseUrl) {
    this.client = new MCPHTTPClient(baseUrl);
  }

  /**
   * note の下書きを取得
   */
  async getDraft(noteId) {
    const result = await this.client.executeTool('get-note', { noteId });
    
    // MCP レスポンスの形式に応じてパース
    if (result.content && result.content[0]) {
      const content = result.content[0];
      if (typeof content.text === 'string') {
        return JSON.parse(content.text);
      }
      return content;
    }
    
    return result;
  }

  /**
   * note の下書きを更新
   */
  async updateDraft({ noteId, title, body, isPublic = false }) {
    const result = await this.client.executeTool('post-draft-note', {
      noteId,
      title,
      body,
      isPublic
    });
    
    if (result.content && result.content[0]) {
      const content = result.content[0];
      if (typeof content.text === 'string') {
        return JSON.parse(content.text);
      }
      return content;
    }
    
    return result;
  }

  /**
   * 画像をアップロード（note-mcp のツールを使用）
   */
  async uploadImage({ filename, data, contentType }) {
    // note-mcp に画像アップロードツールがある場合
    // なければ、base64 データをそのまま body に含める
    const result = await this.client.executeTool('upload-image', {
      filename,
      data,
      contentType
    }).catch(() => {
      // ツールが存在しない場合は、下書き更新時に画像URLを含める
      return { url: null };
    });
    
    return result;
  }

  /**
   * 自分の記事一覧を取得
   */
  async getMyNotes(options = {}) {
    const result = await this.client.executeTool('get-my-notes', options);
    
    if (result.content && result.content[0]) {
      const content = result.content[0];
      if (typeof content.text === 'string') {
        return JSON.parse(content.text);
      }
      return content;
    }
    
    return result;
  }
}

// CLI テスト用
if (import.meta.url === `file://${process.argv[1]}`) {
  const baseUrl = process.argv[2] || 'http://127.0.0.1:3000';
  const noteId = process.argv[3] || 'n/example';

  const client = new NoteMCPHTTPClient(baseUrl);
  
  try {
    console.log('Checking MCP server health...');
    const healthy = await client.client.healthCheck();
    
    if (!healthy) {
      console.error('❌ MCP server is not healthy');
      process.exit(1);
    }
    
    console.log('✅ MCP server is healthy');
    console.log(`Getting draft: ${noteId}`);
    
    const draft = await client.getDraft(noteId);
    console.log('Draft:', JSON.stringify(draft, null, 2));
    
  } catch (error) {
    console.error('Error:', error.message);
    process.exit(1);
  }
}

export { MCPHTTPClient };


