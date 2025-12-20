'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { DatePicker } from '@/components/ui/date-picker';
import NumericInput from '@/components/ui/numeric-input';
import { SearchableSelect } from '@/components/ui/searchable-select';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
    Plus,
    Trash2,
    User,
    Store,
    DollarSign,
    Network
} from 'lucide-react';
import {
    ItemType,
    Station,
    ContractStatus,
    ContractClauseType,
    SaleType,
    SaleStatus,
    CharacterRole
} from '@/types/enums';
import { Sale, SaleLine, Item, Site, Character, ServiceLine, ItemSaleLine, BundleSaleLine, Business, Contract } from '@/types/entities';
import { v4 as uuid } from 'uuid';
import { createSiteOptionsWithCategories } from '@/lib/utils/site-options-utils';
import SaleItemsSubModal from './sale-items-submodal';
import { DEFAULT_CURRENCY_EXCHANGE_RATES } from '@/lib/constants/financial-constants';

// ============================================================================
// Types
// ============================================================================

export interface BoothSalesViewProps {
    // Data
    sites: Site[];
    characters: Character[];
    items: Item[];
    businesses: Business[]; // New: For resolving contracts
    contracts: Contract[]; // New: For dynamic distribution logic

    // State from Parent (SalesModal)
    saleDate: Date;
    setSaleDate: (date: Date) => void;
    lines: SaleLine[];
    setLines: (lines: SaleLine[]) => void;
    siteId: string;
    setSiteId: (id: string) => void;

    // Actions
    onSave: (sale?: Sale) => void;
    onCancel: () => void;
    isSaving: boolean;
}

interface AssociateQuickEntry {
    id: string;
    description: string;
    amount: number;
    category: string; // e.g., 'O2 Jewelry'
    associateId: string; // Linking to specific associate
}

type SettlementRow = {
    id: string; // category name or item id
    label: string;
    isAssociate: boolean;
    totalColones: number;
    totalDollars: number;
    totalBitcoin: number;
    totalCard: number; // pending
    // Calculated commissions
    commissionAmount: number; // 25% of converted total (or configurable)
    ownerAmount: number; // 75% of converted total (or configurable)
}

// ============================================================================
// Component Booth Sales
// ============================================================================

export default function BoothSalesView({
    sites,
    characters,
    items,
    businesses,
    contracts,
    saleDate,
    setSaleDate,
    lines,
    setLines,
    siteId,
    setSiteId,
    onSave,
    onCancel,
    isSaving
}: BoothSalesViewProps) {

    // 1. Local State
    // ============================================================================

    // UI Toggles
    const [showItemPicker, setShowItemPicker] = useState(false);

    // Financials
    const [boothCost, setBoothCost] = useState(0);
    const exchangeRate = DEFAULT_CURRENCY_EXCHANGE_RATES.colonesToUsd;

    // State for Single Contract (Global for this sale)
    const [selectedContractId, setSelectedContractId] = useState<string>('');

    // State for Associate (Them)
    const [selectedAssociateId, setSelectedAssociateId] = useState<string>(''); // Character ID

    // Associate Quick Entry State (formerly Partner)
    const [associateEntries, setAssociateEntries] = useState<AssociateQuickEntry[]>([]);
    const [viewMode, setViewMode] = useState<'Associate' | 'Partner'>('Associate');

    // Quick Entry Form State
    const [quickAmount, setQuickAmount] = useState<string>('');
    // const [quickDesc, setQuickDesc] = useState<string>(''); // Removed as requested
    const [quickCat, setQuickCat] = useState<string>('');

    // Load Defaults (One-time) - Mocking "My Defaults"
    useEffect(() => {
        // Find a default contract for Principal if one exists (just taking the first valid one for now)
        // In real app, this would come from user settings or local storage
        const defaultContract = contracts.find(c => c.status === ContractStatus.ACTIVE); // Simplified
        if (defaultContract && !selectedContractId) {
            setSelectedContractId(defaultContract.id);
        }
    }, [contracts, selectedContractId]);

    // Load Default Associate (One time)
    useEffect(() => {
        // Mocking "Maria" as default if she exists
        if (!selectedAssociateId && characters.length > 0) {
            const maria = characters.find(c => c.name.toLowerCase().includes('maria') || c.name.includes('O2'));
            if (maria) setSelectedAssociateId(maria.id);
        }
    }, [characters, selectedAssociateId]);

    // Auto-select contract when Associate changes
    useEffect(() => {
        if (!selectedAssociateId) return;

        // 1. Try Strict Match (ID)
        let match = contracts.find(c =>
            ['Active', 'ACTIVE', 'active'].includes(c.status) &&
            c.counterpartyBusinessId === selectedAssociateId
        );

        // 2. Try Fuzzy Name Match (Fallback)
        if (!match) {
            const associate = characters.find(char => char.id === selectedAssociateId);
            if (associate) {
                // Simple fuzzy: check if Contract Name contains the Associate's first name
                // e.g. "Maria Agreement" matches "Maria Cecilia"
                const firstName = associate.name.split(' ')[0].toLowerCase();
                match = contracts.find(c =>
                    ['Active', 'ACTIVE', 'active'].includes(c.status) &&
                    c.name.toLowerCase().includes(firstName)
                );
            }
        }

        if (match) {
            setSelectedContractId(match.id);
        } else {
            setSelectedContractId('');
        }
    }, [selectedAssociateId, contracts, characters]);


    // 2. Logic & Calculations (The Sales Distribution Engine)
    // ============================================================================

    // 2. Logic & Calculations (The Sales Distribution Engine)
    // ============================================================================

    const myItems = useMemo(() =>
        lines.filter(l => (l.kind === 'item' || l.kind === 'bundle')) as (ItemSaleLine | BundleSaleLine)[],
        [lines]);

    // Unified logic to find the single active contract
    const activeContract = useMemo(() => {
        if (!selectedContractId) return null;
        return contracts.find(c => c.id === selectedContractId);
    }, [contracts, selectedContractId]);

    // Calculate Totals & Distribution
    const totals = useMemo(() => {
        let grossSales = 0;
        let akilesNet = 0;
        let associateNet = 0;

        // --- 1. Principal Items (My Stuff) ---
        const myItemsTotal = myItems.reduce((sum, item) => sum + ((item.unitPrice || 0) * (item.quantity || 0)), 0);

        // Find Contract for ME
        const myContract = activeContract;

        // Calculate Splits for MY items
        // Default: 100% to me, 0% to associate if no contract
        let principalSharePct_Me = 100;
        let principalSharePct_Associate = 0;

        if (myContract) {
            // "Principal Commission": My Items sold by Associate
            // Usually [Me, Associate] e.g. 75/25
            const clause = myContract.clauses?.find(c => c.type === ContractClauseType.SALES_COMMISSION && c.description?.toLowerCase().includes('principal'));
            if (!clause) {
                // Try generic Sales Commission if specific one not found
                const genericClause = myContract.clauses?.find(c => c.type === ContractClauseType.SALES_COMMISSION);
                if (genericClause) {
                    principalSharePct_Me = (genericClause.companyShare || 0) * 100;
                    principalSharePct_Associate = (genericClause.associateShare || 0) * 100;
                }
            } else {
                principalSharePct_Me = (clause.companyShare || 0) * 100;
                principalSharePct_Associate = (clause.associateShare || 0) * 100;
            }
        }

        const myRevenue_FromMyItems = myItemsTotal * (principalSharePct_Me / 100);
        const assocRevenue_FromMyItems = myItemsTotal * (principalSharePct_Associate / 100);

        // --- 2. Associate Items (Their Stuff) ---
        const assocItemsTotal = associateEntries.reduce((sum, e) => sum + e.amount, 0);

        // Calculate Splits for THEIR items
        // "Associate Sales Service": Associate Items sold by Me
        // Usually [Me, Associate] e.g. 25/75 (I take 25% commission)
        let associateSharePct_Me = 0; // Default: I get nothing
        let associateSharePct_Associate = 100; // They get 100%

        if (myContract) {
            // Prefer SALES_SERVICE for this (I'm providing a service selling their stuff)
            // Fallback to SALES_COMMISSION with 'associate' in description for legacy/safety
            let clause = myContract.clauses?.find(c => c.type === ContractClauseType.SALES_SERVICE);

            if (!clause) {
                clause = myContract.clauses?.find(c => c.type === ContractClauseType.SALES_COMMISSION && c.description?.toLowerCase().includes('associate'));
            }

            if (clause) {
                associateSharePct_Me = (clause.companyShare || 0) * 100;
                associateSharePct_Associate = (clause.associateShare || 0) * 100;
            }
        }

        const myRevenue_FromAssocItems = assocItemsTotal * (associateSharePct_Me / 100);
        const assocRevenue_FromAssocItems = assocItemsTotal * (associateSharePct_Associate / 100);


        // --- 3. Booth Cost ---
        // "Expense Sharing"
        let costSharePct_Me = 50;

        if (myContract) {
            const expClause = myContract.clauses?.find(c => c.type === ContractClauseType.EXPENSE_SHARING);
            if (expClause) {
                costSharePct_Me = (expClause.companyShare || 0) * 100;
            }
        }

        const cost_Me = boothCost * (costSharePct_Me / 100);
        const cost_Assoc = boothCost - cost_Me;


        // --- Final Tally ---
        grossSales = myItemsTotal + assocItemsTotal;
        akilesNet = myRevenue_FromMyItems + myRevenue_FromAssocItems - cost_Me;
        associateNet = assocRevenue_FromMyItems + assocRevenue_FromAssocItems - cost_Assoc;

        return {
            grossSales, // Total money collected
            myNet: akilesNet, // What ends up in my pocket (Sales + Comm - Cost) (Renaming to avoid confusion)
            associateNet, // What I owe/pay them
            myCommissions: myRevenue_FromAssocItems,
            associateCommissions: assocRevenue_FromMyItems,
            breakdown: {
                principalSharePct_Me,
                principalSharePct_Associate,
                associateSharePct_Me,
                associateSharePct_Associate,
                mySales: myItemsTotal,
                assocSales: assocItemsTotal,
                myRevenueFromMySales: myRevenue_FromMyItems,
                myRevenueFromAssocSales: myRevenue_FromAssocItems,
                assocRevenueFromMySales: assocRevenue_FromMyItems,
                assocRevenueFromAssocSales: assocRevenue_FromAssocItems,
                costMe: cost_Me,
                costAssoc: cost_Assoc
            }
        };

    }, [myItems, associateEntries, boothCost, activeContract]);

    const getAssociateName = (id: string) => {
        const char = characters.find(c => c.id === id);
        if (char) return char.name;
        const bus = businesses.find(b => b.id === id);
        if (bus) return bus.name;
        return 'Unknown';
    };

    const salesDistributionMatrix = useMemo(() => {
        // 1. Group Akiles Items (from lines)
        const akilesRows: Record<string, SettlementRow> = {};
        const associateRows: Record<string, SettlementRow> = {};

        // Process Real Lines (Akiles Inventory)
        lines.filter(l => l.kind === 'item' || l.kind === 'bundle').forEach(line => {

            let total = 0;
            let category = 'Other';

            if (line.kind === 'item') {
                const itemLine = line as ItemSaleLine;
                total = (itemLine.quantity || 0) * (itemLine.unitPrice || 0);
                const item = items.find(i => i.id === itemLine.itemId);
                // Safely determine category
                if (item) {
                    category = item.subItemType ? `${item.type}: ${item.subItemType}` : item.type;
                }
            } else if (line.kind === 'bundle') {
                const bundleLine = line as BundleSaleLine;
                total = (bundleLine.quantity || 0) * (bundleLine.unitPrice || 0);
                category = bundleLine.subItemType ? `Bundle: ${bundleLine.subItemType}` : 'Bundle';
            }


            if (!akilesRows[category]) {
                akilesRows[category] = {
                    id: category,
                    label: category,
                    isAssociate: false,
                    totalColones: line.kind === 'bundle' ? total : 0, // Bundles in Colones (Assumption)
                    totalDollars: line.kind === 'item' ? total : 0,   // Items in Dollars
                    totalBitcoin: 0,
                    totalCard: 0,
                    commissionAmount: 0,
                    ownerAmount: 0
                };
            } else {
                if (line.kind === 'item') {
                    akilesRows[category].totalDollars += total;
                } else {
                    akilesRows[category].totalColones += total;
                }
            }
        });

        // Process Associate Entries
        associateEntries.forEach(entry => {
            // Basic category grouping
            const catLabel = entry.category || 'Other';
            if (!associateRows[catLabel]) {
                associateRows[catLabel] = {
                    id: catLabel,
                    label: catLabel,
                    isAssociate: true,
                    totalColones: entry.amount, // Assumption: Entered in Colones
                    totalDollars: 0,
                    totalBitcoin: 0,
                    totalCard: 0,
                    commissionAmount: 0,
                    ownerAmount: 0
                };
            } else {
                associateRows[catLabel].totalColones += entry.amount;
            }
        });

        // Apply calculated splits from the 'totals' memo to the rows for display
        Object.values(akilesRows).forEach(row => {
            const totalValue = row.totalColones + (row.totalDollars * exchangeRate);
            row.ownerAmount = totalValue * (totals.breakdown.principalSharePct_Me / 100);
            row.commissionAmount = totalValue * (totals.breakdown.principalSharePct_Associate / 100);
        });

        Object.values(associateRows).forEach(row => {
            const totalValue = row.totalColones + (row.totalDollars * exchangeRate);
            row.ownerAmount = totalValue * (totals.breakdown.associateSharePct_Me / 100);
            row.commissionAmount = totalValue * (totals.breakdown.associateSharePct_Associate / 100);
        });

        return {
            akiles: Object.values(akilesRows),
            associate: Object.values(associateRows)
        };
    }, [myItems, associateEntries, items, exchangeRate, totals]);


    // 3. Handlers
    // ============================================================================

    const handleAddAssociateEntry = () => {
        const amount = parseFloat(quickAmount);
        if (amount <= 0 || !selectedAssociateId || !quickCat) return;

        const newEntry: AssociateQuickEntry = {
            id: uuid(),
            description: '', // Description removed from UI
            amount: amount,
            category: quickCat,
            associateId: selectedAssociateId
        };

        setAssociateEntries([...associateEntries, newEntry]);
        setQuickAmount('');
        // setQuickDesc('');
        setQuickCat('');
    };

    const handleRemoveAssociateEntry = (id: string) => {
        setAssociateEntries(prev => prev.filter(e => e.id !== id));
    };

    const handleRemoveLine = (lineId: string) => {
        setLines(lines.filter(l => l.lineId !== lineId));
    };

    // Handler to merge everything and Save
    const handleSave = () => {
        if (!siteId) {
            alert("Please select a Site.");
            return;
        }

        // 1. Convert Associate Entries to Service Lines
        const associateServiceLines: ServiceLine[] = associateEntries.map(entry => ({
            lineId: uuid(),
            kind: 'service',
            station: 'Associate Sales' as Station,
            revenue: entry.amount,
            // Helper to get name
            description: `[Associate: ${getAssociateName(entry.associateId)}] ${entry.category}`,
            taxAmount: 0,
            createTask: false,
            customerCharacterId: entry.associateId,
            // Add metadata for tracking splits if needed
            metadata: {
                category: entry.category,
                associateShare: totals.breakdown.associateSharePct_Associate,
                myCommission: totals.breakdown.associateSharePct_Me
            }
        }));

        // 2. Combine all lines
        const allLines = [...lines.filter(l => l.kind !== 'service'), ...associateServiceLines];

        // 3. Construct Metadata Context
        const boothMetadata = {
            boothSaleContext: {
                contractId: selectedContractId,
                boothCost: boothCost,
                calculatedTotals: totals
            }
        };

        // 4. Construct FULL Valid Sale Object
        // Using CHARGED as the standard 'Completed' status for sales
        const saleId = uuid();
        const saleName = `Booth Sale ${saleDate.toLocaleDateString()}`;

        const fullSale: Sale = {
            id: saleId,
            name: saleName,
            description: 'Feria / Booth Sale',
            saleDate: saleDate, // Using date object directly
            type: SaleType.BOOTH,
            status: SaleStatus.CHARGED,
            siteId: siteId,
            salesChannel: 'Booth Sales' as Station,

            // Financials
            lines: allLines,
            totals: {
                subtotal: totals.grossSales,
                discountTotal: 0,
                taxTotal: 0,
                totalRevenue: totals.grossSales
            },

            // Metadata & Links
            archiveMetadata: boothMetadata,
            links: [], // Rosetta Stone initialization

            // Lifecycle defaults
            createdAt: new Date(),
            updatedAt: new Date(),
            isCollected: false,

            // Optional fields defaults
            isNotPaid: false,
            isNotCharged: false,
        };

        // 5. Pass to Parent
        onSave(fullSale);
    };


    // 4. Render
    // ============================================================================
    return (
        <div className="flex flex-col h-full bg-slate-50/50 dark:bg-slate-900/50 -mx-6 -my-4 p-6">

            {/* SECTION A: HEADER / SETUP */}
            <div className="flex items-center gap-6 mb-6 bg-white dark:bg-slate-800 p-4 rounded-xl shadow-sm border">
                {/* Icon + Title */}
                <div className="flex items-center gap-3">
                    <div className="p-2 bg-indigo-100 dark:bg-indigo-900 rounded-lg">
                        <Store className="h-5 w-5 text-indigo-600 dark:text-indigo-400" />
                    </div>
                    <div>
                        <h2 className="text-lg font-bold text-slate-800 dark:text-slate-100 whitespace-nowrap">Booth Sales</h2>
                    </div>
                </div>

                <div className="w-px h-8 bg-slate-200 dark:bg-slate-700" />

                {/* Date Field */}
                <div className="flex items-center gap-2">
                    <Label className="text-sm font-medium text-muted-foreground whitespace-nowrap">Date:</Label>
                    <DatePicker value={saleDate} onChange={(d) => setSaleDate(d || new Date())} />
                </div>

                {/* Booth Cost Field */}
                <div className="flex items-center gap-2">
                    <Label className="text-sm font-medium text-muted-foreground whitespace-nowrap">Booth Cost:</Label>
                    <NumericInput
                        value={boothCost}
                        onChange={setBoothCost}
                        className="h-9 w-32 border-red-200 text-red-600 font-medium"
                        placeholder="0"
                    />
                </div>

                {/* Exchange Rate Field */}
                <div className="flex items-center gap-2">
                    <Label className="text-sm font-medium text-muted-foreground whitespace-nowrap">$/₡:</Label>
                    <div className="h-9 w-20 px-3 py-2 rounded-md border bg-muted/50 flex items-center justify-center text-sm font-medium text-muted-foreground">
                        {exchangeRate}
                    </div>
                </div>

                {/* Site Field */}
                <div className="flex items-center gap-2">
                    <Label className="text-sm font-medium text-muted-foreground whitespace-nowrap">Site:</Label>
                    <SearchableSelect
                        value={siteId}
                        onValueChange={setSiteId}
                        options={createSiteOptionsWithCategories(sites)}
                        autoGroupByCategory
                        placeholder="Select site..."
                        className="h-9 w-48"
                    />
                </div>

                {/* Header Spacer or additional info */}
                <div className="flex-1" />
            </div>

            <div className="grid grid-cols-12 gap-6 flex-1 min-h-0">

                {/* SECTION B: SPLIT VIEW (My Inventory vs. Partner Sales) */}
                <div className="col-span-12 lg:col-span-7 flex flex-col gap-4 min-h-0 overflow-y-auto pr-2">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {/* Card 1: My Inventory (Akiles) */}
                        <Card className="border-indigo-500/20 bg-indigo-950/20">
                            <CardContent className="p-4 space-y-4">
                                <div className="flex items-center justify-between">
                                    <h3 className="text-lg font-semibold flex items-center text-indigo-300">
                                        <User className="h-5 w-5 mr-2" />
                                        Products
                                    </h3>
                                    <div className="flex items-center gap-2">
                                        <Button size="sm" variant="outline" className="h-7 text-xs border-indigo-500/30 text-indigo-300 hover:bg-indigo-500/20" onClick={() => setShowItemPicker(true)}>
                                            <Plus className="h-3 w-3 mr-1" /> Add
                                        </Button>
                                        <Badge variant="secondary" className="bg-indigo-500/20 text-indigo-300 hover:bg-indigo-500/30">{myItems.length}</Badge>
                                    </div>
                                </div>

                                {/* List of Added Items */}
                                <div className="space-y-2 max-h-[200px] overflow-y-auto">
                                    {myItems.map(line => {
                                        // Simple rendering for now
                                        const item = line.kind === 'item' ? items.find(i => i.id === (line as ItemSaleLine).itemId) : null;
                                        return (
                                            <div key={line.lineId} className="flex justify-between items-center text-sm p-2 bg-slate-800 rounded border border-slate-700 cursor-pointer hover:bg-slate-700 transition-colors group" onClick={() => setShowItemPicker(true)}>
                                                <span className="truncate max-w-[150px]">{item ? item.name : 'Bundle'}</span>
                                                <div className="flex items-center gap-4">
                                                    <span>{line.quantity}x</span>
                                                    <span>${((line.unitPrice || 0) * (line.quantity || 0)).toLocaleString()}</span>
                                                    <Button variant="ghost" size="icon" className="h-6 w-6 text-red-400 opacity-0 group-hover:opacity-100 transition-opacity" onClick={(e) => { e.stopPropagation(); handleRemoveLine(line.lineId); }}>
                                                        <Trash2 className="h-3 w-3" />
                                                    </Button>
                                                </div>
                                            </div>
                                        )
                                    })}
                                </div>
                            </CardContent>
                        </Card>

                        {/* Card 2: Partner / Associate (Sales of their stuff) */}
                        <Card className="border-pink-500/20 bg-pink-950/20">
                            <CardContent className="p-4 space-y-4">
                                <div className="flex flex-col gap-3">
                                    {/* Header Row: Toggle & Selector */}
                                    <div className="flex items-center gap-2 w-full">
                                        <div className="flex bg-slate-900 rounded-md p-0.5 border border-slate-700 shrink-0">
                                            <button
                                                onClick={() => setViewMode('Associate')}
                                                className={`text-[10px] px-2 py-1 rounded-sm transition-colors ${viewMode === 'Associate' ? 'bg-pink-600 text-white font-medium' : 'text-slate-400 hover:text-slate-300'}`}
                                            >
                                                Associate
                                            </button>
                                            <button
                                                onClick={() => setViewMode('Partner')}
                                                className={`text-[10px] px-2 py-1 rounded-sm transition-colors ${viewMode === 'Partner' ? 'bg-pink-600 text-white font-medium' : 'text-slate-400 hover:text-slate-300'}`}
                                            >
                                                Partner
                                            </button>
                                        </div>

                                        {/* Simplified Partner/Associate Selector */}
                                        <div className="flex-1 min-w-0">
                                            <select
                                                value={selectedAssociateId}
                                                onChange={(e) => setSelectedAssociateId(e.target.value)}
                                                className="h-8 w-full rounded-md border border-slate-700 bg-slate-900 px-3 py-1 text-xs shadow-sm focus:outline-none focus:ring-1 focus:ring-pink-500 text-slate-200 truncate"
                                            >
                                                <option value="" disabled>Select {viewMode}...</option>

                                                <optgroup label="People">
                                                    {characters
                                                        .filter(c => {
                                                            if (viewMode === 'Associate') return c.roles.includes(CharacterRole.ASSOCIATE);
                                                            if (viewMode === 'Partner') return c.roles.includes(CharacterRole.PARTNER);
                                                            return false;
                                                        })
                                                        .map(c => (
                                                            <option key={c.id} value={c.id}>
                                                                {c.name}
                                                            </option>
                                                        ))}
                                                </optgroup>

                                                <optgroup label="Businesses">
                                                    {businesses.map(b => (
                                                        <option key={b.id} value={b.id}>
                                                            {b.name}
                                                        </option>
                                                    ))}
                                                </optgroup>
                                            </select>
                                        </div>
                                    </div>

                                    {/* Contract Selector (Specific to Associate) */}
                                    {selectedAssociateId && (
                                        <div className="flex items-center gap-2 w-full animate-in fade-in slide-in-from-top-1 duration-200">
                                            <div className="w-[68px] text-[10px] text-pink-300 font-medium text-right shrink-0">
                                                Agreement:
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <select
                                                    value={selectedContractId}
                                                    onChange={(e) => setSelectedContractId(e.target.value)}
                                                    className="h-7 w-full rounded-md border border-pink-500/30 bg-pink-950/30 px-2 text-[10px] shadow-sm focus:outline-none focus:ring-1 focus:ring-pink-500 text-pink-100 truncate"
                                                >
                                                    <option value="" disabled>Select Active Contract...</option>
                                                    {contracts
                                                        .filter(c => ['Active', 'ACTIVE', 'active'].includes(c.status))
                                                        .map(c => (
                                                            <option key={c.id} value={c.id}>
                                                                {c.name}
                                                            </option>
                                                        ))}
                                                </select>
                                            </div>
                                        </div>
                                    )}
                                </div>

                                {/* Quick Entry Form - Simplified */}
                                <div className={`bg-slate-900/50 p-4 rounded-lg border border-slate-800 space-y-3 ${!selectedAssociateId ? 'opacity-50 pointer-events-none' : ''}`}>
                                    <div className="flex gap-2">
                                        <NumericInput
                                            value={parseFloat(quickAmount) || 0}
                                            onChange={(val) => setQuickAmount(val.toString())}
                                            placeholder="Amount (₡)"
                                            className="w-32 bg-slate-950 border-slate-700"
                                        />
                                        <Input
                                            value={quickCat}
                                            onChange={(e) => setQuickCat(e.target.value)}
                                            placeholder="Category (e.g. Jewelry)"
                                            className="flex-1 bg-slate-950 border-slate-700"
                                        />
                                        <Button
                                            onClick={handleAddAssociateEntry}
                                            className="bg-pink-600 hover:bg-pink-700 text-white shrink-0"
                                            disabled={!selectedAssociateId || !quickAmount}
                                        >
                                            Add
                                        </Button>
                                    </div>
                                </div>

                                {/* List of Associate Entries */}
                                <div className="space-y-2 max-h-[150px] overflow-y-auto">
                                    {associateEntries.map(entry => (
                                        <div key={entry.id} className="flex justify-between items-center text-sm p-2 bg-slate-800 rounded border border-slate-700/50">
                                            <div className="flex flex-col">
                                                <span className="font-medium text-pink-200">{entry.category}</span>
                                            </div>
                                            <div className="flex items-center gap-4">
                                                <span className="font-mono text-pink-300">₡{entry.amount.toLocaleString()}</span>
                                                <Button variant="ghost" size="icon" className="h-6 w-6 text-red-400" onClick={() => handleRemoveAssociateEntry(entry.id)}>
                                                    <Trash2 className="h-3 w-3" />
                                                </Button>
                                            </div>
                                        </div>
                                    ))}
                                    {associateEntries.length === 0 && selectedAssociateId && (
                                        <div className="text-center text-xs text-muted-foreground py-4 italic">No entries yet.</div>
                                    )}
                                </div>

                            </CardContent>
                        </Card>
                    </div>
                </div >

                {/* SECTION C: SETTLEMENT MATRIX (The Excel View) - Right Column */}
                < div className="col-span-12 lg:col-span-5 flex flex-col min-h-0 bg-white dark:bg-slate-800 rounded-xl border shadow-sm overflow-hidden" >

                    {/* Matrix Header */}
                    <div className="grid grid-cols-12 gap-2 p-3 bg-slate-900 border-b border-slate-700 text-[10px] font-semibold text-slate-400 uppercase tracking-wider text-center">
                        <div className="col-span-3 text-left pl-2">Category</div>
                        <div className="col-span-2 text-right">Total ($)</div>
                        <div className="col-span-2 text-right">Total (₡)</div>
                        <div className="col-span-2 text-right text-indigo-400">My Share ($)</div>
                        <div className="col-span-3 text-right text-pink-400">Assoc. Share ($)</div>
                    </div>

                    {/* Matrix Body (Scrollable) */}
                    <div className="flex-1 overflow-y-auto bg-slate-900/30">
                        {/* Akiles Section */}
                        {
                            salesDistributionMatrix.akiles.length > 0 && (
                                <div className="p-2 bg-indigo-950/20 border-b border-indigo-500/10">
                                    <div className="text-[10px] font-bold text-indigo-400 mb-2 px-2 uppercase tracking-wide">AKILES PRODUCTS</div>
                                    {salesDistributionMatrix.akiles.map(row => (
                                        <div key={row.id} className="grid grid-cols-12 gap-2 p-2 text-xs border-b border-indigo-500/10 last:border-0 hover:bg-white/5 transition-colors items-center">
                                            <div className="col-span-3 font-medium text-indigo-100 truncate" title={row.label}>{row.label}</div>
                                            <div className="col-span-2 text-right font-mono text-slate-300">${row.totalDollars.toLocaleString()}</div>
                                            <div className="col-span-2 text-right font-mono text-slate-400">₡{row.totalColones.toLocaleString()}</div>
                                            <div className="col-span-2 text-right text-indigo-300 font-bold">${(row.ownerAmount / exchangeRate).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
                                            <div className="col-span-3 text-right text-pink-300/70">${(row.commissionAmount / exchangeRate).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
                                        </div>
                                    ))}
                                </div>
                            )
                        }

                        {/* Associate Section */}
                        {
                            salesDistributionMatrix.associate.length > 0 && (
                                <div className="p-2 bg-pink-950/20">
                                    <div className="text-[10px] font-bold text-pink-400 mb-2 px-2 mt-2 uppercase tracking-wide">
                                        {selectedAssociateId
                                            ? `ASSOCIATE (${getAssociateName(selectedAssociateId).toUpperCase()})`
                                            : 'ASSOCIATE SALES'}
                                    </div>
                                    {salesDistributionMatrix.associate.map(row => (
                                        <div key={row.id} className="grid grid-cols-12 gap-2 p-2 text-xs border-b border-pink-500/10 last:border-0 hover:bg-white/5 transition-colors items-center">
                                            <div className="col-span-3 font-medium text-pink-100 truncate" title={row.label}>{row.label}</div>
                                            <div className="col-span-2 text-right font-mono text-slate-300">${row.totalDollars.toLocaleString()}</div>
                                            <div className="col-span-2 text-right font-mono text-slate-400">₡{row.totalColones.toLocaleString()}</div>
                                            <div className="col-span-2 text-right text-indigo-300/70">${(row.ownerAmount / exchangeRate).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
                                            <div className="col-span-3 text-right text-pink-300 font-bold">${(row.commissionAmount / exchangeRate).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
                                        </div>
                                    ))}
                                </div>
                            )
                        }
                    </div>

                    {/* Summary Footer */}
                    <div className="p-4 bg-slate-950 border-t border-slate-800 space-y-4">
                        <div className="text-xs font-bold text-slate-400 uppercase flex items-center gap-2">
                            <DollarSign className="h-3 w-3" /> Sales Distribution
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            {/* My Payout */}
                            <div className="p-3 bg-slate-900 rounded-lg border border-indigo-500/20 shadow-sm">
                                <div className="flex items-center gap-2 mb-2">
                                    <div className="h-6 w-6 rounded-full bg-indigo-500/20 flex items-center justify-center text-indigo-400 font-bold text-[10px]">A</div>
                                    <div>
                                        <div className="text-xs font-bold text-indigo-100">Akiles Net</div>
                                        <div className="text-[10px] text-slate-500">Payout to Me</div>
                                    </div>
                                </div>
                                <div className="space-y-1 text-xs bg-indigo-950/10 p-2 rounded border border-indigo-500/10">
                                    <div className="flex justify-between text-muted-foreground"><span>Sales:</span> <span>₡{salesDistributionMatrix.akiles.reduce((s, r) => s + r.ownerAmount, 0).toLocaleString()}</span></div>
                                    <div className="flex justify-between text-muted-foreground"><span>Comm:</span> <span>+₡{totals.myCommissions.toLocaleString()}</span></div>
                                    <div className="flex justify-between text-red-400"><span>Booth:</span> <span>-₡{(Math.abs(boothCost) / 2).toLocaleString()}</span></div>
                                    <div className="border-t pt-1 mt-1 flex justify-between font-bold text-sm text-indigo-600">
                                        <span>Total:</span> <span>₡{totals.myNet.toLocaleString()}</span>
                                    </div>
                                </div>
                            </div>

                            {/* Associate Payout */}
                            <div className="p-3 bg-white dark:bg-slate-800 rounded-lg border border-pink-100 shadow-sm">
                                <div className="flex items-center gap-2 mb-2">
                                    <div className="h-6 w-6 rounded-full bg-pink-100 flex items-center justify-center text-pink-700 font-bold text-[10px]">
                                        {selectedAssociateId ? characters.find(c => c.id === selectedAssociateId)?.name.substring(0, 1).toUpperCase() : 'A'}
                                    </div>
                                    <div>
                                        <div className="text-xs font-bold">
                                            {selectedAssociateId ? `${characters.find(c => c.id === selectedAssociateId)?.name} Net` : 'Associate Net'}
                                        </div>
                                        <div className="text-[10px] text-muted-foreground">Payout to Associate</div>
                                    </div>
                                </div>
                                <div className="space-y-1 text-xs bg-slate-50 p-2 rounded">
                                    <div className="flex justify-between text-muted-foreground"><span>Sales:</span> <span>₡{salesDistributionMatrix.associate.reduce((s, r) => s + r.commissionAmount, 0).toLocaleString()}</span></div>
                                    <div className="flex justify-between text-muted-foreground"><span>Comm:</span> <span>+₡{totals.associateCommissions.toLocaleString()}</span></div>
                                    <div className="flex justify-between text-red-400"><span>Booth:</span> <span>-₡{(Math.abs(boothCost) / 2).toLocaleString()}</span></div>
                                    <div className="border-t pt-1 mt-1 flex justify-between font-bold text-sm text-pink-600">
                                        <span>Total:</span> <span>₡{totals.associateNet.toLocaleString()}</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div >
                </div >
            </div >

            <div className="p-4 border-t bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-800 flex justify-end gap-2">
                <Button variant="ghost" onClick={onCancel} disabled={isSaving}>Cancel</Button>
                <Button onClick={handleSave} disabled={isSaving || isSaving} className="bg-indigo-600 hover:bg-indigo-700">
                    {isSaving ? 'Processing...' : 'Confirm Booth Sales'}
                </Button>
            </div>

            {/* Item Selector Sub-Modal */}
            <SaleItemsSubModal
                open={showItemPicker}
                onOpenChange={setShowItemPicker}
                onSave={(selectedItems) => {
                    // Convert SaleItemLine from submodal to ItemSaleLine for our lines
                    const newLines: SaleLine[] = selectedItems.map(saleItem => ({
                        lineId: uuid(), // Generate new ID or keep existing? Submodal generates new IDs, we accept them.
                        // Actually, submodal returns SaleItemLine with an ID, but we usually regen on save or we can reuse.
                        // Let's create new ItemSaleLines.
                        kind: 'item',
                        itemId: saleItem.itemId,
                        unitPrice: saleItem.unitPrice,
                        quantity: saleItem.quantity,
                        description: saleItem.itemName,
                        metadata: {
                            usdExpression: saleItem.usdExpression,
                            crcExpression: saleItem.crcExpression
                        }
                    } as ItemSaleLine));

                    // Replace ALL item lines with the new selection (since modal manages the full list)
                    // Keep non-item lines (like bundles if any, though we filtered them before? No, bundles are separate)
                    // The logic here replaces the previous "add to list" logic.
                    // User Edit Flow: "Open modal -> See current items -> Edit/Add/Remove -> Save -> Replace list".

                    const nonItemLines = lines.filter(l => l.kind !== 'item');
                    setLines([...nonItemLines, ...newLines]);
                    setShowItemPicker(false);
                }}
                initialItems={lines.filter(l => l.kind === 'item').map(l => {
                    const il = l as ItemSaleLine;
                    const item = items.find(i => i.id === il.itemId);
                    return {
                        id: il.lineId,
                        itemId: il.itemId,
                        itemName: item ? item.name : 'Unknown Item',
                        quantity: il.quantity,
                        unitPrice: il.unitPrice || 0,
                        total: (il.quantity || 0) * (il.unitPrice || 0),
                        siteId: siteId,
                        usdExpression: l.metadata?.usdExpression,
                        crcExpression: l.metadata?.crcExpression
                    };
                })}
                defaultSiteId={siteId}
                exchangeRate={exchangeRate}
            />
        </div >
    );
}
