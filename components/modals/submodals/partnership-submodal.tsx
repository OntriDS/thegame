'use client';

import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { getInteractiveSubModalZIndex } from '@/lib/utils/z-index-utils';
import { Business, Character } from '@/types/entities';
import { SearchableSelect } from '@/components/ui/searchable-select';
import { Label } from '@/components/ui/label';
import { Check, FileText } from 'lucide-react';
import { NumericInput } from '@/components/ui/numeric-input';

interface PartnershipSubmodalProps {
    open: boolean;
    onClose: () => void;
    onSave: (data: any) => void;
    businesses: Business[];
    characters: Character[];
}

export function PartnershipSubmodal({
    open,
    onClose,
    onSave,
    businesses = [],
    characters = []
}: PartnershipSubmodalProps) {
    // State
    const [loading, setLoading] = useState(false);
    const [characterId, setCharacterId] = useState('');
    const [roles, setRoles] = useState<string[]>(['associate']); // Default to associate

    // Partner Specific
    const [businessId, setBusinessId] = useState('');
    const [shares, setShares] = useState(0);
    const [totalShares, setTotalShares] = useState(100);

    // Investor Specific
    const [jungleCoins, setJungleCoins] = useState(0);

    // Associate/Partner Contracts
    const [contractIds, setContractIds] = useState<string[]>([]);

    const handleSave = () => {
        setLoading(true);
        // Build data structure for saving
        const data = {
            characterId,
            roles,
            meta: {
                partner: roles.includes('partner') ? { businessId, shares, totalShares } : undefined,
                investor: roles.includes('investor') ? { jungleCoins } : undefined,
                associate: roles.includes('associate') ? { contractIds } : undefined
            }
        };

        // Simulate delay or async op
        setTimeout(() => {
            onSave(data);
            setLoading(false);
            onClose();
        }, 500);
    };

    const toggleRole = (roleKey: string) => {
        setRoles(prev =>
            prev.includes(roleKey)
                ? prev.filter(r => r !== roleKey)
                : [...prev, roleKey]
        );
    };

    // Prepare Options
    const characterOptions = characters.map(c => ({
        value: c.id,
        label: c.name,
        category: c.roles?.[0] || 'Other'
    }));

    const businessOptions = businesses.map(b => ({
        value: b.id,
        label: b.name,
        category: b.type || 'Business'
    }));

    return (
        <Dialog open={open} onOpenChange={(val) => !val && onClose()}>
            <DialogContent
                className="sm:max-w-[600px] min-h-[500px] flex flex-col"
                style={{ zIndex: getInteractiveSubModalZIndex() }}
            >
                <DialogHeader>
                    <DialogTitle>Management Configurator</DialogTitle>
                    <DialogDescription>
                        Configure roles, partnerships, and investor status for a character.
                    </DialogDescription>
                </DialogHeader>

                <div className="flex-1 overflow-y-auto py-4 space-y-6 px-1">

                    {/* 1. CHARACTER SELECTION */}
                    <div className="space-y-3">
                        <Label>Select Character</Label>
                        <SearchableSelect
                            value={characterId}
                            onValueChange={setCharacterId}
                            placeholder="Select a character..."
                            options={characterOptions}
                            autoGroupByCategory={true}
                        />
                    </div>

                    {/* 2. ROLE TOGGLES */}
                    <div className="space-y-3">
                        <Label>Roles & Relationships</Label>
                        <div className="grid grid-cols-3 gap-3">
                            {['Associate', 'Partner', 'Investor'].map((label) => {
                                const value = label.toLowerCase();
                                const isSelected = roles.includes(value);
                                return (
                                    <div
                                        key={value}
                                        onClick={() => toggleRole(value)}
                                        className={`
                                            cursor-pointer flex flex-col items-center justify-center p-3 rounded-lg border transition-all select-none
                                            ${isSelected
                                                ? 'border-primary bg-primary/5 ring-1 ring-primary'
                                                : 'border-muted hover:bg-muted/50 opacity-70 hover:opacity-100'
                                            }
                                        `}
                                    >
                                        <div className={`h-4 w-4 rounded border flex items-center justify-center mb-2 ${isSelected ? 'bg-primary border-primary text-primary-foreground' : 'border-muted-foreground'}`}>
                                            {isSelected && <Check className="h-3 w-3" />}
                                        </div>
                                        <span className="text-sm font-semibold">{label}</span>
                                    </div>
                                );
                            })}
                        </div>
                    </div>

                    {/* 3. CONDITIONAL CONFIGURATION SECTIONS */}
                    <div className="space-y-4">

                        {/* PARTNER CONFIG */}
                        {roles.includes('partner') && (
                            <div className="p-4 border rounded-lg bg-card animate-in fade-in slide-in-from-top-2 duration-200">
                                <div className="flex items-center gap-2 mb-4">
                                    <h4 className="font-semibold text-sm">Partner Configuration</h4>
                                    <div className="h-px flex-1 bg-border" />
                                </div>
                                <div className="space-y-4">
                                    <div className="space-y-2">
                                        <Label className="text-xs">Business Entity</Label>
                                        <SearchableSelect
                                            value={businessId}
                                            onValueChange={setBusinessId}
                                            placeholder="Select Business..."
                                            options={businessOptions}
                                            autoGroupByCategory={true}
                                        />
                                    </div>
                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="space-y-2">
                                            <Label className="text-xs">Shares Held</Label>
                                            <div className="relative">
                                                <NumericInput
                                                    className="h-9 w-full rounded-md border text-sm"
                                                    value={shares}
                                                    onChange={setShares}
                                                    placeholder="0"
                                                />
                                            </div>
                                        </div>
                                        <div className="space-y-2">
                                            <Label className="text-xs">Total Outstanding</Label>
                                            <div className="relative">
                                                <NumericInput
                                                    className="h-9 w-full rounded-md border text-sm"
                                                    value={totalShares}
                                                    onChange={setTotalShares}
                                                    placeholder="100"
                                                />
                                            </div>
                                        </div>
                                    </div>
                                    <div className="text-xs text-right text-muted-foreground">
                                        Ownership: <span className="font-bold text-foreground">{totalShares > 0 ? ((shares / totalShares) * 100).toFixed(1) : 0}%</span>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* INVESTOR CONFIG */}
                        {roles.includes('investor') && (
                            <div className="p-4 border rounded-lg bg-card animate-in fade-in slide-in-from-top-2 duration-200">
                                <div className="flex items-center gap-2 mb-4">
                                    <h4 className="font-semibold text-sm">Investor Configuration</h4>
                                    <div className="h-px flex-1 bg-border" />
                                </div>
                                <div className="space-y-2">
                                    <Label className="text-xs">Initial Investment (J$)</Label>
                                    <div className="relative">
                                        <span className="absolute left-3 top-2.5 text-xs font-bold text-emerald-500">J$</span>
                                        <input
                                            type="number"
                                            className="flex h-9 w-full rounded-md border border-input bg-transparent pl-8 pr-3 py-1 text-sm shadow-sm transition-colors"
                                            value={jungleCoins}
                                            onChange={(e) => setJungleCoins(Number(e.target.value))}
                                        />
                                    </div>
                                    <p className="text-[10px] text-muted-foreground mt-1">
                                        Represents equity holdings in TheGame ecosystem.
                                    </p>
                                </div>
                            </div>
                        )}

                        {/* ASSOCIATE CONFIG (Contracts) */}
                        {(roles.includes('associate') || roles.includes('partner')) && (
                            <div className="p-4 border rounded-lg bg-card animate-in fade-in slide-in-from-top-2 duration-200">
                                <div className="flex items-center gap-2 mb-4">
                                    <h4 className="font-semibold text-sm">Active Contracts</h4>
                                    <div className="h-px flex-1 bg-border" />
                                </div>

                                <div className="p-8 border border-dashed rounded flex flex-col items-center justify-center text-muted-foreground bg-muted/20">
                                    <FileText className="h-8 w-8 mb-2 opacity-20" />
                                    <span className="text-xs">No active contracts assigned.</span>
                                    <Button variant="ghost" size="sm" className="h-auto p-0 mt-1 text-xs hover:bg-transparent underline">
                                        + Assign Contract
                                    </Button>
                                    {/* Placeholder for future Multi-Select Contracts */}
                                </div>
                            </div>
                        )}

                    </div>
                </div>

                <DialogFooter className="mt-auto pt-4 border-t">
                    <Button variant="outline" onClick={onClose}>Cancel</Button>
                    <Button onClick={handleSave} disabled={loading}>Save Configuration</Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
