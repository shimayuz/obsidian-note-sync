#!/usr/bin/env python3
"""
GitHub から note.com に直接投稿
GitHub Actions で実行される想定
"""

import os
import sys
import json
import requests
from pathlib import Path
import re

def login_to_note(email, password):
    """note.com にログイン"""
    session = requests.Session()
    
    # ログイン
    login_url = "https://note.com/api/v1/sessions/sign_in"
    response = session.post(login_url, json={
        "email": email,
        "password": password
    })
    
    if response.status_code != 201:
        raise Exception(f"Login failed: {response.status_code}")
    
    # XSRF Token を取得
    current_user_url = "https://note.com/api/v2/current_user"
    response = session.get(current_user_url)
    
    # Cookie から XSRF Token を取得
    xsrf_token = None
    for cookie in session.cookies:
        if 'xsrf' in cookie.name.lower():
            xsrf_token = cookie.value
            break
    
    return session, xsrf_token

def fetch_github_content(repo, branch, file_path):
    """GitHub Raw API からファイルを取得"""
    url = f"https://raw.githubusercontent.com/{repo}/{branch}/{file_path}"
    response = requests.get(url)
    
    if response.status_code != 200:
        raise Exception(f"Failed to fetch from GitHub: {response.status_code}")
    
    return response.text

def extract_metadata(content):
    """Frontmatter からメタデータを抽出"""
    # YAML Frontmatter のパース
    match = re.match(r'^---\n(.*?)\n---\n(.*)$', content, re.DOTALL)
    
    if not match:
        return {}, content
    
    frontmatter_text = match.group(1)
    body = match.group(2)
    
    # 簡易的な YAML パース
    metadata = {}
    for line in frontmatter_text.split('\n'):
        if ':' in line:
            key, value = line.split(':', 1)
            metadata[key.strip()] = value.strip().strip('"').strip("'")
    
    return metadata, body

def markdown_to_html(markdown):
    """Markdown を HTML に変換（簡易版）"""
    html = markdown
    
    # 見出し
    html = re.sub(r'^# (.+)$', r'<h1>\1</h1>', html, flags=re.MULTILINE)
    html = re.sub(r'^## (.+)$', r'<h2>\1</h2>', html, flags=re.MULTILINE)
    html = re.sub(r'^### (.+)$', r'<h3>\1</h3>', html, flags=re.MULTILINE)
    
    # 強調
    html = re.sub(r'\*\*(.+?)\*\*', r'<strong>\1</strong>', html)
    html = re.sub(r'\*(.+?)\*', r'<em>\1</em>', html)
    
    # リスト
    html = re.sub(r'^- (.+)$', r'<li>\1</li>', html, flags=re.MULTILINE)
    html = re.sub(r'(<li>.*</li>)', r'<ul>\1</ul>', html, flags=re.DOTALL)
    html = re.sub(r'</ul>\s*<ul>', '', html)
    
    # 改行
    html = re.sub(r'\n\n', '</p><p>', html)
    html = re.sub(r'\n', '<br>', html)
    
    html = '<p>' + html + '</p>'
    
    return html

def post_to_note(session, xsrf_token, note_id, title, body):
    """note.com の下書きを更新"""
    url = f"https://note.com/api/v3/notes/{note_id}"
    
    headers = {
        'Content-Type': 'application/json',
        'X-XSRF-TOKEN': xsrf_token
    }
    
    data = {
        "note": {
            "name": title,
            "body": body,
            "publish_at": None,  # 下書きとして保存
            "status": "draft"
        }
    }
    
    response = session.put(url, headers=headers, json=data)
    
    if response.status_code not in [200, 201]:
        raise Exception(f"Failed to update note: {response.status_code} - {response.text}")
    
    return response.json()

def main():
    # 引数から情報を取得
    if len(sys.argv) < 4:
        print("Usage: python github-to-note.py <repo> <branch> <slug>")
        sys.exit(1)
    
    repo = sys.argv[1]  # e.g., "username/repo-name"
    branch = sys.argv[2]  # e.g., "main"
    slug = sys.argv[3]  # e.g., "my-article"
    
    # 環境変数から認証情報を取得
    email = os.environ.get('NOTE_EMAIL')
    password = os.environ.get('NOTE_PASSWORD')
    
    if not email or not password:
        print("Error: NOTE_EMAIL and NOTE_PASSWORD must be set")
        sys.exit(1)
    
    try:
        # meta.json を取得
        meta_path = f"articles/{slug}/meta.json"
        meta_content = fetch_github_content(repo, branch, meta_path)
        meta = json.loads(meta_content)
        
        note_id = meta['note_id']
        
        # index.md を取得
        md_path = f"articles/{slug}/index.md"
        markdown = fetch_github_content(repo, branch, md_path)
        
        # メタデータを抽出（Frontmatter があれば）
        frontmatter, body = extract_metadata(markdown)
        title = frontmatter.get('title', meta.get('title', 'Untitled'))
        
        # Markdown → HTML
        html = markdown_to_html(body)
        
        # note にログイン
        print(f"Logging in to note.com...")
        session, xsrf_token = login_to_note(email, password)
        
        # note に投稿
        print(f"Posting to note.com: {note_id}")
        result = post_to_note(session, xsrf_token, note_id, title, html)
        
        print(f"✅ Successfully updated: {note_id}")
        print(json.dumps(result, indent=2, ensure_ascii=False))
        
    except Exception as e:
        print(f"❌ Error: {str(e)}")
        sys.exit(1)

if __name__ == "__main__":
    main()

