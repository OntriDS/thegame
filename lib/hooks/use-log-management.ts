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
    entry: LogEntry,
    reason?: string
  ) => {
    if (!entry.id) {
      console.error('Entry has no ID, cannot delete');
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
          reason: reason || 'User requested deletion'
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
    updates: Record<string, any>,
    reason?: string
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
          reason: reason || 'User requested edit'
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

  const [showPermanentDeleteConfirm, setShowPermanentDeleteConfirm] = useState<{
    entry: LogEntry;
    entityType: EntityType;
    reason?: string;
  } | null>(null);

  const handlePermanentDeleteEntry = useCallback(async (
    entityType: EntityType,
    entry: LogEntry,
    reason?: string
  ) => {
    if (!entry.id) {
      console.error('Entry has no ID, cannot permanently delete');
      return;
    }

    // Show confirmation modal instead of browser confirm
    setShowPermanentDeleteConfirm({ entry, entityType, reason });
  }, []);

  const confirmPermanentDelete = useCallback(async () => {
    if (!showPermanentDeleteConfirm) return;

    const { entry, entityType, reason } = showPermanentDeleteConfirm;

    try {
      setIsManaging(true);
      const response = await fetch('/api/logs/manage', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          logType: entityType,
          action: 'permanent-delete',
          entryId: entry.id,
          reason: reason || 'User requested permanent deletion'
        })
      });

      if (!response.ok) {
        const error = await response.json();
        alert(`Failed to permanently delete entry: ${error.error || 'Unknown error'}`);
        return;
      }

      // Reload log data
      onReload();
    } catch (error) {
      console.error('Error permanently deleting entry:', error);
      alert('Failed to permanently delete entry');
    } finally {
      setIsManaging(false);
      setShowPermanentDeleteConfirm(null);
    }
  }, [showPermanentDeleteConfirm, onReload]);

  return {
    handleDeleteEntry,
    handleRestoreEntry,
    handlePermanentDeleteEntry,
    handleEditEntry,
    isManaging,
    // Confirmation modal state
    showPermanentDeleteConfirm,
    setShowPermanentDeleteConfirm,
    confirmPermanentDelete
  };
}

