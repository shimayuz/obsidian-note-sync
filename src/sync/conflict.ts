/**
 * 競合検知・3-way diff
 */

import { diff_match_patch } from 'diff-match-patch';
import type { MergeResult, ConflictSection } from '../types.js';

const dmp = new diff_match_patch();

/**
 * 3-way diffを実行して競合を検出
 */
export function detectConflicts(
  baseContent: string,
  obsidianContent: string,
  noteContent: string
): MergeResult {
  // Obsidian側の変更
  const obsidianDiff = dmp.diff_main(baseContent, obsidianContent);
  dmp.diff_cleanupSemantic(obsidianDiff);
  
  // note側の変更
  const noteDiff = dmp.diff_main(baseContent, noteContent);
  dmp.diff_cleanupSemantic(noteDiff);
  
  // 変更箇所の行番号を抽出
  const obsidianChangedLines = getChangedLines(
    baseContent,
    obsidianDiff
  );
  const noteChangedLines = getChangedLines(baseContent, noteDiff);
  
  // 重複チェック
  const hasOverlap = [...obsidianChangedLines].some((line: number) =>
    noteChangedLines.has(line)
  );
  
  if (!hasOverlap) {
    // 重複なし → 自動マージ可能
    const merged = attemptAutoMerge(
      baseContent,
      obsidianContent,
      noteContent
    );
    return {
      success: true,
      content: merged,
      conflicts: [],
    };
  }
  
  // 重複あり → 競合セクションを抽出
  const conflicts = extractConflictSections(
    baseContent,
    obsidianContent,
    noteContent,
    obsidianChangedLines,
    noteChangedLines
  );
  
  return {
    success: false,
    content: '', // 手動解決が必要
    conflicts,
  };
}

/**
 * 変更された行番号を取得
 */
function getChangedLines(
  baseContent: string,
  diff: Array<[number, string]>
): Set<number> {
  const lines = new Set<number>();
  let lineNumber = 1;
  
  for (const [op, text] of diff) {
    const textLines = text.split('\n');
    
    if (op === -1 || op === 1) {
      // 削除または追加
      for (let i = 0; i < textLines.length - 1; i++) {
        lines.add(lineNumber + i);
      }
    }
    
    if (op !== -1) {
      // 削除でない場合は行番号を進める
      lineNumber += textLines.length - 1;
    }
  }
  
  return lines;
}

/**
 * 自動マージを試行（変更箇所が重複しない場合）
 */
function attemptAutoMerge(
  base: string,
  obsidian: string,
  note: string
): string {
  // 簡単な実装：obsidianの変更を先に適用、次にnoteの変更を適用
  // より高度な実装ではgit merge-fileのようなロジックが必要
  
  const patches = dmp.patch_make(base, obsidian);
  let merged = dmp.patch_apply(patches, base)[0];
  
  const notePatches = dmp.patch_make(base, note);
  merged = dmp.patch_apply(notePatches, merged)[0];
  
  return merged;
}

/**
 * 競合セクションを抽出
 */
function extractConflictSections(
  base: string,
  obsidian: string,
  note: string,
  obsidianLines: Set<number>,
  noteLines: Set<number>
): ConflictSection[] {
  const conflicts: ConflictSection[] = [];
  const baseLines = base.split('\n');
  
  // 重複している行番号を取得
  const conflictLines = [...obsidianLines].filter((line) =>
    noteLines.has(line)
  );
  
  if (conflictLines.length === 0) {
    return [];
  }
  
  // 連続する行をグループ化
  const groups: number[][] = [];
  let currentGroup: number[] = [];
  
  for (const line of conflictLines.sort((a, b) => a - b)) {
    if (
      currentGroup.length === 0 ||
      line === currentGroup[currentGroup.length - 1] + 1
    ) {
      currentGroup.push(line);
    } else {
      groups.push(currentGroup);
      currentGroup = [line];
    }
  }
  if (currentGroup.length > 0) {
    groups.push(currentGroup);
  }
  
  // 各グループをConflictSectionに変換
  for (const group of groups) {
    const start = group[0] - 1; // 0-indexed
    const end = group[group.length - 1];
    
    const obsidianLinesArr = obsidian.split('\n');
    const noteLinesArr = note.split('\n');
    
    conflicts.push({
      start,
      end,
      obsidian_content: obsidianLinesArr.slice(start, end).join('\n'),
      note_content: noteLinesArr.slice(start, end).join('\n'),
      base_content: baseLines.slice(start, end).join('\n'),
    });
  }
  
  return conflicts;
}

/**
 * 競合ファイルをMarkdown形式でフォーマット
 */
export function formatConflictFile(
  obsidianContent: string,
  noteContent: string,
  conflicts: ConflictSection[]
): string {
  const lines: string[] = [
    '# ⚠️ 競合が検出されました',
    '',
    '以下のセクションで競合が発生しています。手動で解決してください。',
    '',
    '---',
    '',
  ];
  
  for (const conflict of conflicts) {
    lines.push(`## 競合セクション (行 ${conflict.start + 1}-${conflict.end})`);
    lines.push('');
    lines.push('### Obsidian版:');
    lines.push('```');
    lines.push(conflict.obsidian_content);
    lines.push('```');
    lines.push('');
    lines.push('### note版:');
    lines.push('```');
    lines.push(conflict.note_content);
    lines.push('```');
    lines.push('');
    lines.push('### ベース版:');
    lines.push('```');
    lines.push(conflict.base_content);
    lines.push('```');
    lines.push('');
    lines.push('---');
    lines.push('');
  }
  
  return lines.join('\n');
}

