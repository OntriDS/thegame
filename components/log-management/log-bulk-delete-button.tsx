'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Trash2 } from 'lucide-react';
import { EntityType } from '@/types/enums';
import { FounderOnlyWrapper } from '@/components/common/founder-only-wrapper';
import type { LogViewFilterValue } from '@/components/log-management/log-view-filter';
import ConfirmationModal from '../modals/submodals/confirmation-submodal';

interface LogBulkDeleteButtonProps {
  entityType: EntityType;
  filter: LogViewFilterValue;
  visibleEntries: any[];
  onReload: () => void;
  isReloading: boolean;
  logManagementEnabled: boolean;
}

export function LogBulkDeleteButton({
  entityType,
  filter,
  visibleEntries,
  onReload,
  isReloading,
  logManagementEnabled
}: LogBulkDeleteButtonProps) {
  const [isDeletingAll, setIsDeletingAll] = useState(false);
  const [showConfirmDeleteAll, setShowConfirmDeleteAll] = useState(false);

  const deletedEntries = visibleEntries.filter((entry) => entry?.isDeleted && entry?.id);

  const handleDeleteAll = async () => {
    if (deletedEntries.length === 0) return;

    try {
      setIsDeletingAll(true);
      const failures: string[] = [];

      for (const entry of deletedEntries) {
        const response = await fetch('/api/logs/manage', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            logType: entityType,
            action: 'permanent-delete',
            entryId: entry.id,
            reason: 'Bulk permanent delete from Deleted view'
          })
        });

        if (!response.ok) {
          const error = await response.json().catch(() => ({ error: 'Unknown error' }));
          failures.push(`${entry.id}: ${error.error || 'Unknown error'}`);
          break;
        }
      }

      if (failures.length > 0) {
        alert(`Failed to permanently delete ${failures.length} entr${failures.length === 1 ? 'y' : 'ies'}.\n${failures[0]}`);
        return;
      }

      onReload();
    } catch (error) {
      console.error('Failed to delete all log entries:', error);
      alert('Failed to delete all log entries.');
    } finally {
      setIsDeletingAll(false);
    }
  };

  if (!logManagementEnabled || filter !== 'deleted' || deletedEntries.length === 0) {
    return null;
  }

  return (
    <FounderOnlyWrapper>
      <Button
        variant="destructive"
        size="sm"
        onClick={() => setShowConfirmDeleteAll(true)}
        disabled={isReloading || isDeletingAll}
      >
        <Trash2 className={`h-4 w-4 mr-2 ${isDeletingAll ? 'animate-pulse' : ''}`} />
        {isDeletingAll ? 'Deleting...' : `Delete All (${deletedEntries.length})`}
      </Button>
      <ConfirmationModal
        open={showConfirmDeleteAll}
        onOpenChange={(open) => !open && setShowConfirmDeleteAll(false)}
        title="Permanently Delete All Log Entries"
        description={`Are you sure you want to permanently delete ${deletedEntries.length} log entries in the Deleted view? This action cannot be undone and will remove them from the system.`}
        confirmText="Permanently Delete"
        cancelText="Cancel"
        variant="destructive"
        onConfirm={handleDeleteAll}
        isLoading={isDeletingAll}
      />
    </FounderOnlyWrapper>
  );
}
