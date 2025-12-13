'use strict';

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Plus, Building2, FileText, User, ArrowRight, ShieldCheck, Briefcase } from 'lucide-react';
import { LegalEntity, Contract, Character, Site } from '@/types/entities';
import { LegalEntityType, ContractStatus } from '@/types/enums';
import { LegalEntitySubmodal } from '@/components/modals/submodals/legal-entity-submodal';
import { ContractSubmodal } from '@/components/modals/submodals/contract-submodal';

interface PartnershipsManagerProps {
    legalEntities: LegalEntity[];
    contracts: Contract[];
    characters: Character[];
    sites: Site[];
    onCreateLegalEntity: (entity: Partial<LegalEntity>) => void;
    onUpdateLegalEntity: (entity: LegalEntity) => void;
    onCreateContract: (contract: Partial<Contract>) => void;
    onUpdateContract: (contract: Contract) => void;
}

export function PartnershipsManager({
    legalEntities = [],
    contracts = [],
    characters = [],
    sites = [],
    onCreateLegalEntity,
    onUpdateLegalEntity,
    onCreateContract,
    onUpdateContract
}: PartnershipsManagerProps) {
    const [activeTab, setActiveTab] = useState('contracts');
    const [isLegalEntityModalOpen, setIsLegalEntityModalOpen] = useState(false);
    const [isContractModalOpen, setIsContractModalOpen] = useState(false);
    const [selectedEntity, setSelectedEntity] = useState<LegalEntity | undefined>(undefined);
    const [selectedContract, setSelectedContract] = useState<Contract | undefined>(undefined);

    // Helpers to resolve names
    const getEntityName = (id: string) => {
        const ent = legalEntities.find(e => e.id === id);
        return ent ? ent.name : 'Unknown Entity';
    };

    const getCharacterName = (id?: string | null) => {
        if (!id) return null;
        return characters.find(c => c.id === id)?.name;
    };

    return (
        <div className="space-y-6 p-4">
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-2xl font-bold tracking-tight">Partnerships & Legal</h2>
                    <p className="text-muted-foreground">Manage Legal Entities and Business Contracts.</p>
                </div>
                <div className="flex gap-2">
                    <Button onClick={() => { setSelectedEntity(undefined); setIsLegalEntityModalOpen(true); }} variant="outline">
                        <Building2 className="mr-2 h-4 w-4" />
                        New Legal Entity
                    </Button>
                    <Button onClick={() => { setSelectedContract(undefined); setIsContractModalOpen(true); }}>
                        <FileText className="mr-2 h-4 w-4" />
                        New Contract
                    </Button>
                </div>
            </div>

            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
                <TabsList className="grid w-full grid-cols-2 max-w-[400px]">
                    <TabsTrigger value="contracts">Contracts</TabsTrigger>
                    <TabsTrigger value="entities">Legal Entities</TabsTrigger>
                </TabsList>

                {/* CONTRACTS TAB */}
                <TabsContent value="contracts" className="mt-4 space-y-4">
                    {contracts.length === 0 ? (
                        <Card className="bg-slate-50 border-dashed">
                            <CardContent className="flex flex-col items-center justify-center p-12 text-center text-muted-foreground">
                                <FileText className="h-10 w-10 mb-4 opacity-20" />
                                <p>No Active Contracts found.</p>
                                <Button variant="ghost" onClick={() => setIsContractModalOpen(true)}>Create your first Contract</Button>
                            </CardContent>
                        </Card>
                    ) : (
                        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                            {contracts.map(contract => (
                                <Card key={contract.id} className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => { setSelectedContract(contract); setIsContractModalOpen(true); }}>
                                    <CardHeader className="pb-2">
                                        <div className="flex justify-between items-start">
                                            <Badge variant={contract.status === ContractStatus.ACTIVE ? 'default' : 'secondary'}>
                                                {contract.status}
                                            </Badge>
                                            <ShieldCheck className="h-4 w-4 text-emerald-500" />
                                        </div>
                                        <CardTitle className="text-lg flex items-center gap-2 mt-2">
                                            {getEntityName(contract.counterpartyLegalEntityId)}
                                        </CardTitle>
                                        <CardDescription className="flex items-center gap-2 text-xs">
                                            With: {getEntityName(contract.principalLegalEntityId)}
                                        </CardDescription>
                                    </CardHeader>
                                    <CardContent>
                                        <div className="space-y-2 text-sm">
                                            <div className="flex justify-between p-2 bg-slate-50 rounded">
                                                <span className="text-muted-foreground">Clauses:</span>
                                                <span className="font-bold">{contract.clauses.length} Defined</span>
                                            </div>
                                        </div>
                                    </CardContent>
                                </Card>
                            ))}
                        </div>
                    )}
                </TabsContent>

                {/* LEGAL ENTITIES TAB */}
                <TabsContent value="entities" className="mt-4 space-y-4">
                    {legalEntities.length === 0 ? (
                        <Card className="bg-slate-50 border-dashed">
                            <CardContent className="flex flex-col items-center justify-center p-12 text-center text-muted-foreground">
                                <Building2 className="h-10 w-10 mb-4 opacity-20" />
                                <p>No Legal Entities defined.</p>
                                <Button variant="ghost" onClick={() => setIsLegalEntityModalOpen(true)}>Create Legal Entity</Button>
                            </CardContent>
                        </Card>
                    ) : (
                        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                            {legalEntities.map(entity => (
                                <Card key={entity.id} className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => { setSelectedEntity(entity); setIsLegalEntityModalOpen(true); }}>
                                    <CardHeader className="pb-2">
                                        <div className="flex justify-between items-start">
                                            <div className="p-2 bg-indigo-100 rounded-lg">
                                                <Building2 className="h-5 w-5 text-indigo-700" />
                                            </div>
                                            <Badge variant="outline">{entity.type}</Badge>
                                        </div>
                                        <CardTitle className="text-lg mt-3">{entity.name}</CardTitle>
                                        <CardDescription>{entity.taxId || 'No Tax ID'}</CardDescription>
                                    </CardHeader>
                                    <CardContent>
                                        <div className="space-y-1 text-sm text-muted-foreground">
                                            {entity.linkedCharacterId && (
                                                <div className="flex items-center gap-2">
                                                    <User className="h-3 w-3" />
                                                    Representative: <span className="text-foreground">{getCharacterName(entity.linkedCharacterId)}</span>
                                                </div>
                                            )}
                                        </div>
                                    </CardContent>
                                </Card>
                            ))}
                        </div>
                    )}
                </TabsContent>
            </Tabs>

            {/* Modals */}
            <LegalEntitySubmodal
                open={isLegalEntityModalOpen}
                onClose={() => setIsLegalEntityModalOpen(false)}
                onSave={(entity) => {
                    if (selectedEntity) {
                        onUpdateLegalEntity(entity);
                    } else {
                        onCreateLegalEntity(entity);
                    }
                    setIsLegalEntityModalOpen(false);
                }}
                initialData={selectedEntity}
            // Options handled internally now
            />

            <ContractSubmodal
                open={isContractModalOpen}
                onClose={() => setIsContractModalOpen(false)}
                onSave={(contract) => {
                    // Need to implement save logic correctly in parent or simple wrapper
                    if (selectedContract) {
                        onUpdateContract(contract);
                    } else {
                        onCreateContract(contract);
                    }
                    setIsContractModalOpen(false);
                }}
                initialData={selectedContract}
                legalEntities={legalEntities}
            />
        </div>
    );
}
