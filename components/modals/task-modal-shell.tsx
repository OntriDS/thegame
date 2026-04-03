// components/modals/task-modal-shell.tsx
// Modal Shell Component - Common UI for all Task Modals
// Implements Shell/Core composition pattern for cleaner separation of concerns

'use client';

import * as React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Loader2 } from 'lucide-react';
import { getZIndexClass } from '@/lib/utils/z-index-utils';

interface TaskModalShellProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description: string;
  children: React.ReactNode;
}

/**
 * Modal Shell Component
 * Provides common modal structure (header, footer, loading state)
 * Core content is rendered as children for specialized forms
 *
 * Benefits:
 * - Single source of truth for modal behavior
 * - Consistent UI across all task types
 * - Easy to add modal-wide features (loading, error handling)
 */
export function TaskModalShell({
  open,
  onOpenChange,
  title,
  description,
  children
}: TaskModalShellProps) {
  const [isLoading, setIsLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const handleClose = () => {
    setIsLoading(false);
    setError(null);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent
        zIndexLayer="MODALS"
        className="w-full max-w-7xl max-h-[90vh] overflow-y-auto"
      >
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>

        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 />
          </div>
        ) : error ? (
          <div className="flex flex-col items-center py-8">
            <div className="text-destructive text-sm mb-2">
              {error}
            </div>
            <Button
              variant="outline"
              onClick={handleClose}
              className="w-full"
            >
              Close
            </Button>
          </div>
        ) : (
          <>{children}</>
        )}

        <DialogFooter className="flex justify-between items-center gap-3 pt-4">
          {error ? (
            <Button
              variant="outline"
              onClick={handleClose}
              className="h-8 text-xs"
            >
              Close
            </Button>
          ) : (
            <Button
              variant="default"
              onClick={handleClose}
              className="h-8 text-xs"
              disabled={isLoading}
            >
              Done
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
