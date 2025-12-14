'use client';

import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { NumericInput } from '@/components/ui/numeric-input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
// separator removed
import { Trash2, Plus } from 'lucide-react';
import { getInteractiveSubModalZIndex } from '@/lib/utils/z-index-utils';
import { Contract, LegalEntity, ContractClause } from '@/types/entities';
import { ContractStatus, ContractClauseType } from '@/types/enums';
import { v4 as uuid } from 'uuid';

interface ContractSubmodalProps {
    open: boolean;
    onClose: () => void;
    onSave: (contract: Contract) => void;
    initialData?: Contract;
    legalEntities: LegalEntity[];
}

export function ContractSubmodal({
    open,
    onClose,
    onSave,
    initialData,
    legalEntities
}: ContractSubmodalProps) {
    const [principalId, setPrincipalId] = useState('');
    const [counterpartyId, setCounterpartyId] = useState('');
    const [status, setStatus] = useState<ContractStatus>(ContractStatus.DRAFT);
    const [notes, setNotes] = useState('');

    // Dynamic Clauses
    const [clauses, setClauses] = useState<ContractClause[]>([]);

    useEffect(() => {
        if (open) {
            if (initialData) {
                setPrincipalId(initialData.principalLegalEntityId);
                setCounterpartyId(initialData.counterpartyLegalEntityId);
                setStatus(initialData.status);
                setNotes(initialData.notes || '');
                setClauses(initialData.clauses || []);
            } else {
                setPrincipalId('');
                setCounterpartyId('');
                setStatus(ContractStatus.ACTIVE);
                setNotes('');
                // Default Clausses
                setClauses([
                    {
                        id: uuid(),
                        type: ContractClauseType.SALES_COMMISSION,
                        description: 'General Products Commission',
                        companyShare: 0.75,
                        associateShare: 0.25
                    },
                    {
                        id: uuid(),
                        type: ContractClauseType.EXPENSE_SHARING,
                        description: 'Shared Booth Costs',
                        companyShare: 0.50,
                        associateShare: 0.50
                    }
                ]);
            }
        }
    }, [open, initialData]);

    const addClause = () => {
        setClauses([
            ...clauses,
            {
                id: uuid(),
                type: ContractClauseType.SALES_COMMISSION,
                description: 'New Commission Clause',
                companyShare: 0.5,
                associateShare: 0.5
            }
        ]);
    };

    const removeClause = (id: string) => {
        setClauses(clauses.filter(c => c.id !== id));
    };

    const updateClause = (id: string, field: keyof ContractClause, value: any) => {
        setClauses(clauses.map(c => {
            if (c.id !== id) return c;

            if (field === 'companyShare') {
                // Auto adjust associate share
                const compShare = Number(value);
                return { ...c, companyShare: compShare, associateShare: parseFloat((1 - compShare).toFixed(2)) };
            }
            if (field === 'associateShare') {
                const assocShare = Number(value);
                return { ...c, associateShare: assocShare, companyShare: parseFloat((1 - assocShare).toFixed(2)) };
            }

            return { ...c, [field]: value };
        }));
    };

    const handleSave = () => {
        if (!principalId || !counterpartyId) return;

        const contract: Contract = {
            id: initialData?.id || uuid(),
            name: `${principalId}-${counterpartyId} Contract`,
            description: 'Partnership Contract',
            principalLegalEntityId: principalId,
            counterpartyLegalEntityId: counterpartyId,
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

    // Filter available entities (basic logic)
    const availableEntities = legalEntities;

    return (
        <Dialog open={open} onOpenChange={(val) => !val && onClose()}>
            <DialogContent
                className="sm:max-w-[700px]"
                style={{ zIndex: getInteractiveSubModalZIndex() }}
            >
                <DialogHeader>
                    <DialogTitle>{initialData ? 'Edit Contract' : 'New Partnership Contract'}</DialogTitle>
                    <DialogDescription>
                        Define clauses for commissions and expense sharing.
                    </DialogDescription>
                </DialogHeader>

                <div className="grid gap-6 py-4">
                    {/* PARTIES */}
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label>Principal (Me/Company)</Label>
                            <Select value={principalId} onValueChange={setPrincipalId}>
                                <SelectTrigger>
                                    <SelectValue placeholder="Select Principal..." />
                                </SelectTrigger>
                                <SelectContent>
                                    {availableEntities.map(e => (
                                        <SelectItem key={e.id} value={e.id}>{e.name}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="space-y-2">
                            <Label>Associate (Them)</Label>
                            <Select value={counterpartyId} onValueChange={setCounterpartyId}>
                                <SelectTrigger>
                                    <SelectValue placeholder="Select Associate..." />
                                </SelectTrigger>
                                <SelectContent>
                                    {availableEntities.filter(e => e.id !== principalId).map(e => (
                                        <SelectItem key={e.id} value={e.id}>{e.name}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                    </div>

                    <div className="border-b my-2" />

                    {/* CLAUSES BUILDER */}
                    <div className="space-y-4">
                        <div className="flex items-center justify-between">
                            <h4 className="font-semibold text-sm">Contract Clauses</h4>
                            <Button size="sm" variant="outline" onClick={addClause}>
                                <Plus className="h-3 w-3 mr-1" /> Add Clause
                            </Button>
                        </div>

                        <div className="max-h-[300px] overflow-y-auto space-y-3 pr-2">
                            {clauses.map((clause, index) => (
                                <div key={clause.id} className="p-3 border rounded-lg bg-slate-50 relative group">
                                    <div className="grid grid-cols-12 gap-3 items-end">
                                        <div className="col-span-3 space-y-1">
                                            <Label className="text-xs">Type</Label>
                                            <Select
                                                value={clause.type}
                                                onValueChange={(val) => updateClause(clause.id, 'type', val)}
                                            >
                                                <SelectTrigger className="h-8 text-xs">
                                                    <SelectValue />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    <SelectItem value={ContractClauseType.SALES_COMMISSION}>Commission</SelectItem>
                                                    <SelectItem value={ContractClauseType.EXPENSE_SHARING}>Expense Sharing</SelectItem>
                                                </SelectContent>
                                            </Select>
                                        </div>

                                        <div className="col-span-4 space-y-1">
                                            <Label className="text-xs">Description / Category</Label>
                                            <Input
                                                className="h-8 text-xs"
                                                value={clause.description || ''}
                                                onChange={(e) => updateClause(clause.id, 'description', e.target.value)}
                                                placeholder="e.g. Jewelry Sales"
                                            />
                                        </div>

                                        <div className="col-span-4 space-y-1">
                                            <div className="flex gap-2">
                                                <div>
                                                    <Label className="text-[10px] text-muted-foreground block text-center">Us</Label>
                                                    <div className="relative">
                                                        <NumericInput
                                                            className="h-8 w-16 text-xs pr-4 focus-visible:ring-1"
                                                            value={clause.companyShare * 100}
                                                            onChange={(val) => updateClause(clause.id, 'companyShare', Number(val) / 100)}
                                                            placeholder="50"
                                                        />
                                                        <span className="absolute right-1 top-2 text-[10px] text-muted-foreground">%</span>
                                                    </div>
                                                </div>
                                                <div className="flex items-center text-muted-foreground text-xs mt-4">vs</div>
                                                <div>
                                                    <Label className="text-[10px] text-muted-foreground block text-center">Them</Label>
                                                    <div className="relative">
                                                        <NumericInput
                                                            className="h-8 w-16 text-xs pr-4 focus-visible:ring-1 bg-muted"
                                                            value={clause.associateShare * 100}
                                                            onChange={(val) => { }}
                                                            placeholder="50"
                                                            disabled
                                                        />
                                                        <span className="absolute right-1 top-2 text-[10px] text-muted-foreground">%</span>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>

                                        <div className="col-span-1 flex justify-end">
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                className="h-8 w-8 text-red-400 hover:text-red-600 hover:bg-red-50"
                                                onClick={() => removeClause(clause.id)}
                                            >
                                                <Trash2 className="h-4 w-4" />
                                            </Button>
                                        </div>
                                    </div>
                                    {/* Item Category Filter Specificity */}
                                    <div className="mt-2 text-xs flex gap-2 items-center">
                                        <span className="text-muted-foreground text-[10px] uppercase tracking-wider">Specific Category Filter:</span>
                                        <Input
                                            className="h-6 w-[150px] text-[10px]"
                                            value={clause.itemCategory || ''}
                                            onChange={(e) => updateClause(clause.id, 'itemCategory', e.target.value)}
                                            placeholder="Optional (matches ItemType)"
                                        />
                                    </div>
                                </div>
                            ))}
                            {clauses.length === 0 && (
                                <div className="text-center py-8 text-muted-foreground text-sm border-2 border-dashed rounded-lg">
                                    No clauses defined. Add one to start.
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                <DialogFooter>
                    <Button variant="outline" onClick={onClose}>Cancel</Button>
                    <Button onClick={handleSave}>Sign Contract</Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
