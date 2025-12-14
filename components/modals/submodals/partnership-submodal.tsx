'use client';

import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { getInteractiveSubModalZIndex } from '@/lib/utils/z-index-utils';

interface PartnershipSubmodalProps {
    open: boolean;
    onClose: () => void;
    onSave: (data: any) => void;
}

export function PartnershipSubmodal({
    open,
    onClose,
    onSave
}: PartnershipSubmodalProps) {
    const [loading, setLoading] = useState(false);

    const handleSave = () => {
        setLoading(true);
        // Placeholder save logic
        onSave({});
        setLoading(false);
        onClose();
    };

    return (
        <Dialog open={open} onOpenChange={(val) => !val && onClose()}>
            <DialogContent
                className="sm:max-w-[600px]"
                style={{ zIndex: getInteractiveSubModalZIndex() }}
            >
                <DialogHeader>
                    <DialogTitle>New Partnership</DialogTitle>
                    <DialogDescription>
                        Define a new strategic partner or investor relationship.
                    </DialogDescription>
                </DialogHeader>

                <div className="py-10 text-center text-muted-foreground border-2 border-dashed rounded-lg bg-slate-50 dark:bg-slate-900/20">
                    <p>Partnership/Investor Form Configuration Pending...</p>
                </div>

                <DialogFooter>
                    <Button variant="outline" onClick={onClose}>Cancel</Button>
                    <Button onClick={handleSave} disabled={loading}>Save Partnership</Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
