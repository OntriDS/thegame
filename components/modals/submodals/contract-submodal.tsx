'use client';

import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { NumericInput } from '@/components/ui/numeric-input';
import { Label } from '@/components/ui/label';
import { SearchableSelect } from '@/components/ui/searchable-select';
import { Trash2, Plus, FileText, PenTool } from 'lucide-react';
import { getInteractiveSubModalZIndex } from '@/lib/utils/z-index-utils';
import { Contract, Business, ContractClause, Character } from '@/types/entities';
import { ContractStatus, ContractClauseType, LinkType, EntityType, CharacterRole } from '@/types/enums';
import { getContractStatusLabel } from '@/lib/constants/status-display-labels';
import { v4 as uuid } from 'uuid';
import { ScrollArea } from '@/components/ui/scroll-area';
import { ClientAPI } from '@/lib/client-api';
import { ensureCharacterHasRole } from '@/lib/utils/character-role-sync';

interface ContractSubmodalProps {
    open: boolean;
    onClose: () => void;
    onSave: (contract: Contract) => void;
    onDelete?: (contractId: string) => void;
    initialData?: Contract;

    // Context: Who is making the contract?
    principalEntity?: { id: string, name: string, type: 'character' | 'business' };
    // Target: Who is the contract with?
    counterpartyEntity?: { id: string, name: string, type: 'character' | 'business' };

    // For selection if counterparty is not provided
    availableCharacters?: Character[];
    availableBusinesses?: Business[];

}

export function ContractSubmodal({
    open,
    onClose,
    onSave,
    onDelete,
    initialData,
    principalEntity, // Legacy prop from parent, might be overridden by manual selection now
    counterpartyEntity,
    availableCharacters = [],
    availableBusinesses = [],
}: ContractSubmodalProps) {
    const [name, setName] = useState('');
    const [status, setStatus] = useState<ContractStatus>(ContractStatus.ACTIVE);
    const [clauses, setClauses] = useState<ContractClause[]>([]);

    // Principal Selection State (Me)
    const [principalCharacterId, setPrincipalCharacterId] = useState<string>('');
    // Counterparty State (Them)
    const [selectedCounterpartyId, setSelectedCounterpartyId] = useState<string>('');
    const [isSaving, setIsSaving] = useState(false);
    const [businessCharacterIds, setBusinessCharacterIds] = useState<Record<string, string>>({});

    useEffect(() => {
        let cancelled = false;
        Promise.all(availableBusinesses.map(async (business) => {
            const links = await ClientAPI.getLinksFor({ type: EntityType.BUSINESS, id: business.id });
            const owner = links.find((link: any) =>
                link.linkType === LinkType.CHARACTER_BUSINESS &&
                link.source?.type === EntityType.CHARACTER &&
                link.target?.type === EntityType.BUSINESS &&
                link.target.id === business.id
            );
            return owner ? [business.id, owner.source.id] as const : null;
        })).then((entries) => {
            if (!cancelled) setBusinessCharacterIds(Object.fromEntries(entries.filter(Boolean) as Array<readonly [string, string]>));
        }).catch(() => {
            if (!cancelled) setBusinessCharacterIds({});
        });
        return () => { cancelled = true; };
    }, [availableBusinesses]);

    // Filtered Options
    // Filtered Options
    const principalCharacters = React.useMemo(() =>
        availableCharacters.filter(c => c.roles.includes(CharacterRole.FOUNDER) || c.roles.includes(CharacterRole.PLAYER)),
        [availableCharacters]);

    // Initial Load Effect
    useEffect(() => {
        if (open) {
            if (initialData) {
                setName(initialData.name);
                setStatus(initialData.status);
                setClauses(initialData.clauses || []);
                ClientAPI.getLinksFor({ type: EntityType.CONTRACT, id: initialData.id }).then((links: any[]) => {
                    const characterLinks = links.filter((link) =>
                        link.linkType === LinkType.CHARACTER_CONTRACT &&
                        link.source?.type === EntityType.CHARACTER &&
                        link.target?.id === initialData.id
                    );
                    const owner = characterLinks.find((link) => link.relationship === 'owner');
                    const counterparty = characterLinks.find((link) => link.relationship === 'counterparty');
                    if (owner) setPrincipalCharacterId(owner.source.id);
                    if (counterparty) setSelectedCounterpartyId(counterparty.source.id);
                }).catch(() => undefined);
            } else {
                // New Contract Defaults
                setStatus(ContractStatus.ACTIVE); // Default to Active
                setClauses([]);

                // Set default counterparty if props provided
                if (counterpartyEntity) {
                    setSelectedCounterpartyId(
                        counterpartyEntity.type === 'character'
                            ? counterpartyEntity.id
                            : (businessCharacterIds[counterpartyEntity.id] || '')
                    );
                } else {
                    setSelectedCounterpartyId('');
                }

                // Try to smart-default the Principal Character (if only 1 Founder/Player)
                const defaultPrincipal = principalCharacters[0];
                if (defaultPrincipal) {
                    setPrincipalCharacterId(defaultPrincipal.id);
                }
            }
        }
    }, [open, initialData, counterpartyEntity, availableBusinesses, principalCharacters, businessCharacterIds]); // Minimal deps to avoid loops

    // Name Auto-Generator
    useEffect(() => {
        if (!initialData && open) {
            // Resolve Names
            let pName = 'Me';
            if (principalCharacterId) {
                const character = availableCharacters.find(x => x.id === principalCharacterId);
                if (character) pName = character.name;
            }

            let cName = 'Partner';
            if (counterpartyEntity) {
                cName = counterpartyEntity.name;
            } else if (selectedCounterpartyId) {
                const c = availableCharacters.find(x => x.id === selectedCounterpartyId);
                if (c) cName = c.name;
            }

            // Only update if user hasn't typed a custom name (starts with 'Me' or contains 'Agreement')
            // Simple check to avoid overwriting user changes too aggressively
            if (!name || name.includes('Agreement')) {
                setName(`${pName} ↔ ${cName} Agreement`);
            }
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [principalCharacterId, selectedCounterpartyId, open]);


    const addClause = (type: ContractClauseType) => {
        let newClause: ContractClause = {
            id: uuid(),
            type,
            description: '',
            companyShare: 0,
            partnerShare: 0
        };

        // Preset Intelligent Defaults (The "Templates")
        switch (type) {
            case ContractClauseType.SALES_COMMISSION:
                newClause.description = 'My Items sold by Partner';
                newClause.companyShare = 0.75; // I keep stock, I keep 75%
                newClause.partnerShare = 0.25; // They get 25% commission
                break;
            case ContractClauseType.SALES_SERVICE:
                newClause.description = 'Partner Items sold by Me';
                newClause.companyShare = 0.25; // I take 25% Service Fee
                newClause.partnerShare = 0.75; // They keep 75%
                break;
            case ContractClauseType.EXPENSE_SHARING:
                newClause.description = 'Shared Booth/Event Costs';
                newClause.companyShare = 0.50;
                newClause.partnerShare = 0.50;
                break;
            default:
                newClause.description = 'Custom Term';
                newClause.companyShare = 0.50;
                newClause.partnerShare = 0.50;
        }

        setClauses([...clauses, newClause]);
    };

    const removeClause = (id: string) => {
        setClauses(clauses.filter(c => c.id !== id));
    };

    const updateClause = (id: string, field: keyof ContractClause, value: any) => {
        setClauses(clauses.map(c => {
            if (c.id !== id) return c;

            // Auto-balance shares logic
            if (field === 'companyShare') {
                const compShare = Math.min(Math.max(Number(value), 0), 1);
                return { ...c, companyShare: compShare, partnerShare: parseFloat((1 - compShare).toFixed(2)) };
            }
            if (field === 'partnerShare') {
                const partnerShare = Math.min(Math.max(Number(value), 0), 1);
                return { ...c, partnerShare: partnerShare, companyShare: parseFloat((1 - partnerShare).toFixed(2)) };
            }

            return { ...c, [field]: value };
        }));
    };

    const handleSave = async () => {
        if (!name) return;

        // Contract party identity is canonical through Character→Contract links.
        const finalPrincipalCharacterId = principalCharacterId ||
            (principalEntity?.type === 'character' ? principalEntity.id : businessCharacterIds[principalEntity?.id || '']);
        if (!finalPrincipalCharacterId) {
            console.error("Issuer Character is required");
            return; // TODO: Show error UI
        }

        const finalCounterpartyCharacterId = selectedCounterpartyId ||
            (counterpartyEntity?.type === 'character' ? counterpartyEntity.id : businessCharacterIds[counterpartyEntity?.id || '']);
        if (!finalCounterpartyCharacterId) {
            console.error("Counterparty Character is required");
            return;
        }

        setIsSaving(true);

        try {
            const contract: Contract = {
                id: initialData?.id || uuid(),
                name,
                status,
                clauses: clauses,
                createdAt: initialData?.createdAt || new Date(),
                updatedAt: new Date(),
            } as unknown as Contract;

            onSave(contract);

            const contractLinks = [
                {
                    id: uuid(),
                    linkType: LinkType.CHARACTER_CONTRACT,
                    source: { type: EntityType.CHARACTER, id: finalPrincipalCharacterId },
                    target: { type: EntityType.CONTRACT, id: contract.id },
                    relationship: 'owner',
                    createdAt: new Date(),
                },
                {
                    id: uuid(),
                    linkType: LinkType.CHARACTER_CONTRACT,
                    source: { type: EntityType.CHARACTER, id: finalCounterpartyCharacterId },
                    target: { type: EntityType.CONTRACT, id: contract.id },
                    relationship: 'counterparty',
                    createdAt: new Date(),
                },
            ];
            const existingLinks = await ClientAPI.getLinksFor({ type: EntityType.CONTRACT, id: contract.id });
            for (const link of contractLinks) {
                const alreadyExists = existingLinks.some((existing: any) =>
                    existing.linkType === LinkType.CHARACTER_CONTRACT &&
                    existing.relationship === link.relationship &&
                    existing.source?.type === EntityType.CHARACTER &&
                    existing.source?.id === link.source.id &&
                    existing.target?.id === contract.id
                );
                if (!alreadyExists) await ClientAPI.createLink(link as any);
            }
            try {
                await ensureCharacterHasRole(finalCounterpartyCharacterId, CharacterRole.PARTNER);
            } catch (err) {
                console.error('Failed to update character role', err);
            }

            onClose();

        } catch (error) {
            console.error("Failed to save contract", error);
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={(val) => !val && !isSaving && onClose()}>
            <DialogContent
                className="sm:max-w-[700px] h-[700px] flex flex-col p-0 gap-0 overflow-hidden"
                zIndexLayer="SUB_MODALS"
            >
                {/* HEADER */}
                <div className="px-6 py-4 border-b flex justify-between items-center bg-background">
                    <div className="flex items-center gap-3">
                        <div className="bg-indigo-100 dark:bg-indigo-900/30 p-2 rounded-lg">
                            <PenTool className="h-5 w-5 text-indigo-600 dark:text-indigo-400" />
                        </div>
                        <div>
                            <DialogTitle className="text-lg">Contract Definition</DialogTitle>
                            <DialogDescription className="text-xs mt-1">
                                {initialData ? 'Edit existing agreement details' : 'Draft a new business agreement'}
                            </DialogDescription>
                        </div>
                    </div>

                    {/* Status Selector */}
                    <div className="flex items-center gap-2 bg-muted/50 p-1 rounded-md">
                        {[ContractStatus.ACTIVE, ContractStatus.PAUSED, ContractStatus.TERMINATED].map(s => (
                            <button
                                key={s}
                                onClick={() => setStatus(s)}
                                className={`px-3 py-1 text-[10px] font-bold uppercase rounded-sm transition-all 
                                     ${status === s
                                        ? s === ContractStatus.ACTIVE ? 'bg-emerald-100 text-emerald-700 shadow-sm'
                                            : s === ContractStatus.TERMINATED ? 'bg-red-100 text-red-700 shadow-sm'
                                                : 'bg-amber-100 text-amber-700 shadow-sm'
                                        : 'text-muted-foreground hover:bg-muted'
                                    }`}
                            >
                                {getContractStatusLabel(s)}
                            </button>
                        ))}
                    </div>
                </div>

                <div className="flex-1 overflow-hidden flex flex-col">
                    <ScrollArea className="flex-1 p-6">
                        <div className="space-y-6 max-w-3xl mx-auto">

                            {/* 1. PRINCIPAL SELECTOR (ME) */}
                            {!initialData && (
                                <div className="space-y-3 p-4 bg-slate-50 dark:bg-slate-900/20 rounded-lg border border-indigo-100 dark:border-indigo-900/20">
                                    <Label className="text-xs font-semibold uppercase tracking-wider text-indigo-600 dark:text-indigo-400">Principal (Me)</Label>
                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="space-y-1">
                                            <Label className="text-[10px] text-muted-foreground">My Character</Label>
                                            <SearchableSelect
                                                value={principalCharacterId}
                                                onValueChange={(val) => {
                                                    setPrincipalCharacterId(val);
                                                }}
                                                placeholder="Who are you?"
                                                options={principalCharacters.map(c => ({ value: c.id, label: c.name, category: c.roles[0] }))}
                                            />
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* 2. CONTRACT TITLE */}
                            <div className="space-y-2">
                                <Label className="text-xs font-semibold uppercase text-muted-foreground">Contract Title</Label>
                                <Input
                                    value={name}
                                    onChange={(e) => setName(e.target.value)}
                                    className="font-medium text-base h-10"
                                    placeholder="e.g. Me ↔ Partner Agreement"
                                />
                            </div>

                            {/* 3. COUNTERPARTY SELECTOR (THEM) */}
                            {!counterpartyEntity && !initialData && (
                                <div className="space-y-3">
                                    <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Counterparty Character</Label>

                                    <SearchableSelect
                                        value={selectedCounterpartyId}
                                        onValueChange={setSelectedCounterpartyId}
                                        placeholder="Search characters..."
                                        options={availableCharacters.map(c => ({
                                            value: c.id,
                                            label: c.name,
                                            category: c.roles?.[0] || 'Other'
                                        }))}
                                        autoGroupByCategory={true}
                                        className="w-full"
                                    />
                                </div>
                            )}

                            {/* 4. CONTRACT ROLE */}
                            {!initialData && (
                                <div className="text-xs text-muted-foreground">Contract role is fixed to Partner for this flow.</div>
                            )}

                            {/* 5. CLAUSES */}
                            <div className="space-y-3">
                                <div className="flex items-center justify-between">
                                    <Label className="text-xs font-semibold uppercase text-muted-foreground">Financial Clauses</Label>
                                    <div className="flex gap-2">
                                        <Button size="sm" variant="outline" onClick={() => addClause(ContractClauseType.SALES_COMMISSION)} className="h-7 text-xs">
                                            <Plus className="h-3 w-3 mr-1" /> Principal Sales
                                        </Button>
                                        <Button size="sm" variant="outline" onClick={() => addClause(ContractClauseType.SALES_SERVICE)} className="h-7 text-xs">
                                            <Plus className="h-3 w-3 mr-1" /> Booth-Sales
                                        </Button>
                                        <Button size="sm" variant="outline" onClick={() => addClause(ContractClauseType.EXPENSE_SHARING)} className="h-7 text-xs">
                                            <Plus className="h-3 w-3 mr-1" /> Exp. Share
                                        </Button>
                                    </div>
                                </div>

                                {clauses.length === 0 ? (
                                    <div className="py-8 border-2 border-dashed rounded-lg flex flex-col items-center justify-center text-muted-foreground">
                                        <FileText className="h-8 w-8 opacity-20 mb-2" />
                                        <p className="text-sm font-medium">No clauses defined</p>
                                    </div>
                                ) : (
                                    <div className="grid gap-3">
                                        {clauses.map((clause, index) => (
                                            <div key={clause.id} className="p-3 border rounded-lg bg-card hover:border-indigo-300 transition-all group">
                                                <div className="flex justify-between items-start mb-3">
                                                    <div className="flex items-center gap-2">
                                                        <div className="h-5 w-5 rounded-full bg-muted flex items-center justify-center text-xs font-bold text-muted-foreground">{index + 1}</div>
                                                        <div>
                                                            <div className="text-xs font-bold uppercase tracking-wider text-foreground">
                                                                {clause.type === ContractClauseType.SALES_COMMISSION && "Principal Commission"}
                                                                {clause.type === ContractClauseType.SALES_SERVICE && "Booth-Sales Service"}
                                                                {clause.type === ContractClauseType.EXPENSE_SHARING && "Expense Sharing"}
                                                                {clause.type === ContractClauseType.OTHER && "Other Term"}
                                                            </div>
                                                        </div>
                                                    </div>
                                                    <Button variant="ghost" size="icon" className="h-6 w-6 text-muted-foreground hover:text-red-500" onClick={() => removeClause(clause.id)}>
                                                        <Trash2 className="h-3.5 w-3.5" />
                                                    </Button>
                                                </div>
                                                <div className="grid grid-cols-2 gap-3">
                                                    <div className="space-y-1">
                                                        <Label className="text-[10px] font-semibold text-muted-foreground uppercase">Description</Label>
                                                        <Input value={clause.description} onChange={(e) => updateClause(clause.id, 'description', e.target.value)} className="h-8 text-xs" />
                                                    </div>
                                                    <div className="space-y-1">
                                                        <Label className="text-[10px] font-semibold text-muted-foreground uppercase text-center w-full block">Split</Label>
                                                        <div className="flex items-center gap-2">
                                                            <div className="flex-1 relative">
                                                                <NumericInput value={clause.companyShare * 100} onChange={(v) => updateClause(clause.id, 'companyShare', v / 100)} className="h-8 text-xs pr-6 text-right" />
                                                                <span className="absolute right-2 top-2 text-[10px] text-muted-foreground font-bold">%</span>
                                                            </div>
                                                            <span className="text-muted-foreground">/</span>
                                                            <div className="flex-1 relative">
                                                                <NumericInput value={clause.partnerShare * 100} onChange={(v) => updateClause(clause.id, 'partnerShare', v / 100)} className="h-8 text-xs pr-6 text-right" />
                                                                <span className="absolute right-2 top-2 text-[10px] text-muted-foreground font-bold">%</span>
                                                            </div>
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>

                        </div>
                    </ScrollArea>
                </div>

                <DialogFooter className="px-6 py-3 border-t flex justify-between items-center">
                    <div className="flex items-center gap-2">
                        {initialData && onDelete && (
                            <Button className="bg-red-600 hover:bg-red-700 text-white" size="sm" onClick={() => {
                                if (confirm("Are you sure you want to delete this contract? This cannot be undone.")) {
                                    onDelete(initialData.id);
                                }
                            }}>
                                <Trash2 className="h-4 w-4 mr-2" />
                                Delete Contract
                            </Button>
                        )}
                    </div>
                    <div className="flex gap-2">
                        <Button variant="outline" onClick={onClose}>Cancel</Button>
                        <Button onClick={handleSave} disabled={isSaving} className="min-w-[120px]">
                            {isSaving ? 'Saving...' : 'Save Contract'}
                        </Button>
                    </div>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
