/**
 * 型定義
 */

export interface ArticleMeta {
  note_id: string;
  slug: string;
  title: string;
  status: 'draft' | 'final' | 'published';
  
  editing: {
    location: 'obsidian' | 'note' | 'none';
    locked_by?: string;
    locked_at?: string;
    version: string;
  };
  
  versions: {
    git_commit?: string;
    note_revision?: string;
    hash: {
      obsidian: string;
      note: string;
    };
  };
  
  sync: {
    last_push?: string;
    last_pull?: string;
    conflicts: ConflictInfo[];
  };
}

export interface ConflictInfo {
  detected_at: string;
  type: 'diverged' | 'locked';
  obsidian_hash: string;
  note_hash: string;
  resolution?: 'obsidian' | 'note' | 'merged';
}

export interface NoteDraftData {
  note_id: string;
  title: string;
  body: string; // HTML
  images: NoteImage[];
  updated_at: string;
}

export interface NoteImage {
  url: string;
  alt?: string;
  width?: number;
  height?: number;
}

export interface SyncOptions {
  checkLock?: boolean;
  force?: boolean;
  dryRun?: boolean;
}

export interface MergeResult {
  success: boolean;
  content: string;
  conflicts: ConflictSection[];
}

export interface ConflictSection {
  start: number;
  end: number;
  obsidian_content: string;
  note_content: string;
  base_content: string;
}

