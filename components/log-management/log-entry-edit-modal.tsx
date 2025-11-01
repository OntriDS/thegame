'use client';

import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Edit2 } from 'lucide-react';
import { getZIndexClass } from '@/lib/utils/z-index-utils';

interface LogEntryEditModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  entry: any;
  entityType: string;
  onSave: (updates: Record<string, any>, reason?: string) => Promise<void>;
  isSaving?: boolean;
}

export function LogEntryEditModal({
  open,
  onOpenChange,
  entry,
  entityType,
  onSave,
  isSaving = false
}: LogEntryEditModalProps) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [reason, setReason] = useState('');
  
  // Initialize form when entry changes
  useEffect(() => {
    if (entry) {
      setName(entry.name || entry.displayName || '');
      setDescription(entry.description || '');
      setReason('');
    }
  }, [entry]);

  // Check if there are any changes
  const hasChanges = () => {
    if (!entry) return false;
    const originalName = entry.name || entry.displayName || '';
    const originalDescription = entry.description || '';
    return name !== originalName || description !== originalDescription;
  };

  const handleSave = async () => {
    if (!hasChanges()) {
      onOpenChange(false);
      return;
    }

    const updates: Record<string, any> = {};
    
    // Only include changed fields
    if (name !== (entry.name || entry.displayName || '')) {
      updates.name = name;
    }
    if (description !== (entry.description || '')) {
      updates.description = description;
    }

    await onSave(updates, reason.trim() || undefined);
  };

  if (!entry) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className={`max-w-2xl ${getZIndexClass('SUB_MODALS')}`}>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-blue-600">
            <Edit2 className="h-5 w-5" />
            Edit Log Entry
          </DialogTitle>
          <DialogDescription>
            Modify this log entry. Changes will be tracked in the audit trail.
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-4">
          {/* Read-only metadata section */}
          <div className="p-3 bg-muted/50 border rounded-md space-y-2">
            <div className="text-sm font-medium text-muted-foreground">Metadata (Read-only)</div>
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div>
                <span className="font-medium">ID:</span> {entry.id?.substring(0, 8)}...
              </div>
              <div>
                <span className="font-medium">Entity:</span> {entry.entityId?.substring(0, 8)}...
              </div>
              <div>
                <span className="font-medium">Event:</span> {entry.event || 'N/A'}
              </div>
              <div>
                <span className="font-medium">Date:</span> {entry.timestamp || 'N/A'}
              </div>
            </div>
          </div>

          {/* Editable fields */}
          <div className="space-y-4">
            <div>
              <Label htmlFor="name">Name *</Label>
              <Input
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                disabled={isSaving}
                placeholder="Entry name"
              />
            </div>

            <div>
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                disabled={isSaving}
                placeholder="Entry description"
                rows={3}
              />
            </div>

            <div>
              <Label htmlFor="reason">Reason for Edit (Optional)</Label>
              <Input
                id="reason"
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                disabled={isSaving}
                placeholder="Why are you editing this entry?"
              />
              <p className="text-xs text-muted-foreground mt-1">
                This reason will be recorded in the audit trail
              </p>
            </div>
          </div>

          {/* Additional context */}
          {!hasChanges() && (
            <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-md text-sm text-yellow-800">
              No changes detected. Make changes above or click Cancel to close.
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isSaving}>
            Cancel
          </Button>
          <Button 
            onClick={handleSave}
            disabled={isSaving || !name.trim() || !hasChanges()}
            className="bg-blue-600 hover:bg-blue-700"
          >
            {isSaving ? 'Saving...' : 'Save Changes'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

