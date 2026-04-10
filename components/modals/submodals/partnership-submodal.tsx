'use client';

import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { getInteractiveSubModalZIndex } from '@/lib/utils/z-index-utils';
import { Business, Character, Contract } from '@/types/entities';
import { SearchableSelect } from '@/components/ui/searchable-select';
import { Label } from '@/components/ui/label';
import { Plus, Users, Building2, Handshake, Trash2, Edit, Loader2 } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ClientAPI } from '@/lib/client-api';
import { EntityType, LinkType } from '@/types/enums';
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

const BUSINESS_ROLE_KEYS = new Set(['partner']);
const normalizeBusinessRole = (role: string): string =>
  role.trim().toLowerCase();

const extractBusinessRoles = (roles: string[]): string[] => {
  const unique = new Set<string>();
  for (const role of roles || []) {
    const normalized = normalizeBusinessRole(String(role));
    if (BUSINESS_ROLE_KEYS.has(normalized)) {
      unique.add(normalized);
    }
  }
  return Array.from(unique);
};

const buildBusinessRelationships = (characters: Character[]): ActiveRelationship[] =>
  characters
    .map((char) => ({
      id: char.id,
      entityId: char.id,
      entityType: 'character' as const,
      name: char.name,
      roles: extractBusinessRoles(char.roles || []),
      status: 'Active' as const
    }))
    .filter((entry) => entry.roles.length > 0);

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

    // --- RELATIONSHIPS STATE ---
    const [relationships, setRelationships] = useState<ActiveRelationship[]>([]);

    // --- CONTRACT MODAL STATE ---
    const [isContractOpen, setIsContractOpen] = useState(false);
    const [contractInitialData, setContractInitialData] = useState<Contract | undefined>(undefined);
    const [contractCounterparty, setContractCounterparty] = useState<{ id: string, name: string, type: 'character' | 'business' } | undefined>(undefined);
    const [isLoadingContract, setIsLoadingContract] = useState(false);


    // Load existing relationships from characters
    useEffect(() => {
        const activeRelationships = buildBusinessRelationships(characters);
        setRelationships(activeRelationships);
    }, [characters, open]);

    // Listen for updates to refresh the list
    useEffect(() => {
        const handleUpdate = () => {
            // Re-run the filter logic when data changes
            const activeRelationships = buildBusinessRelationships(characters);
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
    };

    const handleCreateCancel = () => {
        setViewMode('list');
    };

    const handleCreate = async () => {
        if (!targetEntityId) return;
        // --- CONTRACT WORKFLOW (Partner) ---
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
            if (relationship.entityType === 'character') {
                const character = await ClientAPI.getCharacterById(relationship.entityId);
                if (character) {
                    const currentRoles = character.roles || [];
                    const updatedRoles = currentRoles.filter(
                        role => !BUSINESS_ROLE_KEYS.has(normalizeBusinessRole(String(role)))
                    );

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
        switch (role?.toLowerCase()) {
            case 'partner': return <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">Partner</Badge>;
            default: return <Badge variant="outline" className="bg-slate-50 text-slate-700 border-slate-200">Other</Badge>;
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
                                            <TabsTrigger value="partner" className="data-[state=active]:border-b-2 data-[state=active]:border-blue-500 data-[state=active]:bg-transparent data-[state=active]:shadow-none rounded-none px-4 text-xs">Partners</TabsTrigger>
                                        </TabsList>
                                    </div>

                                    {/* --- DYNAMIC TABS CONTENT --- */}
                                    {['all', 'partner'].map(tabValue => (
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

                                    <div className="text-xs text-muted-foreground">New business relationships are Partner-only. This will open contract creation for the selected counterparty.</div>

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
                                <Button onClick={handleCreate} disabled={!targetEntityId} className="bg-indigo-600 hover:bg-indigo-700 min-w-[100px]">
                                    Create
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
