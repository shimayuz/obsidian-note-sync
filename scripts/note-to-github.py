#!/usr/bin/env python3
"""
note.com から GitHub に pull
"""

import os
import sys
import json
import requests
import base64
from pathlib import Path
import re

def login_to_note(email, password):
    """note.com にログイン"""
    session = requests.Session()
    
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
    
    xsrf_token = None
    for cookie in session.cookies:
        if 'xsrf' in cookie.name.lower():
            xsrf_token = cookie.value
            break
    
    return session, xsrf_token

def get_note_content(session, note_id):
    """note.com から記事を取得"""
    url = f"https://note.com/api/v3/notes/{note_id}"
    response = session.get(url)
    
    if response.status_code != 200:
        raise Exception(f"Failed to get note: {response.status_code}")
    
    data = response.json()
    return data['data']

def html_to_markdown(html):
    """HTML を Markdown に変換（簡易版）"""
    md = html
    
    # 見出し
    md = re.sub(r'<h1>(.+?)</h1>', r'# \1', md)
    md = re.sub(r'<h2>(.+?)</h2>', r'## \1', md)
    md = re.sub(r'<h3>(.+?)</h3>', r'### \1', md)
    
    # 強調
    md = re.sub(r'<strong>(.+?)</strong>', r'**\1**', md)
    md = re.sub(r'<em>(.+?)</em>', r'*\1*', md)
    
    # リスト
    md = re.sub(r'<li>(.+?)</li>', r'- \1', md)
    md = re.sub(r'</?ul>', '', md)
    
    # 改行・段落
    md = re.sub(r'<br\s*/?>', '\n', md)
    md = re.sub(r'</p>\s*<p>', '\n\n', md)
    md = re.sub(r'</?p>', '', md)
    
    # 残りの HTML タグを削除
    md = re.sub(r'<[^>]+>', '', md)
    
    # 連続する改行を整理
    md = re.sub(r'\n{3,}', '\n\n', md)
    
    return md.strip()

def commit_to_github(repo, branch, file_path, content, message, token):
    """GitHub API でファイルをコミット"""
    url = f"https://api.github.com/repos/{repo}/contents/{file_path}"
    
    headers = {
        'Authorization': f'Bearer {token}',
        'Accept': 'application/vnd.github.v3+json'
    }
    
    # 既存ファイルの SHA を取得
    response = requests.get(url, headers=headers, params={'ref': branch})
    sha = None
    if response.status_code == 200:
        sha = response.json()['sha']
    
    # コミット
    data = {
        'message': message,
        'content': base64.b64encode(content.encode('utf-8')).decode('utf-8'),
        'branch': branch
    }
    
    if sha:
        data['sha'] = sha
    
    response = requests.put(url, headers=headers, json=data)
    
    if response.status_code not in [200, 201]:
        raise Exception(f"Failed to commit: {response.status_code} - {response.text}")
    
    return response.json()

def main():
    # 引数
    if len(sys.argv) < 4:
        print("Usage: python note-to-github.py <repo> <branch> <slug>")
        sys.exit(1)
    
    repo = sys.argv[1]
    branch = sys.argv[2]
    slug = sys.argv[3]
    
    # 環境変数
    email = os.environ.get('NOTE_EMAIL')
    password = os.environ.get('NOTE_PASSWORD')
    github_token = os.environ.get('GITHUB_TOKEN')
    
    if not all([email, password, github_token]):
        print("Error: NOTE_EMAIL, NOTE_PASSWORD, GITHUB_TOKEN must be set")
        sys.exit(1)
    
    try:
        # meta.json を取得
        meta_url = f"https://raw.githubusercontent.com/{repo}/{branch}/articles/{slug}/meta.json"
        meta_response = requests.get(meta_url)
        
        if meta_response.status_code != 200:
            raise Exception(f"Failed to get meta.json: {meta_response.status_code}")
        
        meta = json.loads(meta_response.text)
        note_id = meta['note_id']
        
        # note にログイン
        print(f"Logging in to note.com...")
        session, xsrf_token = login_to_note(email, password)
        
        # note から記事を取得
        print(f"Getting note: {note_id}")
        note_data = get_note_content(session, note_id)
        
        # HTML → Markdown
        html = note_data.get('body', '')
        markdown = html_to_markdown(html)
        
        # GitHub にコミット
        print(f"Committing to GitHub: articles/{slug}/index.md")
        file_path = f"articles/{slug}/index.md"
        result = commit_to_github(
            repo, 
            branch, 
            file_path, 
            markdown,
            f"chore: pull from note.com [{slug}] [skip ci]",
            github_token
        )
        
        print(f"✅ Successfully committed: {result['commit']['sha']}")
        
    except Exception as e:
        print(f"❌ Error: {str(e)}")
        sys.exit(1)

if __name__ == "__main__":
    main()

