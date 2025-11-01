'use client';

import { useState, useEffect, useMemo } from 'react';
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

// Immutable fields that cannot be edited
const IMMUTABLE_FIELDS = ['id', 'entityId', 'timestamp', 'event', 'editedAt', 'editedBy', 'lastUpdated', 'editHistory', 'isDeleted', 'deletedAt', 'deletedBy', 'deleteReason'];

// Fields that should be hidden or shown as read-only in a special section
const METADATA_FIELDS = ['id', 'entityId', 'timestamp', 'event'];

export function LogEntryEditModal({
  open,
  onOpenChange,
  entry,
  entityType,
  onSave,
  isSaving = false
}: LogEntryEditModalProps) {
  const [formData, setFormData] = useState<Record<string, any>>({});
  const [reason, setReason] = useState('');
  
  // Get editable fields from entry
  const editableFields = useMemo(() => {
    if (!entry) return [];
    
    return Object.keys(entry)
      .filter(key => !IMMUTABLE_FIELDS.includes(key))
      .sort((a, b) => {
        // Prioritize common fields
        if (a === 'name' || a === 'displayName') return -1;
        if (b === 'name' || b === 'displayName') return 1;
        return a.localeCompare(b);
      });
  }, [entry]);
  
  // Initialize form when entry changes
  useEffect(() => {
    if (entry) {
      const initialData: Record<string, any> = {};
      editableFields.forEach(field => {
        initialData[field] = entry[field];
      });
      setFormData(initialData);
      setReason('');
    }
  }, [entry, editableFields]);

  // Check if there are any changes
  const hasChanges = () => {
    if (!entry) return false;
    
    for (const field of editableFields) {
      const currentValue = formData[field];
      const originalValue = entry[field];
      
      // Handle null/undefined comparison
      if (currentValue !== originalValue && 
          !(currentValue == null && originalValue == null)) {
        return true;
      }
    }
    return false;
  };

  const handleFieldChange = (field: string, value: any) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleSave = async () => {
    if (!hasChanges()) {
      onOpenChange(false);
      return;
    }

    const updates: Record<string, any> = {};
    
    // Only include changed fields
    for (const field of editableFields) {
      const currentValue = formData[field];
      const originalValue = entry[field];
      
      if (currentValue !== originalValue) {
        updates[field] = currentValue;
      }
    }

    await onSave(updates, reason.trim() || undefined);
  };

  const renderField = (field: string, value: any) => {
    const stringValue = value != null ? String(value) : '';
    const isLong = stringValue.length > 100;
    
    if (isLong) {
      return (
        <Textarea
          value={stringValue}
          onChange={(e) => handleFieldChange(field, e.target.value)}
          disabled={isSaving}
          rows={3}
        />
      );
    }
    
    return (
      <Input
        value={stringValue}
        onChange={(e) => handleFieldChange(field, e.target.value)}
        disabled={isSaving}
      />
    );
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

          {/* Editable fields - dynamically rendered */}
          <div className="space-y-4 max-h-[60vh] overflow-y-auto">
            {editableFields.map(field => {
              const value = formData[field];
              const isRequired = field === 'name' || field === 'displayName';
              
              return (
                <div key={field}>
                  <Label htmlFor={field} className={isRequired ? "after:content-['*'] after:ml-0.5 after:text-red-500" : ""}>
                    {field.charAt(0).toUpperCase() + field.slice(1)}
                  </Label>
                  {renderField(field, value)}
                </div>
              );
            })}
          </div>

          {/* Reason for edit */}
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
            disabled={isSaving || !hasChanges()}
            className="bg-blue-600 hover:bg-blue-700"
          >
            {isSaving ? 'Saving...' : 'Save Changes'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

