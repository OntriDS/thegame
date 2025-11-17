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
import { getInteractiveSubModalZIndex } from '@/lib/utils/z-index-utils';

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
        style={{ zIndex: getInteractiveSubModalZIndex() }}
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

        <div className="py-4">
          {/* Entity Info */}
          <div className="bg-muted/50 rounded-lg p-4 space-y-3 mb-4">
            <div className="flex items-center gap-3">
              {getEntityIcon(entityType)}
              <div>
                <div className="font-medium">{entityName}</div>
                <div className="text-sm text-muted-foreground capitalize">
                  {getEntityTypeLabel(entityType)}
                </div>
              </div>
            </div>
          </div>

          {/* Action Details */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 space-y-3">
            <div className="flex items-start gap-2">
              <Archive className="h-4 w-4 text-blue-600 mt-0.5 flex-shrink-0" />
              <div className="text-sm text-blue-800">
                <p className="font-medium">Archive Snapshot Created</p>
                <p className="mt-1">
                  A permanent snapshot will be created in the Archive for historical records.
                </p>
              </div>
            </div>

            <div className="flex items-start gap-2">
              <TrendingUp className="h-4 w-4 text-blue-600 mt-0.5 flex-shrink-0" />
              <div className="text-sm text-blue-800">
                <p className="font-medium">
                  {entityType === 'item' ? 'Moved to Sold Items Section' : 'Moved to Collected Section'}
                </p>
                <p className="mt-1">
                  This {getEntityTypeLabel(entityType).toLowerCase()} will appear in the dedicated
                  {entityType === 'item' ? ' "Sold Items" tab' : 'collected section'}.
                </p>
              </div>
            </div>

            {(hasPoints || hasRevenue) && (
              <div className="flex items-start gap-2">
                <Coins className="h-4 w-4 text-blue-600 mt-0.5 flex-shrink-0" />
                <div className="text-sm text-blue-800">
                  <p className="font-medium">Points Available for Exchange</p>
                  <p className="mt-1">
                    The points from this {getEntityTypeLabel(entityType).toLowerCase()} can now be
                    exchanged for J$ (Jungle Coins), which can be converted to real currency.
                  </p>
                  {hasPoints && (
                    <div className="mt-2 p-2 bg-white rounded border border-blue-200">
                      <div className="text-xs font-medium text-blue-700 mb-1">Points Earned:</div>
                      <div className="grid grid-cols-4 gap-2 text-xs">
                        {pointsValue.xp > 0 && <div>XP: {pointsValue.xp}</div>}
                        {pointsValue.rp > 0 && <div>RP: {pointsValue.rp}</div>}
                        {pointsValue.fp > 0 && <div>FP: {pointsValue.fp}</div>}
                        {pointsValue.hp > 0 && <div>HP: {pointsValue.hp}</div>}
                      </div>
                    </div>
                  )}
                  {hasRevenue && (
                    <div className="mt-2 p-2 bg-white rounded border border-blue-200">
                      <div className="text-xs font-medium text-blue-700">Revenue: ${totalRevenue.toFixed(2)}</div>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Important Note */}
          <div className="mt-4 p-3 bg-amber-50 border border-amber-200 rounded-lg">
            <div className="flex items-start gap-2">
              <AlertTriangle className="h-4 w-4 text-amber-600 mt-0.5 flex-shrink-0" />
              <div className="text-sm text-amber-800">
                <p className="font-medium">Important Note</p>
                <p className="mt-1">
                  This action is part of the &ldquo;Archive-First&rdquo; lifecycle management.
                  The {getEntityTypeLabel(entityType).toLowerCase()} will remain accessible in the active system
                  but will be organized in its collected/sold section for better clarity.
                </p>
              </div>
            </div>
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