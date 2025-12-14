'use strict';

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { FileText, ShieldCheck } from 'lucide-react';
import { Business, Contract, Character, Site } from '@/types/entities';
import { ContractStatus } from '@/types/enums';
import { PartnershipSubmodal } from '@/components/modals/submodals/partnership-submodal';
import { ContractSubmodal } from '@/components/modals/submodals/contract-submodal';

interface PartnershipsManagerProps {
    businesses: Business[];
    contracts: Contract[];
    characters: Character[];
    sites: Site[]; // Kept for consistency if needed, though unused maybe?
    onCreateContract: (contract: Contract) => void;
    onUpdateContract: (contract: Contract) => void;
}

export function PartnershipsManager({
    businesses = [],
    contracts = [],
    characters = [],
    sites = [],
    onCreateContract,
    onUpdateContract
}: PartnershipsManagerProps) {
    const [isContractModalOpen, setIsContractModalOpen] = useState(false);
    const [isPartnershipModalOpen, setIsPartnershipModalOpen] = useState(false);
    const [selectedContract, setSelectedContract] = useState<Contract | undefined>(undefined);

    // Helpers to resolve names
    const getEntityName = (id: string) => {
        const ent = businesses.find((e: Business) => e.id === id);
        return ent ? ent.name : 'Unknown Entity';
    };

    return (
        <div className="space-y-6">
            {/* CONTRACTS SECTION */}
            <Card>
                <CardHeader>
                    <div className="flex items-center justify-between">
                        <div>
                            <CardTitle>Contracts</CardTitle>
                            <CardDescription>Manage active contracts and agreements.</CardDescription>
                        </div>
                        <Button onClick={() => { setSelectedContract(undefined); setIsContractModalOpen(true); }}>
                            <FileText className="mr-2 h-4 w-4" />
                            New Contract
                        </Button>
                    </div>
                </CardHeader>
                <CardContent>
                    {contracts.length === 0 ? (
                        <div className="flex flex-col items-center justify-center p-12 text-center text-muted-foreground border-2 border-dashed rounded-lg bg-slate-50 dark:bg-slate-900/20">
                            <FileText className="h-10 w-10 mb-4 opacity-20" />
                            <p>No Active Contracts found.</p>
                            <Button variant="ghost" onClick={() => setIsContractModalOpen(true)} className="mt-2">Create your first Contract</Button>
                        </div>
                    ) : (
                        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                            {contracts.map(contract => (
                                <Card key={contract.id} className="cursor-pointer hover:shadow-md transition-shadow group border-muted" onClick={() => { setSelectedContract(contract); setIsContractModalOpen(true); }}>
                                    <CardHeader className="pb-2">
                                        <div className="flex justify-between items-start">
                                            <Badge variant={contract.status === ContractStatus.ACTIVE ? 'default' : 'secondary'}>
                                                {contract.status}
                                            </Badge>
                                            <ShieldCheck className="h-4 w-4 text-emerald-500" />
                                        </div>
                                        <CardTitle className="text-lg flex items-center gap-2 mt-2 group-hover:text-primary transition-colors">
                                            {getEntityName(contract.counterpartyBusinessId)}
                                        </CardTitle>
                                        <div className="text-xs text-muted-foreground">
                                            With: {getEntityName(contract.principalBusinessId)}
                                        </div>
                                    </CardHeader>
                                    <CardContent>
                                        <div className="space-y-2 text-sm">
                                            <div className="flex justify-between p-2 bg-slate-50 dark:bg-slate-800 rounded">
                                                <span className="text-muted-foreground">Clauses:</span>
                                                <span className="font-bold">{contract.clauses.length} Defined</span>
                                            </div>
                                        </div>
                                    </CardContent>
                                </Card>
                            ))}
                        </div>
                    )}
                </CardContent>
            </Card>

            {/* PARTNERS & INVESTORS SECTION */}
            <Card>
                <CardHeader>
                    <div className="flex items-center justify-between">
                        <div>
                            <CardTitle>Partners and Investors</CardTitle>
                            <CardDescription>Manage strategic relationships and investors.</CardDescription>
                        </div>
                        <Button variant="outline" onClick={() => setIsPartnershipModalOpen(true)}>
                            New Partnership
                        </Button>
                    </div>
                </CardHeader>
                <CardContent>
                    <div className="text-center py-8 text-muted-foreground text-sm">
                        No partners or investors configured yet.
                    </div>
                </CardContent>
            </Card>

            <ContractSubmodal
                open={isContractModalOpen}
                onClose={() => setIsContractModalOpen(false)}
                onSave={(contract) => {
                    if (selectedContract) {
                        onUpdateContract(contract);
                    } else {
                        onCreateContract(contract);
                    }
                    setIsContractModalOpen(false);
                }}
                initialData={selectedContract}
                businesses={businesses}
            />

            <PartnershipSubmodal
                open={isPartnershipModalOpen}
                onClose={() => setIsPartnershipModalOpen(false)}
                onSave={(data) => {
                    console.log("Partnership saved", data);
                    setIsPartnershipModalOpen(false);
                }}
                businesses={businesses}
                characters={characters}
            />
        </div>
    );
}
