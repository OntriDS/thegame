import React from 'react';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
    DialogFooter
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { DatePicker } from '@/components/ui/date-picker';
import { getZIndexClass } from '@/lib/utils/z-index-utils';
import { format } from 'date-fns';

interface DatesSubmodalProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    title?: string;
    entityId?: string;
    entityMode?: 'task' | 'item' | 'sale' | 'financial';
    createdAt?: Date;
    doneAt?: Date;       // For tasks: doneAt. For items: mapped to soldAt
    collectedAt?: Date;  // For tasks only
    currentStatus?: string;
    onDatesChange: (dates: { createdAt?: Date; doneAt?: Date; collectedAt?: Date }) => void;
}

export default function DatesSubmodal({
    open,
    onOpenChange,
    title = "Dates & Activity",
    entityId,
    entityMode = 'task',
    createdAt,
    doneAt,
    collectedAt,
    currentStatus,
    onDatesChange
}: DatesSubmodalProps) {

    const [localCreatedAt, setLocalCreatedAt] = React.useState<Date | undefined>(createdAt);
    const [localDoneAt, setLocalDoneAt] = React.useState<Date | undefined>(doneAt);
    const [localCollectedAt, setLocalCollectedAt] = React.useState<Date | undefined>(collectedAt);

    React.useEffect(() => {
        if (open) {
            setLocalCreatedAt(createdAt ? new Date(createdAt) : undefined);
            setLocalDoneAt(doneAt ? new Date(doneAt) : undefined);
            setLocalCollectedAt(collectedAt ? new Date(collectedAt) : undefined);
        }
    }, [open, createdAt, doneAt, collectedAt]);

    const handleSave = () => {
        onDatesChange({
            createdAt: localCreatedAt,
            doneAt: localDoneAt,
            collectedAt: localCollectedAt
        });
        onOpenChange(false);
    };

    const handleClearDoneAt = () => setLocalDoneAt(undefined);
    const handleClearCollectedAt = () => setLocalCollectedAt(undefined);

    // Task mode: gate on status
    const isItem = entityMode === 'item';
    const isSoldItem = isItem && (currentStatus?.toLowerCase().includes('sold') ?? false);
    const isDoneAllowed = isItem ? isSoldItem : (currentStatus === 'Done' || currentStatus === 'Collected');
    const isCollectedAllowed = !isItem && currentStatus === 'Collected';

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent zIndexLayer="SUB_MODALS" className={`sm:max-w-md ${getZIndexClass('SUB_MODALS')}`}>
                <DialogHeader>
                    <DialogTitle>{title}</DialogTitle>
                    <DialogDescription>
                        Manually override historical timeline dates for this record.
                    </DialogDescription>
                </DialogHeader>

                <div className="space-y-6 py-4">
                    {/* Entity ID */}
                    {entityId && (
                        <div className="space-y-2">
                            <Label className="text-xs font-semibold">Entity ID</Label>
                            <div className="text-sm font-mono text-muted-foreground bg-secondary/10 p-2 rounded-md border select-all">
                                {entityId}
                            </div>
                            <p className="text-[10px] text-muted-foreground">Database identifier for CLI debugging.</p>
                        </div>
                    )}

                    {/* Created At */}
                    <div className="space-y-2">
                        <Label className="text-xs font-semibold">Created At</Label>
                        <div className="text-sm text-muted-foreground bg-secondary/20 p-2 rounded-md border">
                            {localCreatedAt ? format(localCreatedAt, 'PPP p') : 'Unknown'}
                        </div>
                        <p className="text-[10px] text-muted-foreground">Original creation timestamp.</p>
                    </div>

                    {/* Sold At (items) / Done At (tasks) */}
                    <div className="space-y-2">
                        <div className="flex justify-between items-center">
                            <Label className="text-xs font-semibold">
                                {isItem ? 'Sold At' : 'Done / Executed At'}
                            </Label>
                            {localDoneAt && (
                                <Button variant="ghost" size="sm" onClick={handleClearDoneAt} className="h-5 px-1 text-[10px] text-destructive">
                                    Clear
                                </Button>
                            )}
                        </div>
                        <DatePicker
                            value={localDoneAt}
                            onChange={setLocalDoneAt}
                            disabled={!isDoneAllowed}
                        />
                        {!isDoneAllowed ? (
                            <p className="text-[10px] text-amber-600 dark:text-amber-500 font-medium">
                                {isItem
                                    ? 'Set item status to Sold first to unlock this date.'
                                    : 'Please set the task status to Done or Collected first to unlock this date.'
                                }
                            </p>
                        ) : (
                            <p className="text-[10px] text-muted-foreground">
                                {isItem ? 'Date the item was sold (determines which month it appears in).' : 'When the action actually took place (affects monthly History).'}
                            </p>
                        )}
                    </div>

                    {/* Collected At — tasks only */}
                    {!isItem && (
                        <div className="space-y-2">
                            <div className="flex justify-between items-center">
                                <Label className="text-xs font-semibold">Collected / Rewarded At</Label>
                                {localCollectedAt && (
                                    <Button variant="ghost" size="sm" onClick={handleClearCollectedAt} className="h-5 px-1 text-[10px] text-destructive">
                                        Clear
                                    </Button>
                                )}
                            </div>
                            <DatePicker
                                value={localCollectedAt}
                                onChange={setLocalCollectedAt}
                                disabled={!isCollectedAllowed}
                            />
                            {!isCollectedAllowed ? (
                                <p className="text-[10px] text-amber-600 dark:text-amber-500 font-medium">Please set the task status to Collected first to unlock this date.</p>
                            ) : (
                                <p className="text-[10px] text-muted-foreground">When points were rewarded to the player.</p>
                            )}
                        </div>
                    )}
                </div>

                <DialogFooter>
                    <Button variant="outline" onClick={() => onOpenChange(false)} className="h-8 text-sm">
                        Cancel
                    </Button>
                    <Button onClick={handleSave} className="h-8 text-sm">
                        Apply Dates
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
