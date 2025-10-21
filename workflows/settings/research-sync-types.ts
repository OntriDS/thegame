export interface SyncResult {
  synced: string[];
  skipped: string[];
  conflicts: string[];
  errors: string[];
}

export interface SyncStrategy {
  type: 'force' | 'smart' | 'migrate-once';
  description: string;
}

/**
 * Sync strategies for different research data types
 */
export const SYNC_STRATEGIES: Record<string, SyncStrategy> = {
  'project-status': {
    type: 'force',
    description: 'Always overwrite KV with local (version controlled)'
  },
  'dev-log': {
    type: 'smart', 
    description: 'Check timestamps, warn on conflicts (can be edited locally or via UI)'
  },
  'notes-log': {
    type: 'migrate-once',
    description: 'One-time migration, then KV becomes source of truth'
  }
};
