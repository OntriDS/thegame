'use client';

import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { getInteractiveSubModalZIndex } from '@/lib/utils/z-index-utils';
import { Business, Character } from '@/types/entities';
import { SearchableSelect } from '@/components/ui/searchable-select';
import { Label } from '@/components/ui/label';
import { Check, Plus, Users, Building2, Handshake, DollarSign, Crown, Trash2, Edit } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ClientAPI } from '@/lib/client-api';
import { EntityType, LinkType, FinancialStatus, CharacterRole } from '@/types/enums';
import { FinancialRecord, Link } from '@/types/entities';
import { DEFAULT_CURRENCY_EXCHANGE_RATES } from '@/lib/constants/financial-constants';
import { NumericInput } from '@/components/ui/numeric-input';
import { Loader2 } from 'lucide-react';


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
        setIsCreating(true);

        try {
            const targetCharacter = characters.find(c => c.id === targetEntityId);
            const targetBusiness = businesses.find(b => b.id === targetEntityId);
            const targetName = selectedEntityType === 'character' ? targetCharacter?.name : targetBusiness?.name;

            if (!targetName) throw new Error('Target entity not found');

            // 1. Update Character Roles (if it's a character)
            if (selectedEntityType === 'character' && targetCharacter) {
                const updatedRoles = [...(targetCharacter.roles || [])];
                if (!updatedRoles.includes(selectedRole as CharacterRole)) {
                    updatedRoles.push(selectedRole as CharacterRole);
                }

                // If Investor, handle Financials
                if (selectedRole === 'investor') {
                    // 2. Create Financial Record
                    const financialRecord = {
                        id: crypto.randomUUID(),
                        name: `Investment from ${targetName}`,
                        description: `Initial investment injection from ${targetName}`,
                        type: 'company' as const, // Company receives the investment
                        station: 'Investment' as any, // Cast to any if strictly typed to enum
                        // category removed to satisfy interface if missing
                        status: FinancialStatus.DONE,
                        revenue: usdAmount, // +$ Revenue
                        cost: 0,
                        jungleCoins: jAmount, // Track J$ issued
                        netCashflow: usdAmount,
                        jungleCoinsValue: jAmount * DEFAULT_CURRENCY_EXCHANGE_RATES.j$ToUSD,
                        year: new Date().getFullYear(),
                        month: new Date().getMonth() + 1,
                        createdAt: new Date(),
                        updatedAt: new Date(),
                        links: [] as Link[],
                        isCollected: false
                    } as unknown as FinancialRecord; // Force cast to avoid strict type checks on missing optional/dynamic fields during rapid prototyping

                    const savedRecord = await ClientAPI.upsertFinancialRecord(financialRecord);

                    // 3. Create Link (FINREC_CHARACTER)
                    const link: Link = {
                        id: crypto.randomUUID(),
                        linkType: LinkType.FINREC_CHARACTER,
                        source: { type: EntityType.FINANCIAL, id: savedRecord.id },
                        target: { type: EntityType.CHARACTER, id: targetCharacter.id },
                        createdAt: new Date()
                    };
                    await ClientAPI.createLink(link);
                }

                // Save Character Updates
                await ClientAPI.upsertCharacter({
                    ...targetCharacter,
                    roles: updatedRoles,
                    jungleCoins: (targetCharacter.jungleCoins || 0) + jAmount
                });
            }

            // Trigger refresh events to update the UI
            if (window) {
                window.dispatchEvent(new Event('linksUpdated'));
                window.dispatchEvent(new Event('charactersUpdated'));
            }

            setViewMode('list');

        } catch (error) {
            console.error('Failed to create relationship:', error);
            // Show error toast ideally
        } finally {
            setIsCreating(false);
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
        <Dialog open={open} onOpenChange={(val) => !val && onClose()}>
            <DialogContent
                className="sm:max-w-[700px] h-[500px] flex flex-col p-0 gap-0 overflow-hidden [&>button]:hidden"
                style={{ zIndex: getInteractiveSubModalZIndex() }}
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

                                <TabsContent value="all" className="flex-1 m-0 p-0">
                                    <ScrollArea className="flex-1 p-6 h-[350px]">
                                        {relationships.length === 0 ? (
                                            <div className="flex flex-col items-center justify-center h-48 text-muted-foreground border-2 border-dashed rounded-lg bg-muted/10 mx-auto max-w-sm mt-8">
                                                <Handshake className="h-10 w-10 mb-3 opacity-20" />
                                                <p className="font-medium text-sm">No active relationships</p>
                                                <p className="text-xs">Click &quot;New Relationship&quot; to start.</p>
                                            </div>
                                        ) : (
                                            <div className="space-y-3">
                                                {relationships.map(rel => (
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
                                                                <Button variant="ghost" size="sm" className="h-8 w-8 p-0" title="Edit Contract">
                                                                    <Edit className="h-4 w-4 text-muted-foreground" />
                                                                </Button>
                                                                <Button variant="ghost" size="sm" className="h-8 w-8 p-0 hover:text-red-600" title="End Relationship">
                                                                    <Trash2 className="h-4 w-4" />
                                                                </Button>
                                                            </div>
                                                        </CardContent>
                                                    </Card>
                                                ))}
                                            </div>
                                        )}
                                    </ScrollArea>
                                </TabsContent>

                                <TabsContent value="associate" className="flex-1 m-0 p-0">
                                    <ScrollArea className="flex-1 p-6 h-[350px]">
                                        {relationships.filter(r => r.roles.includes('associate')).length === 0 ? (
                                            <div className="flex flex-col items-center justify-center h-48 text-muted-foreground border-2 border-dashed rounded-lg bg-muted/10 mx-auto max-w-sm mt-8">
                                                <Handshake className="h-10 w-10 mb-3 opacity-20" />
                                                <p className="font-medium text-sm">No associate relationships</p>
                                            </div>
                                        ) : (
                                            <div className="space-y-3">
                                                {relationships.filter(r => r.roles.includes('associate')).map(rel => (
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
                                                                <Button variant="ghost" size="sm" className="h-8 w-8 p-0" title="Edit Contract">
                                                                    <Edit className="h-4 w-4 text-muted-foreground" />
                                                                </Button>
                                                                <Button variant="ghost" size="sm" className="h-8 w-8 p-0 hover:text-red-600" title="End Relationship">
                                                                    <Trash2 className="h-4 w-4" />
                                                                </Button>
                                                            </div>
                                                        </CardContent>
                                                    </Card>
                                                ))}
                                            </div>
                                        )}
                                    </ScrollArea>
                                </TabsContent>

                                <TabsContent value="partner" className="flex-1 m-0 p-0">
                                    <ScrollArea className="flex-1 p-6 h-[350px]">
                                        {relationships.filter(r => r.roles.includes('partner')).length === 0 ? (
                                            <div className="flex flex-col items-center justify-center h-48 text-muted-foreground border-2 border-dashed rounded-lg bg-muted/10 mx-auto max-w-sm mt-8">
                                                <Handshake className="h-10 w-10 mb-3 opacity-20" />
                                                <p className="font-medium text-sm">No partner relationships</p>
                                            </div>
                                        ) : (
                                            <div className="space-y-3">
                                                {relationships.filter(r => r.roles.includes('partner')).map(rel => (
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
                                                                <Button variant="ghost" size="sm" className="h-8 w-8 p-0" title="Edit Contract">
                                                                    <Edit className="h-4 w-4 text-muted-foreground" />
                                                                </Button>
                                                                <Button variant="ghost" size="sm" className="h-8 w-8 p-0 hover:text-red-600" title="End Relationship">
                                                                    <Trash2 className="h-4 w-4" />
                                                                </Button>
                                                            </div>
                                                        </CardContent>
                                                    </Card>
                                                ))}
                                            </div>
                                        )}
                                    </ScrollArea>
                                </TabsContent>

                                <TabsContent value="investor" className="flex-1 m-0 p-0">
                                    <ScrollArea className="flex-1 p-6 h-[350px]">
                                        {relationships.filter(r => r.roles.includes('investor')).length === 0 ? (
                                            <div className="flex flex-col items-center justify-center h-48 text-muted-foreground border-2 border-dashed rounded-lg bg-muted/10 mx-auto max-w-sm mt-8">
                                                <Handshake className="h-10 w-10 mb-3 opacity-20" />
                                                <p className="font-medium text-sm">No investor relationships</p>
                                            </div>
                                        ) : (
                                            <div className="space-y-3">
                                                {relationships.filter(r => r.roles.includes('investor')).map(rel => (
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
                                                                <Button variant="ghost" size="sm" className="h-8 w-8 p-0" title="Edit Contract">
                                                                    <Edit className="h-4 w-4 text-muted-foreground" />
                                                                </Button>
                                                                <Button variant="ghost" size="sm" className="h-8 w-8 p-0 hover:text-red-600" title="End Relationship">
                                                                    <Trash2 className="h-4 w-4" />
                                                                </Button>
                                                            </div>
                                                        </CardContent>
                                                    </Card>
                                                ))}
                                            </div>
                                        )}
                                    </ScrollArea>
                                </TabsContent>

                                <TabsContent value="sponsor" className="flex-1 m-0 p-0">
                                    <ScrollArea className="flex-1 p-6 h-[350px]">
                                        {relationships.filter(r => r.roles.includes('sponsor')).length === 0 ? (
                                            <div className="flex flex-col items-center justify-center h-48 text-muted-foreground border-2 border-dashed rounded-lg bg-muted/10 mx-auto max-w-sm mt-8">
                                                <Handshake className="h-10 w-10 mb-3 opacity-20" />
                                                <p className="font-medium text-sm">No sponsor relationships</p>
                                            </div>
                                        ) : (
                                            <div className="space-y-3">
                                                {relationships.filter(r => r.roles.includes('sponsor')).map(rel => (
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
                                                                <Button variant="ghost" size="sm" className="h-8 w-8 p-0" title="Edit Contract">
                                                                    <Edit className="h-4 w-4 text-muted-foreground" />
                                                                </Button>
                                                                <Button variant="ghost" size="sm" className="h-8 w-8 p-0 hover:text-red-600" title="End Relationship">
                                                                    <Trash2 className="h-4 w-4" />
                                                                </Button>
                                                            </div>
                                                        </CardContent>
                                                    </Card>
                                                ))}
                                            </div>
                                        )}
                                    </ScrollArea>
                                </TabsContent>
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
    );
}
