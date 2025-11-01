'use client';

import { Button } from '@/components/ui/button';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { MoreVertical, Trash2 } from 'lucide-react';
import { FounderOnlyWrapper } from '@/components/common/founder-only-wrapper';
import { EntityType } from '@/types/enums';
import { useLogManagement } from '@/lib/hooks/use-log-management';

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
  const { handleDeleteEntry, handleRestoreEntry, isManaging } = useLogManagement({ onReload });

  return (
    <FounderOnlyWrapper>
      {logManagementEnabled && entry.id && (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="sm" className="h-6 w-6 p-0" disabled={isManaging}>
              <MoreVertical className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem 
              onClick={() => entry.isDeleted ? handleRestoreEntry(entityType, entry) : handleDeleteEntry(entityType, entry)}
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
      )}
    </FounderOnlyWrapper>
  );
}

