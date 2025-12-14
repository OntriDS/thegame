'use client';

import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { getInteractiveSubModalZIndex } from '@/lib/utils/z-index-utils';
import { Business, Character } from '@/types/entities';

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
    const [role, setRole] = useState<'Associate' | 'Partner' | 'Investor'>('Associate');

    // Partner Specific
    const [businessId, setBusinessId] = useState('');
    const [shares, setShares] = useState(0);
    const [totalShares, setTotalShares] = useState(100);

    // Investor Specific
    const [jungleCoins, setJungleCoins] = useState(0);

    const handleSave = () => {
        setLoading(true);
        // Placeholder save logic - just surfacing data for now
        const data = {
            characterId,
            role,
            meta: role === 'Partner' ? { businessId, shares, totalShares } :
                role === 'Investor' ? { jungleCoins } : {}
        };

        onSave(data);
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

                <div className="grid gap-6 py-4">
                    {/* CHARACTER SELECTION PLACEHOLDER */}
                    <div className="p-4 border border-dashed rounded bg-slate-50 dark:bg-slate-900/10 text-center text-sm text-muted-foreground">
                        [SearchableSelect to Select Character will go here]
                    </div>

                    {/* ROLE SELECTION */}
                    <div className="space-y-3">
                        <label className="text-sm font-medium">Relationship Type</label>
                        <div className="grid grid-cols-3 gap-2">
                            {['Associate', 'Partner', 'Investor'].map((r) => (
                                <div
                                    key={r}
                                    onClick={() => setRole(r as any)}
                                    className={`
                                        cursor-pointer flex flex-col items-center justify-center p-3 rounded-lg border transition-all
                                        ${role === r
                                            ? 'border-primary bg-primary/5 ring-1 ring-primary'
                                            : 'border-muted hover:bg-muted/50'
                                        }
                                    `}
                                >
                                    <span className="text-sm font-semibold">{r}</span>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* CONDITIONAL FIELDS */}
                    {role === 'Partner' && (
                        <div className="space-y-4 border p-4 rounded-lg bg-slate-50 dark:bg-slate-900/20">
                            <h4 className="font-semibold text-sm">Partner Details</h4>
                            <div className="p-2 border border-dashed rounded bg-white dark:bg-black/20 text-center text-xs text-muted-foreground">
                                [SearchableSelect for Business will go here]
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <label className="text-xs">Shares Held</label>
                                    <input
                                        type="number"
                                        className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors"
                                        value={shares}
                                        onChange={(e) => setShares(Number(e.target.value))}
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-xs">Total Outstanding</label>
                                    <input
                                        type="number"
                                        className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors"
                                        value={totalShares}
                                        onChange={(e) => setTotalShares(Number(e.target.value))}
                                    />
                                </div>
                            </div>
                            <div className="text-xs text-right text-muted-foreground">
                                Ownership: <span className="font-bold text-foreground">{((shares / totalShares) * 100).toFixed(1)}%</span>
                            </div>
                        </div>
                    )}

                    {role === 'Investor' && (
                        <div className="space-y-4 border p-4 rounded-lg bg-amber-500/10 border-amber-500/20">
                            <h4 className="font-semibold text-sm text-amber-600 dark:text-amber-400">Investor Holdings</h4>
                            <p className="text-xs text-muted-foreground">
                                Investors hold equity in <strong>TheGame</strong> ecosystem via Jungle Coins (J$).
                            </p>
                            <div className="space-y-2">
                                <label className="text-xs">Initial J$ Investment</label>
                                <div className="relative">
                                    <span className="absolute left-3 top-2.5 text-xs font-bold text-amber-500">J$</span>
                                    <input
                                        type="number"
                                        className="flex h-9 w-full rounded-md border border-input bg-transparent pl-8 pr-3 py-1 text-sm shadow-sm transition-colors"
                                        value={jungleCoins}
                                        onChange={(e) => setJungleCoins(Number(e.target.value))}
                                    />
                                </div>
                            </div>
                        </div>
                    )}

                    {role === 'Associate' && (
                        <div className="p-4 rounded-lg bg-blue-500/10 border border-blue-500/20 text-xs text-muted-foreground">
                            Associates are collaborators who can be assigned specific active contracts later.
                        </div>
                    )}

                </div>

                <DialogFooter>
                    <Button variant="outline" onClick={onClose}>Cancel</Button>
                    <Button onClick={handleSave} disabled={loading}>Save Partnership</Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
