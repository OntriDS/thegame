'use client';

import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { getInteractiveSubModalZIndex } from '@/lib/utils/z-index-utils';
import { Business, Character, Contract } from '@/types/entities';
import { SearchableSelect } from '@/components/ui/searchable-select';
import { Label } from '@/components/ui/label';
import { Check, Plus, Users, Building2, Handshake, DollarSign, Crown, Trash2, Edit, Loader2 } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ClientAPI } from '@/lib/client-api';
import { EntityType, LinkType, FinancialStatus, CharacterRole } from '@/types/enums';
import { FinancialRecord, Link } from '@/types/entities';
import { DEFAULT_CURRENCY_EXCHANGE_RATES } from '@/lib/constants/financial-constants';
import { NumericInput } from '@/components/ui/numeric-input';
import { ContractSubmodal } from '@/components/modals/submodals/contract-submodal';


interface PartnershipManagerSubmodalProps {
    open: boolean;
    onClose: () => void;
    onSave: (data: any) => void;
    businesses: Business[];
    characters: Character[];
    rootEntity?: { type: 'character' | 'business', id: string, name: string }; // Who is managing these relationships?
}

// Mock Data Type for Active Relationships (to be replaced with Link data later)
interface ActiveRelationship {
    id: string;
    entityId: string;
    entityType: 'character' | 'business';
    name: string;
    roles: string[];
    status: 'Active' | 'Draft' | 'Ended';
}

export function PartnershipSubmodal({ // Keeping filename export for compatibility, but logic is Manager
    open,
    onClose,
    onSave,
    businesses = [],
    characters = [],
    rootEntity
}: PartnershipManagerSubmodalProps) {
    // Mode: 'list' (Manager) or 'create' (New Relationship)
    const [viewMode, setViewMode] = useState<'list' | 'create'>('list');

    // --- CREATE MODE STATE ---
    const [selectedEntityType, setSelectedEntityType] = useState<'character' | 'business'>('character');
    const [targetEntityId, setTargetEntityId] = useState('');
    const [selectedRole, setSelectedRole] = useState<string>('associate');
    const [usdAmount, setUsdAmount] = useState<number>(0);
    const [jAmount, setJAmount] = useState<number>(0);
    const [isCreating, setIsCreating] = useState(false);

    // --- RELATIONSHIPS STATE ---
    const [relationships, setRelationships] = useState<ActiveRelationship[]>([]);

    // --- CONTRACT MODAL STATE ---
    const [isContractOpen, setIsContractOpen] = useState(false);
    const [contractInitialData, setContractInitialData] = useState<Contract | undefined>(undefined);
    const [contractCounterparty, setContractCounterparty] = useState<{ id: string, name: string, type: 'character' | 'business' } | undefined>(undefined);
    const [isLoadingContract, setIsLoadingContract] = useState(false);


    // Load existing relationships from characters
    useEffect(() => {
        const businessRoles = ['investor', 'partner', 'sponsor', 'associate'];

        const activeRelationships: ActiveRelationship[] = characters
            .filter(char => char.roles && char.roles.some(role => businessRoles.includes(role)))
            .map(char => ({
                id: char.id,
                entityId: char.id,
                entityType: 'character' as const,
                name: char.name,
                roles: char.roles?.filter(role => businessRoles.includes(role)) || [],
                status: 'Active' as const
            }));

        setRelationships(activeRelationships);
    }, [characters, open]);

    // Listen for updates to refresh the list
    useEffect(() => {
        const handleUpdate = () => {
            // Re-run the filter logic when data changes
            const businessRoles = ['investor', 'partner', 'sponsor', 'associate'];
            const activeRelationships: ActiveRelationship[] = characters
                .filter(char => char.roles && char.roles.some(role => businessRoles.includes(role)))
                .map(char => ({
                    id: char.id,
                    entityId: char.id,
                    entityType: 'character' as const,
                    name: char.name,
                    roles: char.roles?.filter(role => businessRoles.includes(role)) || [],
                    status: 'Active' as const
                }));
            setRelationships(activeRelationships);
        };

        window.addEventListener('linksUpdated', handleUpdate);
        window.addEventListener('charactersUpdated', handleUpdate);

        return () => {
            window.removeEventListener('linksUpdated', handleUpdate);
            window.removeEventListener('charactersUpdated', handleUpdate);
        };
    }, [characters]);


    const handleCreateStart = () => {
        setViewMode('create');
        setTargetEntityId('');
        setSelectedRole('associate');
    };

    const handleCreateCancel = () => {
        setViewMode('list');
    };

    const handleAmountChange = (value: number, type: 'usd' | 'j') => {
        if (type === 'usd') {
            setUsdAmount(value);
            setJAmount(value / DEFAULT_CURRENCY_EXCHANGE_RATES.j$ToUSD);
        } else {
            setJAmount(value);
            setUsdAmount(value * DEFAULT_CURRENCY_EXCHANGE_RATES.j$ToUSD);
        }
    };

    const handleCreate = async () => {
        if (!targetEntityId) return;

        // --- 1. INVESTOR Workflow (Immediate) ---
        if (selectedRole === 'investor') {
            setIsCreating(true);
            try {
                const targetCharacter = characters.find(c => c.id === targetEntityId);
                const targetBusiness = businesses.find(b => b.id === targetEntityId);
                const targetName = selectedEntityType === 'character' ? targetCharacter?.name : targetBusiness?.name;

                if (!targetCharacter) return; // Investors must be characters for now? Or businesses too? Assuming Char based on original code.

                // A. Create Financial Record
                const financialRecord = {
                    id: crypto.randomUUID(),
                    name: `Investment from ${targetName}`,
                    description: `Initial investment injection from ${targetName}`,
                    type: 'company' as const,
                    station: 'Investment' as any,
                    status: FinancialStatus.DONE,
                    revenue: usdAmount,
                    cost: 0,
                    jungleCoins: jAmount,
                    netCashflow: usdAmount,
                    jungleCoinsValue: jAmount * DEFAULT_CURRENCY_EXCHANGE_RATES.j$ToUSD,
                    year: new Date().getFullYear(),
                    month: new Date().getMonth() + 1,
                    createdAt: new Date(),
                    updatedAt: new Date(),
                    links: [] as Link[],
                    isCollected: false
                } as unknown as FinancialRecord;

                const savedRecord = await ClientAPI.upsertFinancialRecord(financialRecord);

                // B. Create Link (FINREC_CHARACTER)
                const link: Link = {
                    id: crypto.randomUUID(),
                    linkType: LinkType.FINREC_CHARACTER,
                    source: { type: EntityType.FINANCIAL, id: savedRecord.id },
                    target: { type: EntityType.CHARACTER, id: targetCharacter.id },
                    createdAt: new Date()
                };
                await ClientAPI.createLink(link);

                // C. Assign 'INVESTOR' Role immediately
                const updatedRoles = [...(targetCharacter.roles || [])];
                if (!updatedRoles.includes(CharacterRole.INVESTOR)) {
                    updatedRoles.push(CharacterRole.INVESTOR);
                }

                await ClientAPI.upsertCharacter({
                    ...targetCharacter,
                    roles: updatedRoles,
                    wallet: {
                        ...(targetCharacter.wallet || { jungleCoins: 0 }),
                        jungleCoins: (targetCharacter.wallet?.jungleCoins || 0) + jAmount
                    }
                });

                // Refresh
                if (window) {
                    window.dispatchEvent(new Event('linksUpdated'));
                    window.dispatchEvent(new Event('charactersUpdated'));
                }
                setViewMode('list');

            } catch (error) {
                console.error('Failed to create investor:', error);
            } finally {
                setIsCreating(false);
            }
            return;
        }

        // --- 2. CONTRACT Workflow (Partner, Associate, Sponsor) ---
        // Redirect to Contract Modal. Do NOT create anything yet.
        const targetCharacter = characters.find(c => c.id === targetEntityId);
        const targetBusiness = businesses.find(b => b.id === targetEntityId);

        if (!targetCharacter && !targetBusiness) return;

        setContractCounterparty({
            id: targetEntityId,
            name: (selectedEntityType === 'character' ? targetCharacter?.name : targetBusiness?.name) || 'Unknown',
            type: selectedEntityType
        });

        // Reset contract data for new contract
        setContractInitialData(undefined);

        // Open the modal
        setIsContractOpen(true);
        // We stay in 'create' mode in this modal, but the contract modal is now overlaying.
        // Once contract saves, it will close, and we can perhaps reset ViewMode to list.
    };

    // --- CONTRACT EDIT LOGIC ---
    const handleEditContract = async (relationship: ActiveRelationship) => {
        setIsLoadingContract(true);
        setContractCounterparty({
            id: relationship.entityId,
            name: relationship.name,
            type: relationship.entityType
        });

        try {
            // 1. Find existing Contract Links
            // We search for links WHERE entityId = CharacterId AND type = Character (as target)
            // But ClientAPI.getLinksFor(type, id) usually finds connected links.
            const links = await ClientAPI.getLinksFor({ type: relationship.entityType, id: relationship.entityId });

            // Find CONTRACT_CHARACTER link
            // Link structure: Source=Contract, Target=Character
            const contractLink = links.find(l =>
                l.linkType === LinkType.CONTRACT_CHARACTER &&
                l.target.id === relationship.entityId
            );

            if (contractLink) {
                // Fetch the actual contract
                const contract = await ClientAPI.getContractById(contractLink.source.id);
                setContractInitialData(contract || undefined);
            } else {
                setContractInitialData(undefined); // Start Fresh
            }

            setIsContractOpen(true);
        } catch (error) {
            console.error("Failed to load contract:", error);
        } finally {
            setIsLoadingContract(false);
        }
    };

    // --- END RELATIONSHIP LOGIC ---
    const handleEndRelationship = async (relationship: ActiveRelationship) => {
        if (!confirm(`Are you sure you want to end the relationship with ${relationship.name}? This will remove related roles and links.`)) {
            return;
        }

        try {
            // 1. Find related Links
            const links = await ClientAPI.getLinksFor({ type: relationship.entityType, id: relationship.entityId });

            // 2. Identify Links to Delete
            // We want to delete CONTRACT links and FINREC links (if Investor?)
            // For now, focus on CONTRACT_CHARACTER links which define active business roles
            const linksToDelete = links.filter(l =>
                l.linkType === LinkType.CONTRACT_CHARACTER &&
                l.target.id === relationship.entityId
            );

            // 3. Delete Links
            for (const link of linksToDelete) {
                await ClientAPI.removeLink(link.id);
            }

            // 4. Update Character Roles
            // Remove business roles
            const businessRoles = ['investor', 'partner', 'sponsor', 'associate'];

            if (relationship.entityType === 'character') {
                const character = await ClientAPI.getCharacterById(relationship.entityId);
                if (character) {
                    const currentRoles = character.roles || [];
                    const updatedRoles = currentRoles.filter(r => !businessRoles.includes(r.toLowerCase()));

                    if (updatedRoles.length !== currentRoles.length) {
                        await ClientAPI.upsertCharacter({
                            ...character,
                            roles: updatedRoles
                        });
                    }
                }
            }

            // Refresh
            window.dispatchEvent(new Event('linksUpdated'));
            window.dispatchEvent(new Event('charactersUpdated'));

        } catch (error) {
            console.error("Failed to end relationship:", error);
        }
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

    // --- RENDER HELPERS ---

    // Role Badge Colors
    const getRoleBadge = (role: string) => {
        switch (role) {
            case 'partner': return <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">Partner</Badge>;
            case 'investor': return <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200">Investor</Badge>;
            case 'sponsor': return <Badge variant="outline" className="bg-purple-50 text-purple-700 border-purple-200">Sponsor</Badge>;
            default: return <Badge variant="outline" className="bg-slate-50 text-slate-700 border-slate-200">Associate</Badge>;
        }
    };

    return (
        <>
            <Dialog open={open} onOpenChange={(val) => !val && onClose()}>
                <DialogContent
                    className="sm:max-w-[700px] h-[500px] flex flex-col p-0 gap-0 overflow-hidden [&>button]:hidden"
                    zIndexLayer="SUB_MODALS"
                >
                    {/* HEADER */}
                    <div className="px-6 py-4 border-b flex justify-between items-center bg-muted/10">
                        <div>
                            <DialogTitle className="text-lg flex items-center gap-2">
                                <Handshake className="h-5 w-5 text-indigo-500" />
                                Business Relationships Manager
                            </DialogTitle>
                        </div>
                        {viewMode === 'list' && (
                            <Button size="sm" onClick={handleCreateStart} className="ml-auto bg-indigo-600 hover:bg-indigo-700 text-white">
                                <Plus className="h-4 w-4 mr-1" /> New Business Relationship
                            </Button>
                        )}
                    </div>

                    {/* BODY CONTENT */}
                    <div className="flex-1 overflow-hidden bg-background">
                        {/* Loading Overlay for Contract Fetch */}
                        {isLoadingContract && (
                            <div className="absolute inset-0 bg-white/50 z-50 flex items-center justify-center">
                                <Loader2 className="h-8 w-8 animate-spin text-indigo-600" />
                            </div>
                        )}

                        {viewMode === 'list' ? (
                            <div className="h-full flex flex-col">
                                <Tabs defaultValue="all" className="w-full flex-1 flex flex-col">
                                    <div className="px-6 pt-3 border-b">
                                        <TabsList className="w-full justify-start h-9 p-0 bg-transparent gap-2">
                                            <TabsTrigger value="all" className="data-[state=active]:border-b-2 data-[state=active]:border-indigo-500 data-[state=active]:bg-transparent data-[state=active]:shadow-none rounded-none px-4 text-xs">All</TabsTrigger>
                                            <TabsTrigger value="associate" className="data-[state=active]:border-b-2 data-[state=active]:border-slate-500 data-[state=active]:bg-transparent data-[state=active]:shadow-none rounded-none px-4 text-xs">Associates</TabsTrigger>
                                            <TabsTrigger value="partner" className="data-[state=active]:border-b-2 data-[state=active]:border-blue-500 data-[state=active]:bg-transparent data-[state=active]:shadow-none rounded-none px-4 text-xs">Partners</TabsTrigger>
                                            <TabsTrigger value="investor" className="data-[state=active]:border-b-2 data-[state=active]:border-amber-500 data-[state=active]:bg-transparent data-[state=active]:shadow-none rounded-none px-4 text-xs">Investors</TabsTrigger>
                                            <TabsTrigger value="sponsor" className="data-[state=active]:border-b-2 data-[state=active]:border-purple-500 data-[state=active]:bg-transparent data-[state=active]:shadow-none rounded-none px-4 text-xs">Sponsors</TabsTrigger>
                                        </TabsList>
                                    </div>

                                    {/* --- DYNAMIC TABS CONTENT --- */}
                                    {['all', 'associate', 'partner', 'investor', 'sponsor'].map(tabValue => (
                                        <TabsContent key={tabValue} value={tabValue} className="flex-1 m-0 p-0">
                                            <ScrollArea className="flex-1 p-6 h-[350px]">
                                                {(() => {
                                                    const filtered = tabValue === 'all'
                                                        ? relationships
                                                        : relationships.filter(r => r.roles.includes(tabValue));

                                                    if (filtered.length === 0) {
                                                        return (
                                                            <div className="flex flex-col items-center justify-center h-48 text-muted-foreground border-2 border-dashed rounded-lg bg-muted/10 mx-auto max-w-sm mt-8">
                                                                <Handshake className="h-10 w-10 mb-3 opacity-20" />
                                                                <p className="font-medium text-sm">No {tabValue === 'all' ? 'active' : tabValue} relationships</p>
                                                            </div>
                                                        );
                                                    }

                                                    return (
                                                        <div className="space-y-3">
                                                            {filtered.map(rel => (
                                                                <Card key={rel.id} className="group hover:border-indigo-200 transition-colors">
                                                                    <CardContent className="p-4 flex items-center justify-between">
                                                                        <div className="flex items-center gap-3">
                                                                            <div className={`h-10 w-10 rounded-full flex items-center justify-center ${rel.entityType === 'business' ? 'bg-indigo-100 text-indigo-600' : 'bg-green-100 text-green-600'}`}>
                                                                                {rel.entityType === 'business' ? <Building2 className="h-5 w-5" /> : <Users className="h-5 w-5" />}
                                                                            </div>
                                                                            <div>
                                                                                <h4 className="font-medium text-sm">{rel.name}</h4>
                                                                                <div className="flex gap-2 items-center mt-1">
                                                                                    {rel.roles.map(r => <span key={r}>{getRoleBadge(r)}</span>)}
                                                                                    <span className="text-[10px] text-muted-foreground uppercase tracking-wider pl-1">{rel.entityType}</span>
                                                                                </div>
                                                                            </div>
                                                                        </div>
                                                                        <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                                                            <Button
                                                                                variant="ghost"
                                                                                size="sm"
                                                                                className="h-8 w-8 p-0"
                                                                                title="Edit Contract"
                                                                                onClick={() => handleEditContract(rel)}
                                                                            >
                                                                                <Edit className="h-4 w-4 text-muted-foreground hover:text-indigo-600" />
                                                                            </Button>
                                                                            <Button
                                                                                variant="ghost"
                                                                                size="sm"
                                                                                className="h-8 w-8 p-0 hover:text-red-600"
                                                                                title="End Relationship"
                                                                                onClick={() => handleEndRelationship(rel)}
                                                                            >
                                                                                <Trash2 className="h-4 w-4" />
                                                                            </Button>
                                                                        </div>
                                                                    </CardContent>
                                                                </Card>
                                                            ))}
                                                        </div>
                                                    );
                                                })()}
                                            </ScrollArea>
                                        </TabsContent>
                                    ))}
                                </Tabs>
                            </div>
                        ) : (
                            // CREATE VIEW
                            <div className="p-6 h-full flex flex-col">
                                <div className="mb-6 flex items-center justify-between">
                                    <h3 className="text-sm font-semibold">New Business Relationship</h3>
                                </div>

                                <div className="space-y-6 flex-1">
                                    {/* 1. Entity Type Toggle & Selector */}
                                    <div className="space-y-3">
                                        <div className="flex items-center justify-between">
                                            <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Counterparty</Label>
                                            <div className="flex bg-muted p-1 rounded-md">
                                                <button
                                                    onClick={() => { setSelectedEntityType('character'); setTargetEntityId(''); }}
                                                    className={`px-3 py-1 text-xs font-medium rounded-sm transition-all ${selectedEntityType === 'character' ? 'bg-background shadow-sm text-foreground' : 'text-muted-foreground hover:text-foreground'}`}
                                                >
                                                    Character
                                                </button>
                                                <button
                                                    onClick={() => { setSelectedEntityType('business'); setTargetEntityId(''); }}
                                                    className={`px-3 py-1 text-xs font-medium rounded-sm transition-all ${selectedEntityType === 'business' ? 'bg-background shadow-sm text-foreground' : 'text-muted-foreground hover:text-foreground'}`}
                                                >
                                                    Business
                                                </button>
                                            </div>
                                        </div>

                                        <SearchableSelect
                                            value={targetEntityId}
                                            onValueChange={setTargetEntityId}
                                            placeholder={`Search ${selectedEntityType}s...`}
                                            options={selectedEntityType === 'character' ? characterOptions : businessOptions}
                                            autoGroupByCategory={true}
                                            className="w-full"
                                        />
                                    </div>

                                    {/* 2. Role Selector */}
                                    <div className="space-y-2">
                                        <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Primary Role</Label>
                                        <div className="grid grid-cols-2 gap-2">
                                            {[
                                                { id: 'associate', label: 'Associate', icon: Handshake, desc: 'Contractor / Employee' },
                                                { id: 'partner', label: 'Partner', icon: Users, desc: 'Shared Ownership' },
                                                { id: 'investor', label: 'Investor', icon: DollarSign, desc: 'Equity for Capital' },
                                                { id: 'sponsor', label: 'Sponsor', icon: Crown, desc: 'Brand / Funding' },
                                            ].map(role => (
                                                <div
                                                    key={role.id}
                                                    onClick={() => setSelectedRole(role.id)}
                                                    className={`
                                                        cursor-pointer p-2 rounded border flex flex-col items-center text-center gap-1 transition-all
                                                        ${selectedRole === role.id
                                                            ? 'border-indigo-500 bg-indigo-50 text-indigo-900 ring-1 ring-indigo-500'
                                                            : 'border-muted hover:bg-muted/50'}
                                                    `}
                                                >
                                                    <role.icon className="h-4 w-4 opacity-70" />
                                                    <div className="text-xs font-medium">{role.label}</div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>

                                    {/* 3. Investor Specifics (Conditional) */}
                                    {selectedRole === 'investor' && (
                                        <div className="space-y-4 animate-in fade-in slide-in-from-top-2 p-4 border rounded-md bg-muted/20">
                                            <div className="grid grid-cols-2 gap-4">
                                                <div className="space-y-2">
                                                    <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Investment (USD)</Label>
                                                    <div className="relative">
                                                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                                            <span className="text-muted-foreground text-sm">$</span>
                                                        </div>
                                                        <NumericInput
                                                            value={usdAmount}
                                                            onChange={(val) => handleAmountChange(val || 0, 'usd')}
                                                            className="pl-7"
                                                            placeholder="0.00"
                                                        />
                                                    </div>
                                                </div>
                                                <div className="space-y-2">
                                                    <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Tokens (J$)</Label>
                                                    <div className="relative">
                                                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                                            <span className="text-muted-foreground text-sm">J$</span>
                                                        </div>
                                                        <NumericInput
                                                            value={jAmount}
                                                            onChange={(val) => handleAmountChange(val || 0, 'j')}
                                                            className="pl-8"
                                                            placeholder="0.00"
                                                        />
                                                    </div>
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-2 text-[10px] text-muted-foreground bg-blue-50 dark:bg-blue-900/20 p-2 rounded text-center justify-center">
                                                <span>Exchange Rate: 1 J$ = ${DEFAULT_CURRENCY_EXCHANGE_RATES.j$ToUSD} USD</span>
                                            </div>
                                            <p className="text-[10px] text-muted-foreground text-center">
                                                Creating this will record a financial transaction and issue J$ to the investor.
                                            </p>
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}
                    </div>

                    {/* FOOTER */}
                    <DialogFooter className="px-6 py-4 border-t bg-muted/10">
                        {viewMode === 'list' ? (
                            <Button variant="outline" onClick={onClose} className="w-full sm:w-auto">Close Manager</Button>
                        ) : (
                            <div className="flex w-full justify-between gap-2">
                                <Button variant="ghost" onClick={handleCreateCancel}>Cancel</Button>
                                <Button onClick={handleCreate} disabled={!targetEntityId || isCreating} className="bg-indigo-600 hover:bg-indigo-700 min-w-[100px]">
                                    {isCreating ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Create'}
                                </Button>
                            </div>
                        )}
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* CONTRACT SUBMODAL */}
            <ContractSubmodal
                open={isContractOpen}
                onClose={() => setIsContractOpen(false)}

                initialData={contractInitialData}
                counterpartyEntity={contractCounterparty}
                availableCharacters={characters}
                availableBusinesses={businesses}
                principalEntity={rootEntity}
                initialRole={selectedRole} // Pass the role we want to create
                onSave={async (contract) => {
                    await ClientAPI.upsertContract(contract);
                    window.dispatchEvent(new Event('linksUpdated'));
                    window.dispatchEvent(new Event('charactersUpdated'));

                    if (viewMode === 'create') {
                        setViewMode('list');
                    }
                }}
            />
        </>
    );
}
