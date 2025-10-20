'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { AlertTriangle, CheckCircle, X } from 'lucide-react';
import { getZIndexClass } from '@/lib/utils/z-index-utils';

interface SprintCompletionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  incompletePhases: string[];
  currentSprintNumber: number;
  currentSprintName: string;
}

export function SprintCompletionModal({
  isOpen,
  onClose,
  onConfirm,
  incompletePhases,
  currentSprintNumber,
  currentSprintName
}: SprintCompletionModalProps) {
  if (!isOpen) return null;

  return (
    <div className={`fixed inset-0 bg-black/50 flex items-center justify-center p-4 ${getZIndexClass('MODALS')}`}>
      <Card className="w-full max-w-md">
        <CardHeader className="pb-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-amber-500" />
              <CardTitle className="text-lg">Sprint Completion Required</CardTitle>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={onClose}
              className="h-8 w-8 p-0"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
          <CardDescription>
            Cannot complete Sprint {currentSprintNumber}: {currentSprintName}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <p className="text-sm text-muted-foreground">
              All phases must be marked as &quot;Done&quot; before completing the sprint.
            </p>
            <div className="space-y-1">
              <p className="text-sm font-medium">Incomplete phases:</p>
              <ul className="space-y-1">
                {incompletePhases.map((phase, index) => (
                  <li key={index} className="text-sm text-muted-foreground flex items-center gap-2">
                    <X className="h-3 w-3 text-red-500" />
                    {phase}
                  </li>
                ))}
              </ul>
            </div>
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={onClose}>
              Close
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
