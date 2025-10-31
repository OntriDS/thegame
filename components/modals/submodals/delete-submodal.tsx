'use client';

import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Task, Item, FinancialRecord, Sale, Site } from '@/types/entities';
import { EntityType } from '@/types/enums';
import { Trash2 } from 'lucide-react';
import { ClientAPI } from '@/lib/client-api';
import { getZIndexClass } from '@/lib/utils/z-index-utils';
// Side effects handled by parent component via API calls

import { Character } from '@/types/entities';

// Supported entity types for deletion (subset of EntityType enum)
type DeletableEntityType = EntityType.TASK | EntityType.ITEM | EntityType.FINANCIAL | EntityType.SALE | EntityType.SITE | EntityType.CHARACTER;

interface DeleteModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  entityType: DeletableEntityType;
  entities: (Task | Item | FinancialRecord | Sale | Site | Character)[];
  onComplete?: () => void; // Optional callback after successful deletion
}

// Entity type to display label mapping (UI labels, not enum values)
const ENTITY_TYPE_LABELS: Record<DeletableEntityType, { singular: string; plural: string }> = {
  [EntityType.TASK]: { singular: 'Task', plural: 'Tasks' },
  [EntityType.ITEM]: { singular: 'Item', plural: 'Items' },
  [EntityType.FINANCIAL]: { singular: 'Record', plural: 'Records' }, // UI uses "Record" for FinancialRecord
  [EntityType.SALE]: { singular: 'Sale', plural: 'Sales' },
  [EntityType.SITE]: { singular: 'Site', plural: 'Sites' },
  [EntityType.CHARACTER]: { singular: 'Character', plural: 'Characters' },
};

// Entity type to lowercase label for warnings
const ENTITY_TYPE_WARNING_LABELS: Record<DeletableEntityType, string> = {
  [EntityType.TASK]: 'task',
  [EntityType.ITEM]: 'item',
  [EntityType.FINANCIAL]: 'record',
  [EntityType.SALE]: 'sale',
  [EntityType.SITE]: 'site',
  [EntityType.CHARACTER]: 'character',
};

// Entity types that can have related items (for checking sourceTaskId/sourceRecordId)
const ENTITY_TYPES_WITH_RELATED_ITEMS: DeletableEntityType[] = [EntityType.TASK, EntityType.FINANCIAL];

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
      if (open && ENTITY_TYPES_WITH_RELATED_ITEMS.includes(entityType)) {
        const allRelatedItems: Item[] = [];
        
        for (const entity of entities) {
          const items = await ClientAPI.getItems();
          let createdItems: Item[] = [];
          
          if (entityType === EntityType.TASK) {
            createdItems = items.filter(item => item.sourceTaskId === entity.id);
          } else if (entityType === EntityType.FINANCIAL) {
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
      if (entityType === EntityType.TASK) {
        for (const task of entities as Task[]) {
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
      } else if (entityType === EntityType.FINANCIAL) {
        // Special handling for record deletion - check for created items
        for (const record of entities as FinancialRecord[]) {
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
      } else if (entityType === EntityType.SALE) {
        for (const sale of entities as Sale[]) {
          await ClientAPI.deleteSale(sale.id);
          // Sale deletion cleanup is handled by the DataStore side effects via removeSaleEffectsOnDelete
        }
      } else if (entityType === EntityType.SITE) {
        for (const site of entities as Site[]) {
          await ClientAPI.deleteSite(site.id);
          // Site deletion cleanup is handled by the DataStore side effects via removeSiteEffectsOnDelete
        }
      } else if (entityType === EntityType.CHARACTER) {
        for (const character of entities as Character[]) {
          await ClientAPI.deleteCharacter(character.id);
          // Character deletion cleanup is handled by the DataStore side effects via removeCharacterEffectsOnDelete
        }
      } else if (entityType === EntityType.ITEM) {
        // Regular deletion for items
        for (const item of entities as Item[]) {
          await ClientAPI.deleteItem(item.id);
        }
      } else {
        console.warn('Unknown entity type for deletion:', entityType);
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

  const getEntityDisplayName = (entity: Task | Item | FinancialRecord | Sale | Site | Character): string => {
    switch (entityType) {
      case EntityType.TASK:
        return (entity as Task).name;
      case EntityType.ITEM:
        return (entity as Item).name;
      case EntityType.FINANCIAL:
        return (entity as FinancialRecord).name;
      case EntityType.SALE:
        return (entity as Sale).name;
      case EntityType.SITE:
        return (entity as Site).name;
      case EntityType.CHARACTER:
        return (entity as Character).name;
      default:
        return 'Unknown';
    }
  };

  const getBulkTitle = (): string => {
    const count = entities.length;
    const label = ENTITY_TYPE_LABELS[entityType];
    return `Delete ${count} ${count > 1 ? label.plural : label.singular}`;
  };

  const getEntityDescription = (entity: Task | Item | FinancialRecord | Sale | Site | Character): string => {
    switch (entityType) {
      case EntityType.TASK:
        return (entity as Task).description || 'No description';
      case EntityType.ITEM:
        return `${(entity as Item).type} • ${(entity as Item).stock?.reduce((s, stock) => s + stock.quantity, 0) || 0} units`;
      case EntityType.FINANCIAL:
        return `${(entity as FinancialRecord).type} • ${(entity as FinancialRecord).station}`;
      case EntityType.SALE:
        return `${(entity as Sale).type} • ${(entity as Sale).siteId}`;
      case EntityType.SITE:
        const site = entity as Site;
        return `${site.metadata.type} • ${site.status}`;
      case EntityType.CHARACTER:
        const character = entity as Character;
        return `${character.roles?.join(', ') || 'No roles'}`;
      default:
        return '';
    }
  };

  const getEntityTypeLabel = (): string => {
    const label = ENTITY_TYPE_LABELS[entityType];
    return entities.length === 1 ? label.singular : label.plural;
  };

  const getWarningMessage = (): string => {
    const count = entities.length;
    const entityLabel = ENTITY_TYPE_WARNING_LABELS[entityType];
    const plural = count > 1 ? 's' : '';
    const thisOrThese = count > 1 ? 'These' : 'This';
    
    return `${thisOrThese} ${entityLabel}${plural} will be permanently removed and cannot be recovered.`;
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent zIndexLayer={'SUB_MODALS'} className="max-w-md">
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
          {ENTITY_TYPES_WITH_RELATED_ITEMS.includes(entityType) && relatedItems.length > 0 && (
            <div className="border-t pt-3">
              <div className="text-sm text-muted-foreground mb-2">
                This {ENTITY_TYPE_LABELS[entityType].singular.toLowerCase()} created {relatedItems.length} item{relatedItems.length > 1 ? 's' : ''}:
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
