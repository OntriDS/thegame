'use client';

import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Task, Item, FinancialRecord, Sale } from '@/types/entities';
import { Trash2 } from 'lucide-react';
import { ClientAPI } from '@/lib/client-api';
import { getZIndexClass } from '@/lib/utils/z-index-utils';
// Side effects handled by parent component via API calls

type EntityType = 'task' | 'item' | 'record' | 'sale';

interface DeleteModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  entityType: EntityType;
  entities: (Task | Item | FinancialRecord | Sale)[];
  onComplete?: () => void; // Optional callback after successful deletion
}

export default function DeleteModal({ 
  open, 
  onOpenChange, 
  entityType, 
  entities, 
  onComplete 
}: DeleteModalProps) {
  const [deleteConfirmed, setDeleteConfirmed] = useState(false);
  const [deleteRelatedItems, setDeleteRelatedItems] = useState(true);
  const [isProcessing, setIsProcessing] = useState(false);
  const [relatedItems, setRelatedItems] = useState<Item[]>([]);

  // Check for related items when modal opens
  useEffect(() => {
    const checkRelatedItems = async () => {
      if (open && (entityType === 'task' || entityType === 'record')) {
        const allRelatedItems: Item[] = [];
        
        for (const entity of entities) {
          const items = await ClientAPI.getItems();
          let createdItems: Item[] = [];
          
          if (entityType === 'task') {
            createdItems = items.filter(item => item.sourceTaskId === entity.id);
          } else if (entityType === 'record') {
            createdItems = items.filter(item => item.sourceRecordId === entity.id);
          }
          
          allRelatedItems.push(...createdItems);
        }
        
        setRelatedItems(allRelatedItems);
        setDeleteRelatedItems(false); // Reset checkbox when modal opens
      }
    };
    
    checkRelatedItems();
  }, [open, entityType, entities]);

  const handleDelete = async () => {
    if (entities.length === 0 || !deleteConfirmed) return;
    
    setIsProcessing(true);
    
    try {
      // Special handling for task deletion - check for created items
      if (entityType === 'task') {
        for (const task of entities) {
          // Find items created by this task
          const items = await ClientAPI.getItems();
          const createdItems = items.filter(item => item.sourceTaskId === task.id);
          
          if (createdItems.length > 0) {
            // Use checkbox state instead of window.confirm
            if (deleteRelatedItems) {
              // Delete the items
              for (const item of createdItems) {
                await ClientAPI.deleteItem(item.id);
              }
            } else {
              // Mark items as orphaned (remove sourceTaskId but keep the item)
              for (const item of createdItems) {
                const updatedItem = { ...item, sourceTaskId: undefined };
                await ClientAPI.upsertItem(updatedItem);
                
                // Note: Item log updates are handled by the side effects in DataStore.upsertItem
              }
            }
          }
          
          // Delete the task with side effects (log cleanup handled by DataStore)
          await ClientAPI.deleteTask(task.id);
        }
      } else if (entityType === 'record') {
        // Special handling for record deletion - check for created items
        for (const record of entities) {
          // Find items created by this record
          const items = await ClientAPI.getItems();
          const createdItems = items.filter(item => item.sourceRecordId === record.id);
          
          if (createdItems.length > 0) {
            // Use checkbox state instead of window.confirm
            if (deleteRelatedItems) {
              // Delete the items
              for (const item of createdItems) {
                await ClientAPI.deleteItem(item.id);
              }
            } else {
              // Mark items as orphaned (remove sourceRecordId but keep the item)
              for (const item of createdItems) {
                const updatedItem = { ...item, sourceRecordId: undefined };
                await ClientAPI.upsertItem(updatedItem);
                
                // Note: Item log updates are handled by the side effects in DataStore.upsertItem
              }
            }
          }
          
          // Delete the record with side effects (log cleanup handled by DataStore)
          await ClientAPI.deleteFinancialRecord(record.id);
        }
      } else if (entityType === 'sale') {
        for (const sale of entities as Sale[]) {
          await ClientAPI.deleteSale(sale.id);
          // Sale deletion cleanup is handled by the DataStore side effects via removeSaleEffectsOnDelete
        }
      } else {
        // Regular deletion for non-task entities
        for (const entity of entities) {
          switch (entityType) {
            case 'item':
              await ClientAPI.deleteItem(entity.id);
              break;
            default:
              console.warn('Unknown entity type for deletion:', entityType);
              break;
          }
        }
      }

      // Note: Log cleanup is handled by the workflow functions (removeTaskLogEntriesOnDelete, removeRecordEffectsOnDelete)

      // Call completion callback if provided
      if (onComplete) {
        onComplete();
      }
      
      onOpenChange(false);
    } catch (error) {
      console.error('Delete failed:', error);
    } finally {
      setIsProcessing(false);
    }
  };

  const getEntityDisplayName = (entity: Task | Item | FinancialRecord | Sale) => {
    switch (entityType) {
      case 'task':
        return (entity as Task).name;
      case 'item':
        return (entity as Item).name;
      case 'record':
        return (entity as FinancialRecord).name;
      case 'sale':
        return (entity as Sale).name;
      default:
        return 'Unknown';
    }
  };

  const getBulkTitle = () => {
    const count = entities.length;
    const entityLabel = entityType === 'item' ? 'Item' : 
                       entityType === 'task' ? 'Task' : 
                       entityType === 'record' ? 'Record' : 'Sale';
    return `Delete ${count} ${entityLabel}${count > 1 ? 's' : ''}`;
  };

  const getEntityDescription = (entity: Task | Item | FinancialRecord | Sale) => {
    switch (entityType) {
      case 'task':
        return (entity as Task).description || 'No description';
      case 'item':
        return `${(entity as Item).type} • ${(entity as Item).stock?.reduce((s, stock) => s + stock.quantity, 0) || 0} units`;
      case 'record':
        return `${(entity as FinancialRecord).type} • ${(entity as FinancialRecord).station}`;
      case 'sale':
        return `${(entity as Sale).type} • ${(entity as Sale).siteId}`;
      default:
        return '';
    }
  };

  const getEntityTypeLabel = () => {
    switch (entityType) {
      case 'task':
        return entities.length === 1 ? 'Task' : 'Tasks';
      case 'item':
        return entities.length === 1 ? 'Item' : 'Items';
      case 'record':
        return entities.length === 1 ? 'Record' : 'Records';
      case 'sale':
        return entities.length === 1 ? 'Sale' : 'Sales';
      default:
        return 'Items';
    }
  };

  const getWarningMessage = () => {
    const count = entities.length;
    const entityLabel = entityType === 'item' ? 'item' : 
                       entityType === 'task' ? 'task' : 
                       entityType === 'record' ? 'record' : 'sale';
    const plural = count > 1 ? 's' : '';
    const thisOrThese = count > 1 ? 'These' : 'This';
    
    return `${thisOrThese} ${entityLabel}${plural} will be permanently removed and cannot be recovered.`;
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className={`max-w-md ${getZIndexClass('SUB_MODALS')}`}>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-red-600">
            <Trash2 className="h-5 w-5" />
            {getBulkTitle()}
          </DialogTitle>
          <DialogDescription>
            This action cannot be undone. {getWarningMessage()}
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-4">
          <div className="p-3 bg-red-50 border border-red-200 rounded-md">
            <div className="text-red-800 text-sm font-medium">
              ⚠️ PERMANENT DELETION
            </div>
            <div className="text-red-600 text-xs mt-1">
              {getWarningMessage()}
            </div>
          </div>
          
          <div className="text-sm text-muted-foreground">
            <strong>{getEntityTypeLabel()}{entities.length > 1 ? 's' : ''} to delete:</strong>
            <div className="mt-2 space-y-2 max-h-32 overflow-y-auto">
              {entities.map(entity => (
                <div key={entity.id} className="p-2 bg-muted rounded text-xs">
                  <div className="font-medium">{getEntityDisplayName(entity)}</div>
                  <div className="text-muted-foreground">{getEntityDescription(entity)}</div>
                </div>
              ))}
            </div>
          </div>
          
          <div className="flex items-center space-x-2">
            <Checkbox
              id="delete-confirm"
              checked={deleteConfirmed}
              onCheckedChange={(checked) => setDeleteConfirmed(checked as boolean)}
            />
            <Label htmlFor="delete-confirm" className="text-sm">
              I understand this action cannot be undone
            </Label>
          </div>
          
          {/* Show related items checkbox for tasks and records with related items */}
          {(entityType === 'task' || entityType === 'record') && relatedItems.length > 0 && (
            <div className="border-t pt-3">
              <div className="text-sm text-muted-foreground mb-2">
                This {entityType} created {relatedItems.length} item{relatedItems.length > 1 ? 's' : ''}:
              </div>
              <div className="space-y-1 mb-3 max-h-20 overflow-y-auto">
                {relatedItems.map(item => (
                  <div key={item.id} className="text-xs text-muted-foreground bg-muted p-1 rounded">
                    • {item.name} ({item.type})
                  </div>
                ))}
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="delete-related-items"
                  checked={deleteRelatedItems}
                  onCheckedChange={(checked) => setDeleteRelatedItems(checked as boolean)}
                />
                <Label htmlFor="delete-related-items" className="text-sm">
                  Also delete the related items
                </Label>
              </div>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button 
            variant="outline"
            onClick={handleDelete} 
            disabled={!deleteConfirmed || isProcessing}
            className="text-red-600 border-red-600 hover:bg-red-50"
          >
            {isProcessing ? 'Deleting...' : `Delete ${getEntityTypeLabel()}`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
