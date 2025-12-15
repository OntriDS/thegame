'use client';

import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { getInteractiveSubModalZIndex } from '@/lib/utils/z-index-utils';
import { Business, Character } from '@/types/entities';
import { SearchableSelect } from '@/components/ui/searchable-select';
import { Label } from '@/components/ui/label';
import { Check } from 'lucide-react';
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
                <DialogHeader className="pb-2 text-center">
                    <DialogTitle>Management Configurator</DialogTitle>
                    <DialogDescription>
                        Configure roles, partnerships, and investor status.
                    </DialogDescription>
                </DialogHeader>

                <div className="flex-1 overflow-y-auto py-2 space-y-4 px-1">

                    {/* 1. CHARACTER SELECTION & ROLE TOGGLES - Side by Side on larger screens? No, keep stacked but tight */}
                    <div className="grid gap-4">
                        <div className="space-y-2">
                            <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Character Assignment</Label>
                            <SearchableSelect
                                value={characterId}
                                onValueChange={setCharacterId}
                                placeholder="Select a character..."
                                options={characterOptions}
                                autoGroupByCategory={true}
                                className="h-9 text-sm"
                            />
                        </div>

                        <div className="space-y-2">
                            <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Relationship Type</Label>
                            <div className="flex gap-2">
                                {['Associate', 'Partner', 'Investor'].map((label) => {
                                    const value = label.toLowerCase();
                                    const isSelected = roles.includes(value);
                                    return (
                                        <div
                                            key={value}
                                            onClick={() => toggleRole(value)}
                                            className={`
                                                flex-1 cursor-pointer flex items-center justify-center p-2 rounded-md border transition-all select-none
                                                ${isSelected
                                                    ? 'border-primary bg-primary/10 text-primary font-medium'
                                                    : 'border-muted hover:bg-muted/50 text-muted-foreground'
                                                }
                                            `}
                                        >
                                            <div className={`mr-2 h-3 w-3 rounded-full border flex items-center justify-center ${isSelected ? 'border-primary bg-primary' : 'border-muted-foreground'}`}>
                                                {isSelected && <Check className="h-2 w-2 text-primary-foreground" />}
                                            </div>
                                            <span className="text-xs">{label}</span>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    </div>

                    <div className="h-px bg-border my-2" />

                    {/* 3. CONDITIONAL CONFIGURATION SECTIONS - Compacted */}
                    <div className="space-y-3">

                        {/* PARTNER CONFIG */}
                        {roles.includes('partner') && (
                            <div className="p-3 border rounded-md bg-card animate-in fade-in slide-in-from-top-2 duration-200">
                                <div className="flex items-center justify-between mb-3">
                                    <h4 className="font-semibold text-xs flex items-center gap-2">
                                        <span className="h-2 w-2 rounded-full bg-blue-500" /> Partner Shares
                                    </h4>
                                    <div className="text-xs text-muted-foreground">
                                        Owned: <span className="font-bold text-foreground">{totalShares > 0 ? ((shares / totalShares) * 100).toFixed(1) : 0}%</span>
                                    </div>
                                </div>
                                <div className="space-y-3">
                                    <SearchableSelect
                                        value={businessId}
                                        onValueChange={setBusinessId}
                                        placeholder="Select Business Entity..."
                                        options={businessOptions}
                                        autoGroupByCategory={true}
                                        className="h-8 text-xs"
                                    />
                                    <div className="grid grid-cols-2 gap-3 items-center">
                                        <div className="space-y-1">
                                            <Label className="text-[10px] text-muted-foreground uppercase">Shares</Label>
                                            <NumericInput
                                                className="h-8 text-xs"
                                                value={shares}
                                                onChange={setShares}
                                                placeholder="0"
                                            />
                                        </div>
                                        <div className="space-y-1">
                                            <Label className="text-[10px] text-muted-foreground uppercase">Total</Label>
                                            <NumericInput
                                                className="h-8 text-xs"
                                                value={totalShares}
                                                onChange={setTotalShares}
                                                placeholder="100"
                                            />
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* INVESTOR CONFIG */}
                        {roles.includes('investor') && (
                            <div className="p-3 border rounded-md bg-card animate-in fade-in slide-in-from-top-2 duration-200">
                                <h4 className="font-semibold text-xs flex items-center gap-2 mb-3">
                                    <span className="h-2 w-2 rounded-full bg-amber-500" /> Investor Holdings
                                </h4>
                                <div className="flex items-center gap-3">
                                    <div className="relative flex-1">
                                        <span className="absolute left-2.5 top-2 text-xs font-bold text-amber-500">J$</span>
                                        <input
                                            type="number"
                                            className="flex h-8 w-full rounded-md border border-input bg-transparent pl-7 pr-3 py-1 text-xs shadow-sm transition-colors"
                                            value={jungleCoins}
                                            onChange={(e) => setJungleCoins(Number(e.target.value))}
                                            placeholder="Initial Investment"
                                        />
                                    </div>
                                    <p className="text-[10px] text-muted-foreground flex-1 leading-tight">
                                        Equity via Jungle Coins (J$).
                                    </p>
                                </div>
                            </div>
                        )}

                        {/* ASSOCIATE CONFIG (Contracts) */}
                        {(roles.includes('associate') || roles.includes('partner')) && (
                            <div className="p-3 border rounded-md bg-card animate-in fade-in slide-in-from-top-2 duration-200">
                                <div className="flex items-center justify-between mb-2">
                                    <h4 className="font-semibold text-xs flex items-center gap-2">
                                        <span className="h-2 w-2 rounded-full bg-slate-500" /> Contracts
                                    </h4>
                                    <Button variant="ghost" size="sm" className="h-6 px-2 text-[10px] hover:bg-accent -mr-1">
                                        + Assign
                                    </Button>
                                </div>

                                {contractIds.length === 0 ? (
                                    <div className="py-2 border-2 border-dashed rounded flex flex-col items-center justify-center text-muted-foreground bg-muted/20">
                                        <span className="text-[10px] italic">No active contracts assigned.</span>
                                    </div>
                                ) : (
                                    <div className="max-h-[120px] overflow-y-auto pr-1 space-y-1 scrollbar-thin scrollbar-thumb-muted-foreground/20">
                                        {/* Mock List for visualization if contractIds were populated */}
                                        {contractIds.map(id => (
                                            <div key={id} className="text-xs p-1 border rounded bg-background">Contract {id}</div>
                                        ))}
                                    </div>
                                )}
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
