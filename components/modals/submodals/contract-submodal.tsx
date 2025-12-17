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
    availableBusinesses?: Business[];

    // Workflow: Enforce a specific role?
    initialRole?: string;
}

export function ContractSubmodal({
    open,
    onClose,
    onSave,
    initialData,
    principalEntity,
    counterpartyEntity,
    availableCharacters = [],
    availableBusinesses = [],
    initialRole
}: ContractSubmodalProps) {
    const [name, setName] = useState('');
    const [status, setStatus] = useState<ContractStatus>(ContractStatus.DRAFT);
    const [notes, setNotes] = useState('');
    const [clauses, setClauses] = useState<ContractClause[]>([]);

    // Counterparty State (if selecting manually)
    const [selectedEntityType, setSelectedEntityType] = useState<'character' | 'business'>('character');
    const [selectedCounterpartyId, setSelectedCounterpartyId] = useState<string>('');
    const [selectedRole, setSelectedRole] = useState<string>('associate');
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

                if (initialRole) {
                    setSelectedRole(initialRole);
                }

                // Set default counterparty if props provided
                if (counterpartyEntity) {
                    setSelectedCounterpartyId(counterpartyEntity.id);
                    // Also maintain entity type based on prop if provided, or derive it?
                    setSelectedEntityType(counterpartyEntity.type);
                } else {
                    setSelectedCounterpartyId('');
                }
            }
        }
    }, [open, initialData, counterpartyEntity, initialRole]);

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
        // eslint-disable-next-line react-hooks/exhaustive-deps
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

        // Validation: Need a role if creating new (and not editing existing data that might already imply one)
        if (!initialData && !selectedRole) {
            console.error("Role is required");
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

            onSave(contract);

            // 2. Create the Link (The "Bridge")
            // specific requirement: "Execute ClientAPI.createLink to bind Contract <-> Character"
            // We do this ONLY if it's a new contract or link doesn't exist.

            // Check if link exists? For now, we assume simple creation if it's new.
            // If editing, usually link exists.

            if (!initialData) { // New Contract Flow
                const link: Link = {
                    id: uuid(),
                    linkType: LinkType.CONTRACT_CHARACTER,
                    source: { type: EntityType.CONTRACT, id: contract.id },
                    target: { type: EntityType.CHARACTER, id: finalCounterpartyId },
                    createdAt: new Date(),
                    metadata: { role: selectedRole } // Helpful metadata
                };

                await ClientAPI.createLink(link);

                // 3. Assign Role to Character (The "Badge")
                // Only if target is a character
                // We need to fetch the character first to append role safely
                if (selectedEntityType === 'character' || counterpartyEntity?.type === 'character') {
                    try {
                        const character = await ClientAPI.getCharacterById(finalCounterpartyId);
                        if (character) {
                            const currentRoles = character.roles || [];
                            // Add role if missing
                            // Use selectedRole which is state (e.g. 'associate', 'partner')
                            // Cast to known role type?
                            const newRole = selectedRole as any;

                            if (!currentRoles.includes(newRole)) {
                                const updatedRoles = [...currentRoles, newRole];
                                await ClientAPI.upsertCharacter({
                                    ...character,
                                    roles: updatedRoles
                                });
                                console.log(`Assigned role ${newRole} to ${character.name}`);
                            }
                        }
                    } catch (err) {
                        console.error("Failed to update character role", err);
                    }
                }
            }

            console.log("Contract saved and linked");
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
                className="sm:max-w-[700px] h-[600px] flex flex-col p-0 gap-0 overflow-hidden"
                style={{ zIndex: getInteractiveSubModalZIndex() }}
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
                        <div className="space-y-6 max-w-3xl mx-auto">

                            {/* 1. CONTRACT TITLE */}
                            <div className="space-y-2">
                                <Label className="text-xs font-semibold uppercase text-muted-foreground">Contract Title</Label>
                                <Input
                                    value={name}
                                    onChange={(e) => setName(e.target.value)}
                                    className="font-medium text-base h-10"
                                    placeholder="e.g. Me ↔ Partner Agreement"
                                />
                            </div>

                            {/* 2. COUNTERPARTY SELECTOR (if not pre-filled) */}
                            {!counterpartyEntity && !initialData && (
                                <div className="space-y-3">
                                    <div className="flex items-center justify-between">
                                        <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Counterparty</Label>
                                        <div className="flex bg-muted p-1 rounded-md">
                                            <button
                                                onClick={() => { setSelectedEntityType('character'); setSelectedCounterpartyId(''); }}
                                                className={`px-3 py-1 text-xs font-medium rounded-sm transition-all ${selectedEntityType === 'character' ? 'bg-background shadow-sm text-foreground' : 'text-muted-foreground hover:text-foreground'}`}
                                            >
                                                Character
                                            </button>
                                            <button
                                                onClick={() => { setSelectedEntityType('business'); setSelectedCounterpartyId(''); }}
                                                className={`px-3 py-1 text-xs font-medium rounded-sm transition-all ${selectedEntityType === 'business' ? 'bg-background shadow-sm text-foreground' : 'text-muted-foreground hover:text-foreground'}`}
                                            >
                                                Business
                                            </button>
                                        </div>
                                    </div>

                                    <SearchableSelect
                                        value={selectedCounterpartyId}
                                        onValueChange={setSelectedCounterpartyId}
                                        placeholder={`Search ${selectedEntityType}s...`}
                                        options={selectedEntityType === 'character'
                                            ? availableCharacters.map(c => ({
                                                value: c.id,
                                                label: c.name,
                                                category: c.roles?.[0] || 'Other'
                                            }))
                                            : availableBusinesses.map(b => ({
                                                value: b.id,
                                                label: b.name,
                                                category: b.type || 'Business'
                                            }))
                                        }
                                        autoGroupByCategory={true}
                                        className="w-full"
                                    />
                                </div>
                            )}

                            {/* 3. ROLE SELECTOR (if creating new) */}
                            {!initialData && (
                                <div className="space-y-2">
                                    <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Contract Type</Label>
                                    <div className="grid grid-cols-3 gap-2">
                                        {[
                                            { id: 'associate', label: 'Associate' },
                                            { id: 'partner', label: 'Partner' },
                                            { id: 'sponsor', label: 'Sponsor' },
                                        ].map(role => (
                                            <div
                                                key={role.id}
                                                onClick={() => setSelectedRole(role.id)}
                                                className={`
                                                cursor-pointer p-2 rounded border text-center transition-all text-sm font-medium
                                                ${selectedRole === role.id
                                                        ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-900/20 text-indigo-900 dark:text-indigo-100 ring-1 ring-indigo-500'
                                                        : 'border-muted hover:bg-muted/50'}
                                            `}
                                            >
                                                {role.label}
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* 4. CLAUSES DEFINITION */}
                            <div className="space-y-3">
                                <div className="flex items-center justify-between">
                                    <Label className="text-xs font-semibold uppercase text-muted-foreground">Financial Clauses</Label>
                                    {/* Action Buttons */}
                                    <div className="flex gap-2">
                                        <Button size="sm" variant="outline" onClick={() => addClause(ContractClauseType.SALES_COMMISSION)} className="h-7 text-xs">
                                            <Plus className="h-3 w-3 mr-1" /> Principal Sales (75/25)
                                        </Button>
                                        <Button size="sm" variant="outline" onClick={() => addClause(ContractClauseType.SALES_SERVICE)} className="h-7 text-xs">
                                            <Plus className="h-3 w-3 mr-1" /> Associate Sales (25/75)
                                        </Button>
                                        <Button size="sm" variant="outline" onClick={() => addClause(ContractClauseType.EXPENSE_SHARING)} className="h-7 text-xs">
                                            <Plus className="h-3 w-3 mr-1" /> Exp. Share (50/50)
                                        </Button>
                                    </div>
                                </div>

                                {clauses.length === 0 ? (
                                    <div className="py-8 border-2 border-dashed rounded-lg flex flex-col items-center justify-center text-muted-foreground">
                                        <FileText className="h-8 w-8 opacity-20 mb-2" />
                                        <p className="text-sm font-medium">No clauses defined</p>
                                        <p className="text-xs text-muted-foreground max-w-xs text-center mt-1">
                                            Add clauses above to define how revenue and expenses are split between the parties.
                                        </p>
                                    </div>
                                ) : (
                                    <div className="grid gap-3">
                                        {clauses.map((clause, index) => (
                                            <div key={clause.id} className="p-3 border rounded-lg bg-card hover:border-indigo-300 transition-all group">

                                                {/* Clause Header */}
                                                <div className="flex justify-between items-start mb-3">
                                                    <div className="flex items-center gap-2">
                                                        <div className="h-5 w-5 rounded-full bg-muted flex items-center justify-center text-xs font-bold text-muted-foreground">
                                                            {index + 1}
                                                        </div>
                                                        <div>
                                                            <div className="text-xs font-bold uppercase tracking-wider text-foreground">
                                                                {clause.type === ContractClauseType.SALES_COMMISSION && "Principal Commission"}
                                                                {clause.type === ContractClauseType.SALES_SERVICE && "Associate Sales Service"}
                                                                {clause.type === ContractClauseType.EXPENSE_SHARING && "Expense Sharing"}
                                                                {clause.type === ContractClauseType.OTHER && "Other Term"}
                                                            </div>
                                                            <div className="text-[10px] text-muted-foreground">
                                                                {clause.type === ContractClauseType.SALES_COMMISSION && "Revenue from MY Items"}
                                                                {clause.type === ContractClauseType.SALES_SERVICE && "Revenue from THEIR Items"}
                                                                {clause.type === ContractClauseType.EXPENSE_SHARING && "Shared Costs"}
                                                            </div>
                                                        </div>
                                                    </div>
                                                    <Button variant="ghost" size="icon" className="h-6 w-6 text-muted-foreground hover:text-red-500" onClick={() => removeClause(clause.id)}>
                                                        <Trash2 className="h-3.5 w-3.5" />
                                                    </Button>
                                                </div>

                                                {/* Clause Body */}
                                                <div className="grid grid-cols-2 gap-3">
                                                    <div className="space-y-1">
                                                        <Label className="text-[10px] font-semibold text-muted-foreground uppercase">Description</Label>
                                                        <Input
                                                            value={clause.description}
                                                            onChange={(e) => updateClause(clause.id, 'description', e.target.value)}
                                                            className="h-8 text-xs"
                                                            placeholder="e.g. Jewelry Category"
                                                        />
                                                    </div>

                                                    {/* Shares */}
                                                    <div className="space-y-1">
                                                        <Label className="text-[10px] font-semibold text-muted-foreground uppercase text-center w-full block">Split</Label>
                                                        <div className="flex items-center gap-2">
                                                            <div className="flex-1 relative">
                                                                <NumericInput
                                                                    value={clause.companyShare * 100}
                                                                    onChange={(v) => updateClause(clause.id, 'companyShare', v / 100)}
                                                                    className="h-8 text-xs pr-6 text-right"
                                                                />
                                                                <span className="absolute right-2 top-2 text-[10px] text-muted-foreground font-bold">%</span>
                                                            </div>
                                                            <span className="text-muted-foreground">/</span>
                                                            <div className="flex-1 relative">
                                                                <NumericInput
                                                                    value={clause.associateShare * 100}
                                                                    onChange={(v) => updateClause(clause.id, 'associateShare', v / 100)}
                                                                    className="h-8 text-xs pr-6 text-right"
                                                                />
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
                    <div className="text-xs text-muted-foreground flex items-center gap-2">
                        <LinkIcon className="h-3 w-3" />
                        {counterpartyEntity || selectedCounterpartyId ? 'Link will be created automatically' : 'Select a counterparty to link'}
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
