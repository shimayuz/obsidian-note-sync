#!/usr/bin/env node

/**
 * MCP (Model Context Protocol) クライアント
 * note-mcp サーバーと通信するためのラッパー
 */

import { spawn } from 'child_process';
import { EventEmitter } from 'events';

export class MCPClient extends EventEmitter {
  constructor(command, args = []) {
    super();
    this.command = command;
    this.args = args;
    this.process = null;
    this.messageId = 0;
    this.pendingRequests = new Map();
  }

  /**
   * MCP サーバーを起動
   */
  async start() {
    return new Promise((resolve, reject) => {
      this.process = spawn(this.command, this.args, {
        stdio: ['pipe', 'pipe', 'pipe']
      });

      this.process.stdout.on('data', (data) => {
        this.handleMessage(data.toString());
      });

      this.process.stderr.on('data', (data) => {
        console.error('MCP stderr:', data.toString());
      });

      this.process.on('error', (error) => {
        reject(error);
      });

      // 初期化完了を待つ
      setTimeout(() => resolve(), 1000);
    });
  }

  /**
   * MCP サーバーからのメッセージを処理
   */
  handleMessage(data) {
    try {
      const lines = data.split('\n').filter(line => line.trim());
      
      for (const line of lines) {
        const message = JSON.parse(line);
        
        if (message.id && this.pendingRequests.has(message.id)) {
          const { resolve, reject } = this.pendingRequests.get(message.id);
          this.pendingRequests.delete(message.id);
          
          if (message.error) {
            reject(new Error(message.error.message || 'MCP error'));
          } else {
            resolve(message.result);
          }
        }
      }
    } catch (error) {
      console.error('Failed to parse MCP message:', error);
    }
  }

  /**
   * MCP サーバーにリクエストを送信
   */
  async call(method, params = {}) {
    if (!this.process) {
      throw new Error('MCP server not started');
    }

    const id = ++this.messageId;
    const request = {
      jsonrpc: '2.0',
      id,
      method,
      params
    };

    return new Promise((resolve, reject) => {
      this.pendingRequests.set(id, { resolve, reject });
      
      this.process.stdin.write(JSON.stringify(request) + '\n');
      
      // タイムアウト（30秒）
      setTimeout(() => {
        if (this.pendingRequests.has(id)) {
          this.pendingRequests.delete(id);
          reject(new Error('MCP request timeout'));
        }
      }, 30000);
    });
  }

  /**
   * MCP サーバーを停止
   */
  async stop() {
    if (this.process) {
      this.process.kill();
      this.process = null;
    }
  }
}

/**
 * note-mcp 専用クライアント
 */
export class NoteMCPClient {
  constructor(mcpServerPath) {
    this.mcpServerPath = mcpServerPath;
    this.client = null;
  }

  async connect() {
    this.client = new MCPClient('node', [this.mcpServerPath]);
    await this.client.start();
  }

  async disconnect() {
    if (this.client) {
      await this.client.stop();
      this.client = null;
    }
  }

  /**
   * note の下書きを取得
   */
  async getDraft(noteId) {
    return this.client.call('tools/call', {
      name: 'note_get_draft',
      arguments: { noteId }
    });
  }

  /**
   * note の下書きを更新
   */
  async updateDraft({ noteId, title, body }) {
    return this.client.call('tools/call', {
      name: 'note_update_draft',
      arguments: { noteId, title, body }
    });
  }

  /**
   * 画像をアップロード
   */
  async uploadImage({ filename, data, contentType }) {
    return this.client.call('tools/call', {
      name: 'note_upload_image',
      arguments: { filename, data, contentType }
    });
  }
}

// CLI テスト用
if (import.meta.url === `file://${process.argv[1]}`) {
  const mcpPath = process.argv[2] || '../note-mcp/build/index.js';
  const noteId = process.argv[3] || 'n/example';

  const client = new NoteMCPClient(mcpPath);
  
  try {
    console.log('Connecting to note-mcp...');
    await client.connect();
    
    console.log('Getting draft:', noteId);
    const draft = await client.getDraft(noteId);
    console.log('Draft:', JSON.stringify(draft, null, 2));
    
  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await client.disconnect();
  }
}

