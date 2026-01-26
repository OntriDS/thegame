'use client';

import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { SearchableSelect } from '@/components/ui/searchable-select';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Business, Character, Site } from '@/types/entities';
import { BusinessType } from '@/types/enums';
import { v4 as uuid } from 'uuid';
import { createCharacterOptions, createSiteOptionsWithCategories } from '@/lib/utils';

import { getInteractiveSubModalZIndex } from '@/lib/utils/z-index-utils';

import { ClientAPI } from '@/lib/client-api';

interface BusinessSubmodalProps {
    open: boolean;
    onClose: () => void;
    onSave: (entity: Business) => void;
    initialData?: Business;
    defaultLinkedCharacterId?: string;
}

export function BusinessSubmodal({
    open,
    onClose,
    onSave,
    initialData,
    defaultLinkedCharacterId
}: BusinessSubmodalProps) {
    const [name, setName] = useState('');
    const [type, setType] = useState<BusinessType>(BusinessType.COMPANY);
    const [taxId, setTaxId] = useState('');
    const [linkedCharacterId, setLinkedCharacterId] = useState<string>('');
    const [linkedSiteId, setLinkedSiteId] = useState<string>('');

    // Option Data
    const [characters, setCharacters] = useState<Character[]>([]);
    const [sites, setSites] = useState<Site[]>([]);

    // Identity Vault: Persist ID across renders
    const draftId = React.useRef(initialData?.id || uuid());

    useEffect(() => {
        if (open) {
            // Load Options
            const loadOptions = async () => {
                const [chars, s] = await Promise.all([
                    ClientAPI.getCharacters(),
                    ClientAPI.getSites()
                ]);
                setCharacters(chars);
                setSites(s);
            };
            loadOptions();

            if (initialData) {
                setName(initialData.name);
                setType(initialData.type);
                setTaxId(initialData.taxId || '');
                setLinkedCharacterId(initialData.linkedCharacterId || '');
                setLinkedSiteId(initialData.linkedSiteId || '');
                // Reset draftId to current editing item
                draftId.current = initialData.id;
            } else {
                // Reset for new
                draftId.current = uuid();
                setName('');
                setType(BusinessType.COMPANY);
                setTaxId('');
                setLinkedCharacterId(defaultLinkedCharacterId || '');
                setLinkedSiteId('');
            }
        }
    }, [open, initialData, defaultLinkedCharacterId]);

    const handleSave = () => {
        if (!name) return; // Validation

        const entity: Business = {
            id: initialData?.id || draftId.current,
            name,
            description: `Business for ${name}`,
            type,
            taxId,
            linkedCharacterId: linkedCharacterId || null,
            linkedSiteId: linkedSiteId || null,
            isActive: true,
            createdAt: initialData?.createdAt || new Date(),
            updatedAt: new Date(),
            links: initialData?.links || [], // Keep existing links if update
        };

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

                    <div className="grid grid-cols-4 items-center gap-4">
                        <Label htmlFor="taxId" className="text-right">Tax ID</Label>
                        <Input
                            id="taxId"
                            value={taxId}
                            onChange={(e) => setTaxId(e.target.value)}
                            className="col-span-3"
                            placeholder="Optional"
                        />
                    </div>

                    <div className="grid grid-cols-4 items-center gap-4">
                        <Label className="text-right">Persona</Label>
                        <div className="col-span-3">
                            <SearchableSelect
                                value={linkedCharacterId}
                                onValueChange={setLinkedCharacterId}
                                options={createCharacterOptions(characters)}
                                placeholder="Link to Character..."
                            />

                        </div>
                    </div>

                    <div className="grid grid-cols-4 items-center gap-4">
                        <Label className="text-right">Base Site</Label>
                        <div className="col-span-3">
                            <SearchableSelect
                                value={linkedSiteId}
                                onValueChange={setLinkedSiteId}
                                options={createSiteOptionsWithCategories(sites)}
                                placeholder="Link to Site..."
                            />

                        </div>
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
