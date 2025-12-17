// components/modals/submodals/cascade-status-confirmation-modal.tsx
// Cascade status confirmation modal for Recurrent Templates

import { useState } from 'react';
import { TaskStatus } from '@/types/enums';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { AlertTriangle, CheckCircle, XCircle } from 'lucide-react';
import { getInteractiveSubModalZIndex } from '@/lib/utils/z-index-utils';

interface CascadeStatusConfirmationModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  templateName: string;
  newStatus: TaskStatus;
  oldStatus: TaskStatus;
  affectedInstancesCount: number;
  onConfirm: () => void;
  onCancel: () => void;
  isReversal?: boolean; // Whether this is a status reversal (uncascade)
}

export default function CascadeStatusConfirmationModal({
  open,
  onOpenChange,
  templateName,
  newStatus,
  oldStatus,
  affectedInstancesCount,
  onConfirm,
  onCancel,
  isReversal = false
}: CascadeStatusConfirmationModalProps) {
  const [isLoading, setIsLoading] = useState(false);

  const handleConfirm = async () => {
    setIsLoading(true);
    try {
      await onConfirm();
      onOpenChange(false);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCancel = () => {
    onCancel();
    onOpenChange(false);
  };

  const getStatusColor = (status: TaskStatus) => {
    switch (status) {
      case 'Done': return 'text-green-600';
      case 'In Progress': return 'text-blue-600';
      case 'On Hold': return 'text-gray-600';
      case 'Failed': return 'text-red-600';
      default: return 'text-gray-600';
    }
  };

  const getStatusIcon = (status: TaskStatus) => {
    switch (status) {
      case 'Done': return <CheckCircle className="h-4 w-4" />;
      case 'Failed': return <XCircle className="h-4 w-4" />;
      default: return <AlertTriangle className="h-4 w-4" />;
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="sm:max-w-md"
        zIndexLayer="SUB_MODALS"
      >
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {isReversal ? (
              <>
                <AlertTriangle className="h-5 w-5 text-amber-500" />
                Status Reversal Detected
              </>
            ) : (
              <>
                <CheckCircle className="h-5 w-5 text-blue-500" />
                Cascade Status Change
              </>
            )}
          </DialogTitle>
          <DialogDescription className="text-sm text-muted-foreground">
            {isReversal ? (
              <>
                The template <strong>&quot;{templateName}&quot;</strong> status changed from{' '}
                <span className={`font-medium ${getStatusColor(oldStatus)}`}>
                  {oldStatus}
                </span>{' '}
                to{' '}
                <span className={`font-medium ${getStatusColor(newStatus)}`}>
                  {newStatus}
                </span>
                . This will affect {affectedInstancesCount} instance{affectedInstancesCount !== 1 ? 's' : ''}.
              </>
            ) : (
              <>
                Template <strong>&quot;{templateName}&quot;</strong> status changed from{' '}
                <span className={`font-medium ${getStatusColor(oldStatus)}`}>
                  {oldStatus}
                </span>{' '}
                to{' '}
                <span className={`font-medium ${getStatusColor(newStatus)}`}>
                  {newStatus}
                </span>
                . {affectedInstancesCount} instance{affectedInstancesCount !== 1 ? 's' : ''} will be affected.
              </>
            )}
          </DialogDescription>
        </DialogHeader>

        <div className="py-4">
          <div className="bg-muted/50 rounded-lg p-4 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Template:</span>
              <span className="text-sm">{templateName}</span>
            </div>

            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Status Change:</span>
              <div className="flex items-center gap-2">
                <span className={`text-sm ${getStatusColor(oldStatus)}`}>
                  {oldStatus}
                </span>
                <span className="text-muted-foreground">→</span>
                <span className={`text-sm ${getStatusColor(newStatus)}`}>
                  {newStatus}
                </span>
              </div>
            </div>

            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Affected Instances:</span>
              <span className="text-sm font-medium text-blue-600">
                {affectedInstancesCount}
              </span>
            </div>
          </div>

          {isReversal && (
            <div className="mt-3 p-3 bg-amber-50 border border-amber-200 rounded-lg">
              <div className="flex items-start gap-2">
                <AlertTriangle className="h-4 w-4 text-amber-600 mt-0.5 flex-shrink-0" />
                <div className="text-sm text-amber-800">
                  <p className="font-medium">Warning: Status Reversal</p>
                  <p className="mt-1">
                    This will revert the status of {affectedInstancesCount} instance{affectedInstancesCount !== 1 ? 's' : ''}
                    back to <span className="font-medium">{newStatus}</span>.
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>

        <DialogFooter className="gap-2">
          <Button
            variant="outline"
            onClick={handleCancel}
            disabled={isLoading}
          >
            Cancel
          </Button>
          <Button
            variant="outline"
            onClick={() => {
              onCancel();
              onOpenChange(false);
            }}
            disabled={isLoading}
          >
            Only Template
          </Button>
          <Button
            onClick={handleConfirm}
            disabled={isLoading}
            className="min-w-[100px]"
          >
            {isLoading ? (
              <div className="flex items-center gap-2">
                <div className="h-4 w-4 animate-spin rounded-full border-2 border-background border-t-current" />
                Applying...
              </div>
            ) : (
              'Apply to All'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
