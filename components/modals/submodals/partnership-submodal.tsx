'use client';

import React, { useState } from 'react';
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

    // --- MOCK DATA FOR LIST ---
    const [relationships, setRelationships] = useState<ActiveRelationship[]>([]);

    const handleCreateStart = () => {
        setViewMode('create');
        setTargetEntityId('');
        setSelectedRole('associate');
    };

    const handleCreateCancel = () => {
        setViewMode('list');
    };

    const handleCreateNext = () => {
        // This would typically open the Contract Modal
        // For now, we'll just "mock" creating a relationship
        const targetName = selectedEntityType === 'character'
            ? characters.find(c => c.id === targetEntityId)?.name
            : businesses.find(b => b.id === targetEntityId)?.name;

        if (targetName && targetEntityId) {
            const newRel: ActiveRelationship = {
                id: Math.random().toString(),
                entityId: targetEntityId,
                entityType: selectedEntityType,
                name: targetName,
                roles: [selectedRole],
                status: 'Draft'
            };
            setRelationships([...relationships, newRel]);
            setViewMode('list');
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

                                <ScrollArea className="flex-1 p-6">
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
                                    <div className="space-y-2 animate-in fade-in slide-in-from-top-2">
                                        <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Investment Amount</Label>
                                        <div className="relative">
                                            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                                <span className="text-muted-foreground text-sm">J$</span>
                                            </div>
                                            <input
                                                type="number"
                                                className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50 pl-8"
                                                placeholder="0.00"
                                            />
                                        </div>
                                        <p className="text-[10px] text-muted-foreground">Initial capital injection.</p>
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
                            <Button onClick={handleCreateNext} disabled={!targetEntityId} className="bg-indigo-600 hover:bg-indigo-700">
                                Create Relationship
                            </Button>
                        </div>
                    )}
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
