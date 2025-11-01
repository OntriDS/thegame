'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { MoreVertical, Trash2 } from 'lucide-react';
import { FounderOnlyWrapper } from '@/components/common/founder-only-wrapper';
import { EntityType } from '@/types/enums';
import { useLogManagement } from '@/lib/hooks/use-log-management';
import { LogDeleteConfirmDialog } from './log-delete-confirm-dialog';

interface LogManagementActionsProps {
  entityType: EntityType;
  entry: any;
  onReload: () => void;
  logManagementEnabled: boolean;
}

/**
 * LogManagementActions - Dropdown menu for log entry actions
 * 
 * Shows delete/restore actions based on entry state.
 * Only visible when log management is enabled and user has Founder permissions.
 */
export function LogManagementActions({ 
  entityType, 
  entry, 
  onReload,
  logManagementEnabled 
}: LogManagementActionsProps) {
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const { handleDeleteEntry, handleRestoreEntry, isManaging } = useLogManagement({ onReload });

  const entryName = entry.displayName || entry.name || 'Entry';

  return (
    <FounderOnlyWrapper>
      {logManagementEnabled && entry.id && (
        <>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm" className="h-6 w-6 p-0" disabled={isManaging}>
                <MoreVertical className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem 
                onClick={() => {
                  if (entry.isDeleted) {
                    handleRestoreEntry(entityType, entry);
                  } else {
                    setShowDeleteConfirm(true);
                  }
                }}
                className={entry.isDeleted ? 'text-green-600' : 'text-red-600'}
              >
                {entry.isDeleted ? (
                  <>
                    <Trash2 className="h-4 w-4 mr-2" />
                    Restore Entry
                  </>
                ) : (
                  <>
                    <Trash2 className="h-4 w-4 mr-2" />
                    Delete Entry
                  </>
                )}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          {/* Delete Confirmation Dialog */}
          <LogDeleteConfirmDialog
            open={showDeleteConfirm}
            onOpenChange={setShowDeleteConfirm}
            entryName={entryName}
            onConfirm={async () => {
              await handleDeleteEntry(entityType, entry);
              setShowDeleteConfirm(false);
            }}
            isDeleting={isManaging}
          />
        </>
      )}
    </FounderOnlyWrapper>
  );
}

