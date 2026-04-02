'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Trash2 } from 'lucide-react';
import { EntityType } from '@/types/enums';
import { FounderOnlyWrapper } from '@/components/common/founder-only-wrapper';
import type { LogViewFilterValue } from '@/components/log-management/log-view-filter';

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

  const deletedEntries = visibleEntries.filter((entry) => entry?.isDeleted && entry?.id);

  const handleDeleteAll = async () => {
    if (deletedEntries.length === 0) return;
    if (!confirm(`Delete ${deletedEntries.length} deleted ${deletedEntries.length === 1 ? 'entry' : 'entries'} permanently? This cannot be undone.`)) {
      return;
    }

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
        onClick={handleDeleteAll}
        disabled={isReloading || isDeletingAll}
      >
        <Trash2 className={`h-4 w-4 mr-2 ${isDeletingAll ? 'animate-pulse' : ''}`} />
        {isDeletingAll ? 'Deleting...' : `Delete All (${deletedEntries.length})`}
      </Button>
    </FounderOnlyWrapper>
  );
}
