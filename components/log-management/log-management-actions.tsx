'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { MoreVertical, Trash2, Edit2 } from 'lucide-react';
import { FounderOnlyWrapper } from '@/components/common/founder-only-wrapper';
import { EntityType } from '@/types/enums';
import { useLogManagement } from '@/lib/hooks/use-log-management';
import { LogDeleteConfirmDialog } from './log-delete-confirm-dialog';
import { LogEntryEditModal } from './log-entry-edit-modal';

interface LogManagementActionsProps {
  entityType: EntityType;
  entry: any;
  onReload: () => void;
  logManagementEnabled: boolean;
}

/**
 * LogManagementActions - Dropdown menu for log entry actions
 * 
 * Shows edit/delete/restore actions based on entry state.
 * Only visible when log management is enabled and user has Founder permissions.
 */
export function LogManagementActions({ 
  entityType, 
  entry, 
  onReload,
  logManagementEnabled 
}: LogManagementActionsProps) {
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const { handleDeleteEntry, handleRestoreEntry, handleEditEntry, isManaging } = useLogManagement({ onReload });

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
              {!entry.isDeleted && (
                <DropdownMenuItem 
                  onClick={() => setShowEditModal(true)}
                  className="text-blue-600"
                >
                  <Edit2 className="h-4 w-4 mr-2" />
                  Edit Entry
                </DropdownMenuItem>
              )}
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

          {/* Edit Modal */}
          <LogEntryEditModal
            open={showEditModal}
            onOpenChange={setShowEditModal}
            entry={entry}
            entityType={entityType}
            onSave={async (updates, reason) => {
              await handleEditEntry(entityType, entry, updates, reason);
              setShowEditModal(false);
            }}
            isSaving={isManaging}
          />

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

