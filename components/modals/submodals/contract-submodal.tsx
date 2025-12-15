'use client';

import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { NumericInput } from '@/components/ui/numeric-input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Trash2, Plus, FileText, DollarSign, PenTool } from 'lucide-react';
import { getInteractiveSubModalZIndex } from '@/lib/utils/z-index-utils';
import { Contract, Business, ContractClause } from '@/types/entities';
import { ContractStatus, ContractClauseType } from '@/types/enums';
import { v4 as uuid } from 'uuid';
import { ScrollArea } from '@/components/ui/scroll-area';

interface ContractSubmodalProps {
    open: boolean;
    onClose: () => void;
    onSave: (contract: Contract) => void;
    initialData?: Contract;

    // Context: Who is making the contract?
    principalEntity?: { id: string, name: string, type: 'character' | 'business' };
    // Target: Who is the contract with?
    counterpartyEntity?: { id: string, name: string, type: 'character' | 'business' };
}

export function ContractSubmodal({
    open,
    onClose,
    onSave,
    initialData,
    principalEntity,
    counterpartyEntity
}: ContractSubmodalProps) {
    const [name, setName] = useState('');
    const [status, setStatus] = useState<ContractStatus>(ContractStatus.DRAFT);
    const [notes, setNotes] = useState('');
    const [clauses, setClauses] = useState<ContractClause[]>([]);

    useEffect(() => {
        if (open) {
            if (initialData) {
                setName(initialData.name);
                setStatus(initialData.status);
                setNotes(initialData.notes || '');
                setClauses(initialData.clauses || []);
            } else {
                // Default Name
                const pName = principalEntity?.name || 'Me';
                const cName = counterpartyEntity?.name || 'Partner';
                setName(`${pName} ↔ ${cName} Agreement`);
                setStatus(ContractStatus.DRAFT);
                setNotes('');
                setClauses([]);
            }
        }
    }, [open, initialData, principalEntity, counterpartyEntity]);

    const addClause = (type: ContractClauseType) => {
        let newClause: ContractClause = {
            id: uuid(),
            type,
            description: '',
            companyShare: 0,
            associateShare: 0
        };

        // Preset Defaults based on Type
        switch (type) {
            case ContractClauseType.SALES_COMMISSION:
                newClause.description = 'Standard Sales Commission';
                newClause.companyShare = 0.70; // Owner
                newClause.associateShare = 0.30; // Seller
                break;
            case ContractClauseType.EXPENSE_SHARING:
                newClause.description = 'Shared Booth Cost';
                newClause.companyShare = 0.50;
                newClause.associateShare = 0.50;
                break;
            // We can treat SPONSORSHIP as a special case of FIXED_FEE or similar if we strictly follow enums,
            // but for now let's map it to a generic type or re-use existing logic with nice descriptions.
            // Assuming we might add a generic 'FEE' type later. For now, we reuse existing fields creatively or add a type.
            // Let's assume user wants to add "Sponsorship" as a concept.
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

    const handleSave = () => {
        // Validation?
        const contract: Contract = {
            id: initialData?.id || uuid(),
            name,
            description: 'Generated Contract', // Could be input
            // We are using polymorphic approach or mapping to Business IDs. 
            // For V0.1 we might need to strictly map to Business ID if schema requires it, 
            // OR we update schema. Assuming pure JSON flexibility for now.
            principalBusinessId: principalEntity?.id || 'SELF',
            counterpartyBusinessId: counterpartyEntity?.id || 'OTHER',
            status,
            validFrom: initialData?.validFrom || new Date(),
            clauses: clauses,
            notes: notes || undefined,
            createdAt: initialData?.createdAt || new Date(),
            updatedAt: new Date(),
            links: initialData?.links || [],
        };

        onSave(contract);
        onClose();
    };

    return (
        <Dialog open={open} onOpenChange={(val) => !val && onClose()}>
            <DialogContent
                className="sm:max-w-[800px] h-[600px] flex flex-col p-0 gap-0 overflow-hidden"
                style={{ zIndex: getInteractiveSubModalZIndex() }}
            >
                {/* HEADER */}
                <div className="px-6 py-4 border-b flex justify-between items-center bg-muted/10">
                    <div className="flex items-center gap-3">
                        <div className="bg-indigo-100 p-2 rounded-lg">
                            <PenTool className="h-5 w-5 text-indigo-600" />
                        </div>
                        <div>
                            <DialogTitle className="text-lg">Contract Definition</DialogTitle>
                            <DialogDescription className="text-xs mt-1">
                                Define terms between <strong>{principalEntity?.name}</strong> and <strong>{counterpartyEntity?.name}</strong>.
                            </DialogDescription>
                        </div>
                    </div>
                </div>

                <div className="flex-1 overflow-hidden flex flex-col">
                    <ScrollArea className="flex-1 p-6">
                        <div className="space-y-6 max-w-2xl mx-auto">

                            {/* 1. KEY DETAILS */}
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2 col-span-2">
                                    <Label className="text-xs font-semibold uppercase text-muted-foreground">Contract Title</Label>
                                    <Input
                                        value={name}
                                        onChange={(e) => setName(e.target.value)}
                                        className="font-medium text-lg h-10"
                                        placeholder="e.g. Standard Consignment Agreement"
                                    />
                                </div>
                            </div>

                            <div className="h-px bg-border my-4" />

                            {/* 2. CLAUSES */}
                            <div className="space-y-4">
                                <div className="flex items-center justify-between">
                                    <h3 className="text-sm font-semibold flex items-center gap-2">
                                        <FileText className="h-4 w-4 text-indigo-500" /> Stub Clauses
                                    </h3>
                                    <div className="flex gap-2">
                                        <Button size="sm" variant="outline" onClick={() => addClause(ContractClauseType.SALES_COMMISSION)} className="h-7 text-xs">
                                            + Commission
                                        </Button>
                                        <Button size="sm" variant="outline" onClick={() => addClause(ContractClauseType.EXPENSE_SHARING)} className="h-7 text-xs">
                                            + Expense Share
                                        </Button>
                                    </div>
                                </div>

                                {clauses.length === 0 ? (
                                    <div className="p-8 border-2 border-dashed rounded-lg flex flex-col items-center justify-center text-muted-foreground bg-muted/5">
                                        <FileText className="h-8 w-8 mb-2 opacity-20" />
                                        <p className="text-sm">No clauses defined.</p>
                                        <p className="text-xs">Add a clause to define how money is split.</p>
                                    </div>
                                ) : (
                                    <div className="space-y-3">
                                        {clauses.map((clause, index) => (
                                            <div key={clause.id} className="p-4 border rounded-lg bg-card shadow-sm group hover:border-indigo-300 transition-colors">
                                                <div className="flex justify-between items-start mb-3">
                                                    <div className="flex items-center gap-2">
                                                        <div className="h-6 w-6 rounded-full bg-slate-100 flex items-center justify-center text-xs font-bold text-slate-500">
                                                            {index + 1}
                                                        </div>
                                                        <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{clause.type}</span>
                                                    </div>
                                                    <Button variant="ghost" size="icon" className="h-6 w-6 text-muted-foreground hover:text-red-500" onClick={() => removeClause(clause.id)}>
                                                        <Trash2 className="h-3 w-3" />
                                                    </Button>
                                                </div>

                                                <div className="grid grid-cols-12 gap-4 items-center">
                                                    <div className="col-span-6 space-y-1">
                                                        <Label className="text-[10px]">Description</Label>
                                                        <Input
                                                            value={clause.description}
                                                            onChange={(e) => updateClause(clause.id, 'description', e.target.value)}
                                                            className="h-8 text-xs"
                                                            placeholder="Clause description..."
                                                        />
                                                    </div>

                                                    {/* Shares Visualization */}
                                                    <div className="col-span-6 space-y-1">
                                                        <Label className="text-[10px] text-center block">Revenue Split</Label>
                                                        <div className="flex items-center gap-2">
                                                            <div className="flex-1 relative">
                                                                <NumericInput
                                                                    value={clause.companyShare * 100}
                                                                    onChange={(v) => updateClause(clause.id, 'companyShare', v / 100)}
                                                                    className="h-8 text-xs pr-6"
                                                                />
                                                                <span className="absolute right-2 top-2 text-[10px] text-muted-foreground">%</span>
                                                                <span className="text-[9px] text-muted-foreground absolute -bottom-4 left-0">Principal</span>
                                                            </div>
                                                            <div className="text-muted-foreground text-xs">:</div>
                                                            <div className="flex-1 relative">
                                                                <NumericInput
                                                                    value={clause.associateShare * 100}
                                                                    onChange={(v) => updateClause(clause.id, 'associateShare', v / 100)}
                                                                    className="h-8 text-xs pr-6 bg-slate-50"
                                                                    disabled // Auto-calculated for now
                                                                />
                                                                <span className="absolute right-2 top-2 text-[10px] text-muted-foreground">%</span>
                                                                <span className="text-[9px] text-muted-foreground absolute -bottom-4 right-0">Counterparty</span>
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

                <DialogFooter className="px-6 py-4 border-t bg-muted/10">
                    <Button variant="outline" onClick={onClose}>Cancel</Button>
                    <Button onClick={handleSave} className="bg-indigo-600 hover:bg-indigo-700 min-w-[120px]">
                        Save Contract
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
