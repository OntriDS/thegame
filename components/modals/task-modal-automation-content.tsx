// Automation tasks — Content placeholder (header rendered by task-modal.tsx)

'use client';

import { Button } from '@/components/ui/button';
import { TaskModalFooter } from './task-modal';

interface AutomationTaskModalContentProps {
  onOpenChange: (open: boolean) => void;
}

export default function AutomationTaskModalContent({ onOpenChange }: AutomationTaskModalContentProps) {
  return (
    <>
      <div className="min-h-0 flex-1 overflow-y-auto px-6 py-8 text-sm text-muted-foreground">
        Automation task editing is not available yet. Full workflows and fields will be added here; for now you can
        review tasks from the Automation tree.
      </div>
      <TaskModalFooter>
        <div />
        <div className="flex gap-2">
          <Button type="button" variant="outline" className="h-8 text-xs" onClick={() => onOpenChange(false)}>
            Close
          </Button>
        </div>
      </TaskModalFooter>
    </>
  );
}
