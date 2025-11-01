'use client';

import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Trash2 } from 'lucide-react';
import { getZIndexClass } from '@/lib/utils/z-index-utils';

interface LogDeleteConfirmDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  entryName: string;
  onConfirm: () => void;
  isDeleting?: boolean;
}

export function LogDeleteConfirmDialog({
  open,
  onOpenChange,
  entryName,
  onConfirm,
  isDeleting = false
}: LogDeleteConfirmDialogProps) {
  const handleConfirm = () => {
    onConfirm();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className={`max-w-md ${getZIndexClass('SUB_MODALS')}`}>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-red-600">
            <Trash2 className="h-5 w-5" />
            Delete Log Entry
          </DialogTitle>
          <DialogDescription>
            This entry will be soft-deleted and hidden from the log. It can be restored later if needed.
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-4">
          <div className="p-3 bg-red-50 border border-red-200 rounded-md">
            <div className="text-red-800 text-sm font-medium">
              Entry to delete:
            </div>
            <div className="text-red-600 text-xs mt-1">
              {entryName}
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isDeleting}>
            Cancel
          </Button>
          <Button 
            variant="outline"
            onClick={handleConfirm} 
            disabled={isDeleting}
            className="text-red-600 border-red-600 hover:bg-red-50"
          >
            {isDeleting ? 'Deleting...' : 'Delete Entry'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

