'use client';

import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Business } from '@/types/entities';
import { BusinessType } from '@/types/enums';
import { v4 as uuid } from 'uuid';

interface BusinessSubmodalProps {
    open: boolean;
    onClose: () => void;
    onSave: (entity: Business) => void;
    initialData?: Business;
}

export function BusinessSubmodal({
    open,
    onClose,
    onSave,
    initialData,
}: BusinessSubmodalProps) {
    const [name, setName] = useState('');
    const [type, setType] = useState<BusinessType>(BusinessType.COMPANY);
    // Identity Vault: Persist ID across renders
    const draftId = React.useRef(initialData?.id || uuid());

    useEffect(() => {
        if (open) {
            if (initialData) {
                setName(initialData.name);
                setType(initialData.type);
                // Reset draftId to current editing item
                draftId.current = initialData.id;
            } else {
                // Reset for new
                draftId.current = uuid();
                setName('');
                setType(BusinessType.COMPANY);
            }
        }
    }, [open, initialData]);

    const handleSave = () => {
        if (!name) return; // Validation

        const entity: Business = {
            id: initialData?.id || draftId.current,
            name,
            description: `Business for ${name}`,
            type,
            isActive: true,
            createdAt: initialData?.createdAt || new Date(),
            updatedAt: new Date(),
        } as unknown as Business;

        onSave(entity);
        onClose();
    };

    return (
        <Dialog open={open} onOpenChange={(val) => !val && onClose()}>
            <DialogContent
                className="sm:max-w-[500px]"
                zIndexLayer="SUB_MODALS"
            >
                <DialogHeader>
                    <DialogTitle>{initialData ? 'Edit Business' : 'New Business'}</DialogTitle>
                    <DialogDescription>
                        Define a business identity for Contracts and Finance.
                    </DialogDescription>
                </DialogHeader>

                <div className="grid gap-4 py-4">
                    <div className="grid grid-cols-4 items-center gap-4">
                        <Label htmlFor="name" className="text-right">Name</Label>
                        <Input
                            id="name"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            className="col-span-3"
                            placeholder="Business name"
                        />
                    </div>

                    <div className="grid grid-cols-4 items-center gap-4">
                        <Label htmlFor="type" className="text-right">Type</Label>
                        <Select value={type} onValueChange={(val) => setType(val as BusinessType)}>
                            <SelectTrigger className="col-span-3">
                                <SelectValue placeholder="Select type" />
                            </SelectTrigger>
                            <SelectContent>
                                {Object.values(BusinessType).map((t) => (
                                    <SelectItem key={t} value={t}>{t}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>

                </div>

                <DialogFooter>
                    <Button variant="outline" onClick={onClose}>Cancel</Button>
                    <Button onClick={handleSave}>Save Business</Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
