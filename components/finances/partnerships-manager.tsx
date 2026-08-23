'use strict';

import React, { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { FileText, ShieldCheck } from 'lucide-react';
import { Business, Contract, Character, Site } from '@/types/entities';
import { ContractStatus, EntityType, LinkType } from '@/types/enums';
import { ClientAPI } from '@/lib/client-api';
import { ContractSubmodal } from '@/components/modals/submodals/contract-submodal';

interface PartnershipsManagerProps {
    businesses: Business[];
    contracts: Contract[];
    characters: Character[];
    sites: Site[]; // Kept for consistency if needed, though unused maybe?
    onCreateContract: (contract: Contract) => void;
    onUpdateContract: (contract: Contract) => void;
    onDeleteContract: (contractIds: string[]) => void;
}

export function PartnershipsManager({
    businesses = [],
    contracts = [],
    characters = [],
    sites = [],
    onCreateContract,
    onUpdateContract,
    onDeleteContract
}: PartnershipsManagerProps) {
    const [isContractModalOpen, setIsContractModalOpen] = useState(false);
    const [selectedContract, setSelectedContract] = useState<Contract | undefined>(undefined);
    const [contractParties, setContractParties] = useState<Record<string, { owner?: string; counterparty?: string }>>({});
    const [businessCharacters, setBusinessCharacters] = useState<Record<string, string>>({});

    useEffect(() => {
        let cancelled = false;
        Promise.all([
            ...businesses.map(async (business) => {
                const links = await ClientAPI.getLinksFor({ type: EntityType.BUSINESS, id: business.id });
                const link = links.find((candidate: any) => candidate.linkType === LinkType.CHARACTER_BUSINESS && candidate.source?.type === EntityType.CHARACTER && candidate.target?.id === business.id);
                return link ? [business.id, link.source.id] as const : null;
            }),
        ]).then((entries) => {
            if (!cancelled) setBusinessCharacters(Object.fromEntries(entries.filter(Boolean) as Array<readonly [string, string]>));
        }).catch(() => undefined);
        Promise.all(contracts.map(async (contract) => {
            const links = await ClientAPI.getLinksFor({ type: EntityType.CONTRACT, id: contract.id });
            const parties: { owner?: string; counterparty?: string } = {};
            links.filter((link: any) => link.linkType === LinkType.CHARACTER_CONTRACT).forEach((link: any) => {
                if (link.relationship === 'owner') parties.owner = link.source?.id;
                if (link.relationship === 'counterparty') parties.counterparty = link.source?.id;
            });
            return [contract.id, parties] as const;
        })).then((entries) => {
            if (!cancelled) setContractParties(Object.fromEntries(entries));
        }).catch(() => undefined);
        return () => { cancelled = true; };
    }, [businesses, contracts]);

    // Helpers to resolve names
    const getEntityName = (id?: string) => {
        if (!id) return 'Unknown Entity';
        const bus = businesses.find((e: Business) => e.id === id);
        if (bus) return bus.name;

        const char = characters.find((c: Character) => c.id === id);
        if (char) return char.name;

        return 'Unknown Entity';
    };

    const getPartyBusinessId = (characterId?: string) =>
        characterId ? Object.entries(businessCharacters).find(([, id]) => id === characterId)?.[0] : undefined;

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
                        <div className="flex gap-2">
                            <Button onClick={() => { setSelectedContract(undefined); setIsContractModalOpen(true); }}>
                                <FileText className="mr-2 h-4 w-4" />
                                New Contract
                            </Button>
                        </div>
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
                                            {getEntityName(contractParties[contract.id]?.counterparty || getPartyBusinessId(contractParties[contract.id]?.counterparty))}
                                        </CardTitle>
                                        <div className="text-xs text-muted-foreground">
                                            With: {getEntityName(contractParties[contract.id]?.owner || getPartyBusinessId(contractParties[contract.id]?.owner))}
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
                onDelete={(id) => {
                    if (id) {
                        onDeleteContract([id]);
                        setIsContractModalOpen(false);
                    }
                }}
                initialData={selectedContract}
                availableCharacters={characters}
                availableBusinesses={businesses}
            />
        </div>
    );
}
