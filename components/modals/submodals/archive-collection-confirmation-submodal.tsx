// components/modals/submodals/archive-collection-confirmation-modal.tsx
// Archive collection confirmation modal for entity status changes

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  AlertTriangle,
  Archive,
  Coins,
  TrendingUp,
  Package,
  ShoppingCart,
  DollarSign,
  CheckSquare
} from 'lucide-react';
import { Z_INDEX_LAYERS } from '@/lib/constants/app-constants';

type EntityType = 'task' | 'sale' | 'financial' | 'item';

interface ArchiveCollectionConfirmationModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  entityType: EntityType;
  entityName: string;
  onConfirm: () => void | Promise<void>;
  onCancel: () => void;
  pointsValue?: {
    xp: number;
    rp: number;
    fp: number;
    hp: number;
  };
  totalRevenue?: number;
}

export default function ArchiveCollectionConfirmationModal({
  open,
  onOpenChange,
  entityType,
  entityName,
  onConfirm,
  onCancel,
  pointsValue,
  totalRevenue = 0
}: ArchiveCollectionConfirmationModalProps) {
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

  const getEntityIcon = (type: EntityType) => {
    switch (type) {
      case 'task': return <CheckSquare className="h-5 w-5 text-blue-500" />;
      case 'sale': return <ShoppingCart className="h-5 w-5 text-purple-500" />;
      case 'financial': return <DollarSign className="h-5 w-5 text-amber-500" />;
      case 'item': return <Package className="h-5 w-5 text-green-500" />;
    }
  };

  const getEntityTypeLabel = (type: EntityType) => {
    switch (type) {
      case 'task': return 'Task';
      case 'sale': return 'Sale';
      case 'financial': return 'Financial Record';
      case 'item': return 'Item';
    }
  };

  const getActionText = (type: EntityType) => {
    switch (type) {
      case 'task': return 'Collect';
      case 'sale': return 'Collect';
      case 'financial': return 'Collect';
      case 'item': return 'Mark as Sold';
    }
  };

  const hasPoints = pointsValue && (pointsValue.xp > 0 || pointsValue.rp > 0 || pointsValue.fp > 0 || pointsValue.hp > 0);
  const hasRevenue = totalRevenue > 0;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="sm:max-w-lg"
        zIndexLayer="CRITICAL"
      >
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Archive className="h-5 w-5 text-blue-500" />
            Archive Collection Confirmation
          </DialogTitle>
          <DialogDescription className="text-sm text-muted-foreground">
            Are you sure you want to {getActionText(entityType).toLowerCase()} this {getEntityTypeLabel(entityType).toLowerCase()}?
          </DialogDescription>
        </DialogHeader>

        <div className="py-2">
          {/* Entity Info */}
          <div className="bg-muted/50 rounded-lg p-3 space-y-2 mb-3">
            <div className="flex items-center gap-3">
              {getEntityIcon(entityType)}
              <div>
                <div className="font-medium text-sm">{entityName}</div>
                <div className="text-xs text-muted-foreground capitalize">
                  {getEntityTypeLabel(entityType)}
                </div>
              </div>
            </div>
          </div>

          {/* Action Details */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
            {(hasPoints || hasRevenue) ? (
              <div className="flex items-start gap-2">
                <Coins className="h-4 w-4 text-blue-600 mt-0.5 flex-shrink-0" />
                <div className="text-sm text-blue-800">
                  <p className="font-medium">Rewards Collection</p>
                  <p className="mt-1 text-xs">
                    Points and revenue will be permanently logged.
                  </p>
                  {hasPoints && (
                    <div className="mt-2 p-1.5 bg-white rounded border border-blue-200">
                      <div className="flex gap-2 text-xs font-semibold">
                        {pointsValue.xp > 0 && <span className="text-blue-600">XP: {pointsValue.xp}</span>}
                        {pointsValue.rp > 0 && <span className="text-green-600">RP: {pointsValue.rp}</span>}
                        {pointsValue.fp > 0 && <span className="text-yellow-600">FP: {pointsValue.fp}</span>}
                        {pointsValue.hp > 0 && <span className="text-red-600">HP: {pointsValue.hp}</span>}
                      </div>
                    </div>
                  )}
                  {hasRevenue && (
                    <div className="mt-2 p-1.5 bg-white rounded border border-blue-200">
                      <div className="text-xs font-semibold text-emerald-700">Revenue: ${totalRevenue.toFixed(2)}</div>
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div className="flex items-start gap-2">
                <Archive className="h-4 w-4 text-blue-600 mt-0.5 flex-shrink-0" />
                <div className="text-sm text-blue-800">
                  <p className="font-medium">Archive Action</p>
                  <p className="mt-1 text-xs">This item will be moved to the History logs.</p>
                </div>
              </div>
            )}
          </div>
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
            onClick={handleConfirm}
            disabled={isLoading}
            className="min-w-[120px]"
          >
            {isLoading ? (
              <div className="flex items-center gap-2">
                <div className="h-4 w-4 animate-spin rounded-full border-2 border-background border-t-current" />
                Processing...
              </div>
            ) : (
              <>
                <Archive className="h-4 w-4 mr-2" />
                {getActionText(entityType)}
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}