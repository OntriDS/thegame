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
import { ContractStatus, ContractClauseType, LinkType, EntityType, CharacterRole } from '@/types/enums';
import { v4 as uuid } from 'uuid';
import { ScrollArea } from '@/components/ui/scroll-area';
import { ClientAPI } from '@/lib/client-api';

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

    // Workflow: Enforce a specific role?
    initialRole?: string;
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
    initialRole
}: ContractSubmodalProps) {
    const [name, setName] = useState('');
    const [status, setStatus] = useState<ContractStatus>(ContractStatus.ACTIVE);
    const [notes, setNotes] = useState('');
    const [clauses, setClauses] = useState<ContractClause[]>([]);

    // Principal Selection State (Me)
    const [principalCharacterId, setPrincipalCharacterId] = useState<string>('');
    const [selectedPrincipalId, setSelectedPrincipalId] = useState<string>(''); // This is the Business ID

    // Counterparty State (Them)
    const [selectedEntityType, setSelectedEntityType] = useState<'character' | 'business'>('character');
    const [selectedCounterpartyId, setSelectedCounterpartyId] = useState<string>('');
    const [selectedRole, setSelectedRole] = useState<string>('associate');
    const [isSaving, setIsSaving] = useState(false);

    // Filtered Options
    const principalCharacters = availableCharacters.filter(c => c.roles.includes(CharacterRole.FOUNDER) || c.roles.includes(CharacterRole.PLAYER) || c.roles.includes(CharacterRole.ADMIN));
    const principalBusinesses = availableBusinesses.filter(b => b.linkedCharacterId === principalCharacterId);

    // Initial Load Effect
    useEffect(() => {
        if (open) {
            if (initialData) {
                setName(initialData.name);
                setStatus(initialData.status);
                setNotes(initialData.notes || '');
                setClauses(initialData.clauses || []);
                // If editing, IDs are fixed in data. We might need to reverse-lookup principal character for UI?
                // For now, allow editing standard fields, but maybe lock entities if editing.
            } else {
                // New Contract Defaults
                setStatus(ContractStatus.ACTIVE); // Default to Active
                setNotes('');
                setClauses([]);

                if (initialRole) {
                    setSelectedRole(initialRole);
                }

                // Set default counterparty if props provided
                if (counterpartyEntity) {
                    setSelectedCounterpartyId(counterpartyEntity.id);
                    setSelectedEntityType(counterpartyEntity.type as any);
                } else {
                    setSelectedCounterpartyId('');
                }

                // Try to smart-default the Principal Character (if only 1 Founder/Player)
                const defaultPrincipal = principalCharacters[0];
                if (defaultPrincipal) {
                    setPrincipalCharacterId(defaultPrincipal.id);
                    // If they have only 1 business, auto-select it?
                    const myBusinesses = availableBusinesses.filter(b => b.linkedCharacterId === defaultPrincipal.id);
                    if (myBusinesses.length === 1) {
                        setSelectedPrincipalId(myBusinesses[0].id);
                    }
                }
            }
        }
    }, [open, initialData, counterpartyEntity, initialRole]); // Minimal deps to avoid loops

    // Name Auto-Generator
    useEffect(() => {
        if (!initialData && open) {
            // Resolve Names
            let pName = 'Me';
            if (selectedPrincipalId) {
                const bus = availableBusinesses.find(b => b.id === selectedPrincipalId);
                if (bus) pName = bus.name;
            }

            let cName = 'Partner';
            if (counterpartyEntity) {
                cName = counterpartyEntity.name;
            } else if (selectedCounterpartyId) {
                if (selectedEntityType === 'character') {
                    const c = availableCharacters.find(x => x.id === selectedCounterpartyId);
                    if (c) cName = c.name;
                } else {
                    const b = availableBusinesses.find(x => x.id === selectedCounterpartyId);
                    if (b) cName = b.name;
                }
            }

            // Only update if user hasn't typed a custom name (starts with 'Me' or contains 'Agreement')
            // Simple check to avoid overwriting user changes too aggressively
            if (!name || name.includes('Agreement')) {
                setName(`${pName} ↔ ${cName} Agreement`);
            }
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [selectedPrincipalId, selectedCounterpartyId, selectedEntityType, open]);


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
        if (!name) return;

        // 1. Determine Principal (Me)
        const finalPrincipalId = initialData?.principalBusinessId || selectedPrincipalId || principalEntity?.id;
        if (!finalPrincipalId) {
            console.error("Principal Business is required");
            return; // TODO: Show error UI
        }

        // 2. Determine Counterparty (Them)
        const finalCounterpartyId = initialData?.counterpartyBusinessId || counterpartyEntity?.id || selectedCounterpartyId;
        if (!finalCounterpartyId) {
            console.error("Counterparty is required");
            return;
        }

        // 3. Validate Role if New
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
                principalBusinessId: finalPrincipalId,
                counterpartyBusinessId: finalCounterpartyId,
                status,
                validFrom: initialData?.validFrom || new Date(),
                clauses: clauses,
                notes: notes || undefined,
                createdAt: initialData?.createdAt || new Date(),
                updatedAt: new Date(),
                links: initialData?.links || [],
            };

            onSave(contract);

            // Link Creation Logic (New Contracts Only)
            if (!initialData) {
                let targetCharacterId = finalCounterpartyId;

                // If Business selected, resolve to Human
                if (selectedEntityType === 'business' || counterpartyEntity?.type === 'business') {
                    const selectedBus = availableBusinesses.find(b => b.id === finalCounterpartyId);
                    if (selectedBus && selectedBus.linkedCharacterId) {
                        targetCharacterId = selectedBus.linkedCharacterId;
                    } else {
                        console.warn("Selected Business has no linked Character.");
                    }
                }

                const link: Link = {
                    id: uuid(),
                    linkType: LinkType.CONTRACT_CHARACTER,
                    source: { type: EntityType.CONTRACT, id: contract.id },
                    target: { type: EntityType.CHARACTER, id: targetCharacterId },
                    createdAt: new Date(),
                    metadata: { role: selectedRole }
                };

                await ClientAPI.createLink(link);

                // Role Assignment
                if (targetCharacterId) {
                    try {
                        const character = await ClientAPI.getCharacterById(targetCharacterId);
                        if (character) {
                            const currentRoles = character.roles || [];
                            const newRole = selectedRole as any;
                            if (!currentRoles.includes(newRole)) {
                                const updatedRoles = [...currentRoles, newRole];
                                await ClientAPI.upsertCharacter({ ...character, roles: updatedRoles });
                            }
                        }
                    } catch (err) {
                        console.error("Failed to update character role", err);
                    }
                }
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
                                {s}
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
                                                    setSelectedPrincipalId(''); // Reset business when char changes
                                                }}
                                                placeholder="Who are you?"
                                                options={principalCharacters.map(c => ({ value: c.id, label: c.name, category: c.roles[0] }))}
                                            />
                                        </div>
                                        <div className="space-y-1">
                                            <Label className="text-[10px] text-muted-foreground">My Business Entity</Label>
                                            <SearchableSelect
                                                value={selectedPrincipalId}
                                                onValueChange={setSelectedPrincipalId}
                                                placeholder="Select Legal Entity..."
                                                options={principalBusinesses.map(b => ({ value: b.id, label: b.name, category: b.type }))}
                                                disabled={!principalCharacterId}
                                            />
                                        </div>
                                    </div>
                                    {!selectedPrincipalId && principalCharacterId && principalBusinesses.length === 0 && (
                                        <div className="text-[10px] text-amber-500 flex items-center gap-1">
                                            <AlertTriangle className="h-3 w-3" />
                                            This character has no linked businesses. Please create one first.
                                        </div>
                                    )}
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
                                    <div className="flex items-center justify-between">
                                        <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Counterparty (Them)</Label>
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

                            {/* 4. ROLE SELECTOR */}
                            {!initialData && (
                                <div className="space-y-2">
                                    <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Contract Type</Label>
                                    <div className="grid grid-cols-3 gap-2">
                                        {[{ id: 'associate', label: 'Associate' }, { id: 'partner', label: 'Partner' }, { id: 'sponsor', label: 'Sponsor' },].map(role => (
                                            <div
                                                key={role.id}
                                                onClick={() => setSelectedRole(role.id)}
                                                className={`cursor-pointer p-2 rounded border text-center transition-all text-sm font-medium ${selectedRole === role.id ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-900/20 text-indigo-900 dark:text-indigo-100 ring-1 ring-indigo-500' : 'border-muted hover:bg-muted/50'}`}
                                            >
                                                {role.label}
                                            </div>
                                        ))}
                                    </div>
                                </div>
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
                                            <Plus className="h-3 w-3 mr-1" /> Associate Sales
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
                                                                {clause.type === ContractClauseType.SALES_SERVICE && "Associate Sales Service"}
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
                                                                <NumericInput value={clause.associateShare * 100} onChange={(v) => updateClause(clause.id, 'associateShare', v / 100)} className="h-8 text-xs pr-6 text-right" />
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
