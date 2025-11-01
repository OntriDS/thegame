'use client';

import { useState, useCallback } from 'react';
import { EntityType } from '@/types/enums';

interface UseLogManagementOptions {
  onReload: () => void;
}

interface LogEntry {
  id?: string;
  name?: string;
  displayName?: string;
  isDeleted?: boolean;
  [key: string]: any;
}

/**
 * useLogManagement - Hook for managing log entries (delete, restore, edit)
 * 
 * Provides unified handlers for log management actions with confirmation dialogs
 * and proper error handling.
 */
export function useLogManagement({ onReload }: UseLogManagementOptions) {
  const [isManaging, setIsManaging] = useState(false);

  const handleDeleteEntry = useCallback(async (
    entityType: EntityType,
    entry: LogEntry
  ) => {
    if (!entry.id) {
      console.error('Entry has no ID, cannot delete');
      return;
    }

    // Confirmation dialog
    const entryName = entry.name || entry.displayName || 'Entry';
    if (!confirm(`Are you sure you want to delete this log entry?\n\n${entryName}`)) {
      return;
    }

    try {
      setIsManaging(true);
      const response = await fetch('/api/logs/manage', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          logType: entityType,
          action: 'delete',
          entryId: entry.id,
          reason: 'User requested deletion'
        })
      });

      if (!response.ok) {
        const error = await response.json();
        alert(`Failed to delete entry: ${error.error || 'Unknown error'}`);
        return;
      }

      // Reload log data
      onReload();
    } catch (error) {
      console.error('Error deleting entry:', error);
      alert('Failed to delete entry');
    } finally {
      setIsManaging(false);
    }
  }, [onReload]);

  const handleRestoreEntry = useCallback(async (
    entityType: EntityType,
    entry: LogEntry
  ) => {
    if (!entry.id) {
      console.error('Entry has no ID, cannot restore');
      return;
    }

    try {
      setIsManaging(true);
      const response = await fetch('/api/logs/manage', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          logType: entityType,
          action: 'restore',
          entryId: entry.id,
          reason: 'User requested restoration'
        })
      });

      if (!response.ok) {
        const error = await response.json();
        alert(`Failed to restore entry: ${error.error || 'Unknown error'}`);
        return;
      }

      // Reload log data
      onReload();
    } catch (error) {
      console.error('Error restoring entry:', error);
      alert('Failed to restore entry');
    } finally {
      setIsManaging(false);
    }
  }, [onReload]);

  const handleEditEntry = useCallback(async (
    entityType: EntityType,
    entry: LogEntry,
    updates: Record<string, any>
  ) => {
    if (!entry.id) {
      console.error('Entry has no ID, cannot edit');
      return;
    }

    try {
      setIsManaging(true);
      const response = await fetch('/api/logs/manage', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          logType: entityType,
          action: 'edit',
          entryId: entry.id,
          updates,
          reason: 'User requested edit'
        })
      });

      if (!response.ok) {
        const error = await response.json();
        alert(`Failed to edit entry: ${error.error || 'Unknown error'}`);
        return;
      }

      // Reload log data
      onReload();
    } catch (error) {
      console.error('Error editing entry:', error);
      alert('Failed to edit entry');
    } finally {
      setIsManaging(false);
    }
  }, [onReload]);

  return {
    handleDeleteEntry,
    handleRestoreEntry,
    handleEditEntry,
    isManaging
  };
}

