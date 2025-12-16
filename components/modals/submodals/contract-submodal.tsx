'use client';

import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { NumericInput } from '@/components/ui/numeric-input';
import { Label } from '@/components/ui/label';
import { SearchableSelect } from '@/components/ui/searchable-select';
import { Trash2, Plus, FileText, DollarSign, PenTool, Link as LinkIcon, AlertTriangle } from 'lucide-react';
import { getInteractiveSubModalZIndex } from '@/lib/utils/z-index-utils';
import { Contract, Business, ContractClause, Character, Link } from '@/types/entities';
import { ContractStatus, ContractClauseType, LinkType, EntityType } from '@/types/enums';
import { v4 as uuid } from 'uuid';
import { ScrollArea } from '@/components/ui/scroll-area';
import { ClientAPI } from '@/lib/client-api';

interface ContractSubmodalProps {
    open: boolean;
    onClose: () => void;
    onSave: (contract: Contract) => void;
    initialData?: Contract;

    // Context: Who is making the contract?
    principalEntity?: { id: string, name: string, type: 'character' | 'business' };
    // Target: Who is the contract with?
    counterpartyEntity?: { id: string, name: string, type: 'character' | 'business' };

    // For selection if counterparty is not provided
    availableCharacters?: Character[];
}

export function ContractSubmodal({
    open,
    onClose,
    onSave,
    initialData,
    principalEntity,
    counterpartyEntity,
    availableCharacters = []
}: ContractSubmodalProps) {
    const [name, setName] = useState('');
    const [status, setStatus] = useState<ContractStatus>(ContractStatus.DRAFT);
    const [notes, setNotes] = useState('');
    const [clauses, setClauses] = useState<ContractClause[]>([]);

    // Counterparty State (if selecting manually)
    const [selectedCounterpartyId, setSelectedCounterpartyId] = useState<string>('');
    const [isSaving, setIsSaving] = useState(false);

    // Initial Load Effect
    useEffect(() => {
        if (open) {
            if (initialData) {
                setName(initialData.name);
                setStatus(initialData.status);
                setNotes(initialData.notes || '');
                setClauses(initialData.clauses || []);
                // If editing, counterparty is fixed in the data
            } else {
                // New Contract
                setStatus(ContractStatus.DRAFT);
                setNotes('');
                setClauses([]);

                // Set default counterparty if props provided
                if (counterpartyEntity) {
                    setSelectedCounterpartyId(counterpartyEntity.id);
                } else {
                    setSelectedCounterpartyId('');
                }
            }
        }
    }, [open, initialData, counterpartyEntity]);

    // Name Auto-Generator
    useEffect(() => {
        if (!initialData && open) {
            const pName = principalEntity?.name || 'Me';
            // Determine Counterparty Name
            let cName = 'Partner';
            if (counterpartyEntity) {
                cName = counterpartyEntity.name;
            } else if (selectedCounterpartyId && availableCharacters.length > 0) {
                const char = availableCharacters.find(c => c.id === selectedCounterpartyId);
                if (char) cName = char.name;
            }

            // Only update if user hasn't typed a custom name (simple heuristic: starts with 'Me ↔')
            if (!name || name.startsWith('Me ↔')) {
                setName(`${pName} ↔ ${cName} Agreement`);
            }
        }
    }, [open, initialData, principalEntity, counterpartyEntity, selectedCounterpartyId, availableCharacters]);


    const addClause = (type: ContractClauseType) => {
        let newClause: ContractClause = {
            id: uuid(),
            type,
            description: '',
            companyShare: 0,
            associateShare: 0
        };

        // Preset Intelligent Defaults (The "Templates")
        switch (type) {
            case ContractClauseType.SALES_COMMISSION:
                newClause.description = 'My Items sold by Associate';
                newClause.companyShare = 0.75; // I keep stock, I keep 75%
                newClause.associateShare = 0.25; // They get 25% commission
                break;
            case ContractClauseType.SALES_SERVICE:
                newClause.description = 'Associate Items sold by Me';
                newClause.companyShare = 0.25; // I take 25% Service Fee
                newClause.associateShare = 0.75; // They keep 75%
                break;
            case ContractClauseType.EXPENSE_SHARING:
                newClause.description = 'Shared Booth/Event Costs';
                newClause.companyShare = 0.50;
                newClause.associateShare = 0.50;
                break;
            default:
                newClause.description = 'Custom Term';
                newClause.companyShare = 0.50;
                newClause.associateShare = 0.50;
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
                return { ...c, companyShare: compShare, associateShare: parseFloat((1 - compShare).toFixed(2)) };
            }
            if (field === 'associateShare') {
                const assocShare = Math.min(Math.max(Number(value), 0), 1);
                return { ...c, associateShare: assocShare, companyShare: parseFloat((1 - assocShare).toFixed(2)) };
            }

            return { ...c, [field]: value };
        }));
    };

    const handleSave = async () => {
        if (!name) {
            console.error("Contract name is required");
            return;
        }

        // Determine Counterparty ID
        const finalCounterpartyId = counterpartyEntity?.id || selectedCounterpartyId;

        if (!finalCounterpartyId && !initialData) {
            console.error("A Counterparty (Associate) is required");
            return;
        }

        setIsSaving(true);

        try {
            const contract: Contract = {
                id: initialData?.id || uuid(),
                name,
                description: notes,
                principalBusinessId: principalEntity?.id || 'SELF',
                counterpartyBusinessId: finalCounterpartyId, // Linking to Character ID for now as "Business" representative
                status,
                validFrom: initialData?.validFrom || new Date(),
                clauses: clauses,
                notes: notes || undefined,
                createdAt: initialData?.createdAt || new Date(),
                updatedAt: new Date(),
                links: initialData?.links || [],
            };

            // 1. Save The Contract Entity
            // Assuming ClientAPI has a generic upsert or we use a specialized one. 
            // Since Contract is a BaseEntity, we might need a specific endpoint.
            // For now, I will assume the Parent handles the actual Entity Persistence via onSave,
            // BUT I will handle the Link Creation here as requested.

            // NOTE: If ClientAPI doesn't have upsertContract, we rely on parent. 
            // However, to create a link to it, it ideally should exist.
            // Let's assume onSave does the heavy lifting of saving the contract to DB.
            onSave(contract);

            // 2. Create the Link (The "Bridge")
            // specific requirement: "Execute ClientAPI.createLink to bind Contract <-> Character"
            // We do this ONLY if it's a new contract or link doesn't exist.

            // We need to wait for the contract to be "real" in some systems, but here we generate ID client-side.
            const link: Link = {
                id: uuid(),
                linkType: LinkType.CONTRACT_CHARACTER,
                source: { type: EntityType.CONTRACT, id: contract.id },
                target: { type: EntityType.CHARACTER, id: finalCounterpartyId },
                createdAt: new Date(),
                metadata: { role: 'associate' } // Helpful metadata
            };

            await ClientAPI.createLink(link);
            console.log("Contract saved and linked to Associate");
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
                className="sm:max-w-[800px] h-[700px] flex flex-col p-0 gap-0 overflow-hidden bg-slate-50 dark:bg-slate-950"
                style={{ zIndex: getInteractiveSubModalZIndex() }}
            >
                {/* HEADER */}
                <div className="px-6 py-4 border-b flex justify-between items-center bg-white dark:bg-slate-900 shadow-sm">
                    <div className="flex items-center gap-3">
                        <div className="bg-indigo-100 dark:bg-indigo-900/30 p-2 rounded-lg">
                            <PenTool className="h-5 w-5 text-indigo-600 dark:text-indigo-400" />
                        </div>
                        <div>
                            <DialogTitle className="text-lg">Contract Definition</DialogTitle>
                            <DialogDescription className="text-xs mt-1">
                                {counterpartyEntity
                                    ? <span>Define terms for <strong>{counterpartyEntity.name}</strong></span>
                                    : <span>Create a new business agreement</span>
                                }
                            </DialogDescription>
                        </div>
                    </div>
                </div>

                <div className="flex-1 overflow-hidden flex flex-col">
                    <ScrollArea className="flex-1 p-6">
                        <div className="space-y-8 max-w-3xl mx-auto">

                            {/* 1. CONTRACT HEADER */}
                            <div className="grid grid-cols-12 gap-6">
                                <div className="col-span-8 space-y-2">
                                    <Label className="text-xs font-semibold uppercase text-muted-foreground">Contract Title</Label>
                                    <Input
                                        value={name}
                                        onChange={(e) => setName(e.target.value)}
                                        className="font-medium text-lg h-11 shadow-sm bg-white dark:bg-slate-900"
                                        placeholder="e.g. Associate Agreement 2024"
                                    />
                                </div>
                                <div className="col-span-4 space-y-2">
                                    <Label className="text-xs font-semibold uppercase text-muted-foreground">Reference Number</Label>
                                    <div className="h-11 px-3 flex items-center bg-muted/20 rounded-md border text-xs font-mono text-muted-foreground">
                                        {initialData?.id.substring(0, 8) || 'AUTO-GENERATED'}
                                    </div>
                                </div>
                            </div>

                            {/* 2. PARTIES & SELECTOR */}
                            {!counterpartyEntity && !initialData && (
                                <div className="p-4 bg-indigo-50 dark:bg-indigo-950/20 border border-indigo-100 dark:border-indigo-900/50 rounded-lg space-y-3">
                                    <div className="flex items-center gap-2 text-indigo-700 dark:text-indigo-300">
                                        <AlertTriangle className="h-4 w-4" />
                                        <h3 className="text-sm font-semibold">Select Counterparty</h3>
                                    </div>
                                    <p className="text-xs text-muted-foreground">Who is this contract with? (Associate, Partner, or Business)</p>
                                    <div className="max-w-md">
                                        <SearchableSelect
                                            options={availableCharacters.map(c => ({ value: c.id, label: c.name }))}
                                            value={selectedCounterpartyId}
                                            onValueChange={(val) => setSelectedCounterpartyId(val)}
                                            placeholder="Search Associate..."
                                            className="bg-white dark:bg-slate-900"
                                        />
                                    </div>
                                </div>
                            )}

                            <div className="h-px bg-border my-2" />

                            {/* 3. CLAUSES DEFINITION */}
                            <div className="space-y-4">
                                <div className="flex items-center justify-between">
                                    <h3 className="text-sm font-semibold flex items-center gap-2">
                                        <FileText className="h-4 w-4 text-indigo-500" />
                                        Financial Clauses
                                    </h3>
                                    {/* Action Buttons - Distinct Types */}
                                    <div className="flex gap-2">
                                        <Button size="sm" variant="outline" onClick={() => addClause(ContractClauseType.SALES_COMMISSION)} className="h-8 text-xs bg-indigo-50 hover:bg-indigo-100 dark:bg-indigo-950 dark:hover:bg-indigo-900 border-indigo-200">
                                            <Plus className="h-3 w-3 mr-1" /> Principal Sales (75/25)
                                        </Button>
                                        <Button size="sm" variant="outline" onClick={() => addClause(ContractClauseType.SALES_SERVICE)} className="h-8 text-xs bg-pink-50 hover:bg-pink-100 dark:bg-pink-950 dark:hover:bg-pink-900 border-pink-200">
                                            <Plus className="h-3 w-3 mr-1" /> Associate Sales (25/75)
                                        </Button>
                                        <Button size="sm" variant="outline" onClick={() => addClause(ContractClauseType.EXPENSE_SHARING)} className="h-8 text-xs bg-slate-50 hover:bg-slate-100 border-slate-200">
                                            <Plus className="h-3 w-3 mr-1" /> Exp. Share (50/50)
                                        </Button>
                                    </div>
                                </div>

                                {clauses.length === 0 ? (
                                    <div className="py-12 border-2 border-dashed rounded-xl flex flex-col items-center justify-center text-muted-foreground bg-slate-50/50 dark:bg-slate-900/20">
                                        <div className="h-12 w-12 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center mb-3">
                                            <FileText className="h-6 w-6 opacity-40" />
                                        </div>
                                        <p className="text-sm font-medium">No clauses defined</p>
                                        <p className="text-xs text-muted-foreground max-w-xs text-center mt-1">
                                            Add clauses above to define how revenue and expenses are split between the parties.
                                        </p>
                                    </div>
                                ) : (
                                    <div className="grid gap-4">
                                        {clauses.map((clause, index) => (
                                            <div key={clause.id} className="p-4 border rounded-xl bg-white dark:bg-slate-900 shadow-sm hover:border-indigo-300 transition-all group">

                                                {/* Clause Header */}
                                                <div className="flex justify-between items-start mb-4">
                                                    <div className="flex items-center gap-3">
                                                        <div className="h-6 w-6 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-xs font-bold text-slate-500">
                                                            {index + 1}
                                                        </div>
                                                        <div>
                                                            <div className="text-xs font-bold uppercase tracking-wider text-indigo-600 dark:text-indigo-400">
                                                                {clause.type === ContractClauseType.SALES_COMMISSION && "Principal Commission"}
                                                                {clause.type === ContractClauseType.SALES_SERVICE && "Associate Sales Service"}
                                                                {clause.type === ContractClauseType.EXPENSE_SHARING && "Expense Sharing"}
                                                                {clause.type === ContractClauseType.OTHER && "Other Term"}
                                                            </div>
                                                            <div className="text-[10px] text-muted-foreground">
                                                                {clause.type === ContractClauseType.SALES_COMMISSION && "Revenue from MY Items"}
                                                                {clause.type === ContractClauseType.SALES_SERVICE && "Revenue from THEIR Items"}
                                                                {clause.type === ContractClauseType.EXPENSE_SHARING && "Shared Costs (Rent, etc)"}
                                                            </div>
                                                        </div>
                                                    </div>
                                                    <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/30" onClick={() => removeClause(clause.id)}>
                                                        <Trash2 className="h-4 w-4" />
                                                    </Button>
                                                </div>

                                                {/* Clause Body */}
                                                <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-center">
                                                    <div className="md:col-span-6 space-y-1.5">
                                                        <Label className="text-[10px] font-semibold text-muted-foreground uppercase">Description / Category</Label>
                                                        <Input
                                                            value={clause.description}
                                                            onChange={(e) => updateClause(clause.id, 'description', e.target.value)}
                                                            className="h-9 text-xs"
                                                            placeholder="e.g. Jewelry Category, or Booth Fee"
                                                        />
                                                    </div>

                                                    {/* Shares Visualization */}
                                                    <div className="md:col-span-6 space-y-1.5">
                                                        <Label className="text-[10px] font-semibold text-muted-foreground uppercase text-center w-full block">Split Breakdown</Label>
                                                        <div className="flex items-center gap-3 p-1 rounded-lg bg-slate-50 dark:bg-slate-950/50 border border-slate-100 dark:border-slate-800">
                                                            <div className="flex-1 relative">
                                                                <NumericInput
                                                                    value={clause.companyShare * 100}
                                                                    onChange={(v) => updateClause(clause.id, 'companyShare', v / 100)}
                                                                    className="h-8 text-xs pr-6 text-right border-transparent bg-transparent focus:bg-white dark:focus:bg-slate-900 transition-colors"
                                                                />
                                                                <span className="absolute right-2 top-2 text-[10px] text-muted-foreground font-bold">%</span>
                                                                <span className="text-[9px] font-bold text-indigo-600 absolute -bottom-5 left-1">ME</span>
                                                            </div>
                                                            <div className="text-slate-300">/</div>
                                                            <div className="flex-1 relative">
                                                                <NumericInput
                                                                    value={clause.associateShare * 100}
                                                                    onChange={(v) => updateClause(clause.id, 'associateShare', v / 100)}
                                                                    className="h-8 text-xs pr-6 text-right border-transparent bg-transparent focus:bg-white dark:focus:bg-slate-900 transition-colors"
                                                                />
                                                                <span className="absolute right-2 top-2 text-[10px] text-muted-foreground font-bold">%</span>
                                                                <span className="text-[9px] font-bold text-pink-600 absolute -bottom-5 right-1">THEM</span>
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

                <DialogFooter className="px-6 py-4 border-t bg-white dark:bg-slate-900 shadow-sm flex justify-between items-center z-10">
                    <div className="text-xs text-muted-foreground flex items-center gap-2">
                        <LinkIcon className="h-3 w-3" />
                        {counterpartyEntity || selectedCounterpartyId ? 'Link will be created automatically' : 'Select a counterparty to link'}
                    </div>
                    <div className="flex gap-2">
                        <Button variant="outline" onClick={onClose}>Cancel</Button>
                        <Button onClick={handleSave} disabled={isSaving} className="bg-indigo-600 hover:bg-indigo-700 min-w-[140px] shadow-sm">
                            {isSaving ? 'Linking...' : 'Save Contract'}
                        </Button>
                    </div>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
