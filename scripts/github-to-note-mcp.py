#!/usr/bin/env python3
"""
GitHub から note.com に投稿（note-mcp 経由）
認証は note-mcp が管理するため、GitHub には認証情報を保存しない
"""

import os
import sys
import json
import requests
import re

def call_mcp_tool(mcp_url, tool_name, arguments):
    """MCP ツールを呼び出し"""
    mcp_endpoint = mcp_url if mcp_url.endswith('/mcp') else f"{mcp_url}/mcp"
    
    request_data = {
        "jsonrpc": "2.0",
        "id": 1,
        "method": "tools/call",
        "params": {
            "name": tool_name,
            "arguments": arguments
        }
    }
    
    response = requests.post(
        mcp_endpoint,
        headers={'Content-Type': 'application/json'},
        json=request_data,
        timeout=30
    )
    
    if response.status_code != 200:
        raise Exception(f"MCP request failed: {response.status_code}")
    
    result = response.json()
    
    if 'error' in result:
        raise Exception(f"MCP error: {result['error'].get('message', 'Unknown error')}")
    
    # MCP レスポンス形式を処理
    if 'result' in result and 'content' in result['result']:
        content = result['result']['content'][0]
        if 'text' in content:
            return json.loads(content['text'])
        return content
    
    return result.get('result', {})

def fetch_github_content(repo, branch, file_path):
    """GitHub Raw API からファイルを取得"""
    url = f"https://raw.githubusercontent.com/{repo}/{branch}/{file_path}"
    response = requests.get(url)
    
    if response.status_code != 200:
        raise Exception(f"Failed to fetch from GitHub: {response.status_code}")
    
    return response.text

def markdown_to_html(markdown):
    """Markdown を HTML に変換"""
    html = markdown
    
    # 見出し
    html = re.sub(r'^# (.+)$', r'<h1>\1</h1>', html, flags=re.MULTILINE)
    html = re.sub(r'^## (.+)$', r'<h2>\1</h2>', html, flags=re.MULTILINE)
    html = re.sub(r'^### (.+)$', r'<h3>\1</h3>', html, flags=re.MULTILINE)
    
    # コードブロック
    html = re.sub(r'```(\w+)?\n(.*?)```', r'<pre><code>\2</code></pre>', html, flags=re.DOTALL)
    
    # 強調
    html = re.sub(r'\*\*(.+?)\*\*', r'<strong>\1</strong>', html)
    html = re.sub(r'\*(.+?)\*', r'<em>\1</em>', html)
    
    # リスト
    html = re.sub(r'^- (.+)$', r'<li>\1</li>', html, flags=re.MULTILINE)
    html = re.sub(r'(<li>.*?</li>)', r'<ul>\1</ul>', html, flags=re.DOTALL)
    html = re.sub(r'</ul>\s*<ul>', '', html)
    
    # リンク
    html = re.sub(r'\[([^\]]+)\]\(([^)]+)\)', r'<a href="\2">\1</a>', html)
    
    # 画像
    html = re.sub(r'!\[([^\]]*)\]\(([^)]+)\)', r'<img src="\2" alt="\1">', html)
    
    # 引用
    html = re.sub(r'^> (.+)$', r'<blockquote>\1</blockquote>', html, flags=re.MULTILINE)
    
    # 改行・段落
    html = re.sub(r'\n\n+', '</p><p>', html)
    html = re.sub(r'\n', '<br>', html)
    
    html = '<p>' + html + '</p>'
    
    # クリーンアップ
    html = re.sub(r'<p></p>', '', html)
    html = re.sub(r'<p>\s*<(h[1-6]|ul|blockquote|pre)', r'<\1', html)
    html = re.sub(r'</(h[1-6]|ul|blockquote|pre)>\s*</p>', r'</\1>', html)
    
    return html

def main():
    if len(sys.argv) < 4:
        print("Usage: python github-to-note-mcp.py <repo> <branch> <slug>")
        sys.exit(1)
    
    repo = sys.argv[1]
    branch = sys.argv[2]
    slug = sys.argv[3]
    
    # note-mcp の URL（認証情報は不要）
    mcp_url = os.environ.get('NOTE_MCP_URL')
    
    if not mcp_url:
        print("Error: NOTE_MCP_URL must be set")
        sys.exit(1)
    
    try:
        # meta.json を取得
        print(f"Fetching meta.json from GitHub...")
        meta_path = f"articles/{slug}/meta.json"
        meta_content = fetch_github_content(repo, branch, meta_path)
        meta = json.loads(meta_content)
        
        note_id = meta['note_id']
        title = meta['title']
        
        # index.md を取得
        print(f"Fetching index.md from GitHub...")
        md_path = f"articles/{slug}/index.md"
        markdown = fetch_github_content(repo, branch, md_path)
        
        # Markdown → HTML
        print(f"Converting Markdown to HTML...")
        html = markdown_to_html(markdown)
        
        # note-mcp 経由で投稿（認証は note-mcp が管理）
        print(f"Posting to note.com via MCP: {note_id}")
        result = call_mcp_tool(mcp_url, 'post-draft-note', {
            'noteId': note_id,
            'title': title,
            'body': html,
            'isPublic': False
        })
        
        print(f"✅ Successfully updated: {note_id}")
        print(json.dumps(result, indent=2, ensure_ascii=False))
        
    except Exception as e:
        print(f"❌ Error: {str(e)}")
        import traceback
        traceback.print_exc()
        sys.exit(1)

if __name__ == "__main__":
    main()

