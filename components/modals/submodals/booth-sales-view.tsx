'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
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
    Network,
    CalendarIcon
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

    // Auto-select active contract when Associate changes
    useEffect(() => {
        if (!selectedAssociateId) {
            setSelectedContractId('');
            return;
        }

        // 1. Try Strict Match (ID matches Principal or Counterparty)
        // We look for any ACTIVE contract involving this entity
        let match = contracts.find(c =>
            c.status === ContractStatus.ACTIVE &&
            (c.counterpartyBusinessId === selectedAssociateId || c.principalBusinessId === selectedAssociateId)
        );

        // 2. Try Fuzzy Name Match (Fallback if strict ID fails)
        if (!match) {
            const associate = characters.find(char => char.id === selectedAssociateId);
            if (associate) {
                // Simple fuzzy: check if Contract Name contains the Associate's first name
                const firstName = associate.name.split(' ')[0].toLowerCase();
                match = contracts.find(c =>
                    c.status === ContractStatus.ACTIVE &&
                    c.name.toLowerCase().includes(firstName)
                );
            }
        }

        if (match) {
            setSelectedContractId(match.id);
        } else {
            // No contract found for this associate -> Clear selection (Default/No Contract)
            setSelectedContractId('');
        }
    }, [selectedAssociateId, contracts, characters]);
    // ============================================================================

    const myItems = useMemo(() =>
        lines.filter(l => (l.kind === 'item' || l.kind === 'bundle')) as (ItemSaleLine | BundleSaleLine)[],
        [lines]);

    // Unified logic to find the single active contract
    const activeContract = useMemo(() => {
        if (!selectedContractId) return null;
        return contracts.find(c => c.id === selectedContractId);
    }, [contracts, selectedContractId]);

    const totals = useMemo(() => {
        let grossSales = 0;
        let akilesNet = 0;
        let associateNet = 0;

        // 1. Calculate Baselines (Respecting Currency)
        // Assumption: All Inventory Items (Products & Bundles) are priced in USD for Booth Sales.
        const myItemsTotalUSD = myItems.reduce((s, i) => s + ((i.unitPrice || 0) * (i.quantity || 0)), 0);

        // Normalize my sales to Colones for calculation (Standardizing on CRC for Booth Sales Ledger)
        const myItemsTotalValue_CRC = myItemsTotalUSD * exchangeRate;

        // Associate Entries are entered in Colones (Quick Entry)
        const assocItemsTotal_CRC = associateEntries.reduce((sum, e) => sum + e.amount, 0);

        // 2. Default Shares (No Contract Defaults = 100% Me, 0% Assoc, Me pays Costs)
        let shareOfMyItems_Me = 1.0;
        let shareOfAssocItems_Me = 0.0;
        let shareOfExpenses_Me = 1.0;

        // 3. Apply Contract Clauses
        if (activeContract) {
            // A. Sales Commission
            const commClause = activeContract.clauses.find(c => c.type === ContractClauseType.SALES_COMMISSION);
            if (commClause) {
                shareOfAssocItems_Me = commClause.companyShare;
            }

            // B. Expense Sharing
            const expenseClause = activeContract.clauses.find(c => c.type === ContractClauseType.EXPENSE_SHARING);
            if (expenseClause) {
                shareOfExpenses_Me = expenseClause.companyShare;
            }
        }

        // 4. Calculate Values (In CRC)
        const revenueMyItems_Me = myItemsTotalValue_CRC * shareOfMyItems_Me;
        const revenueMyItems_Assoc = myItemsTotalValue_CRC * (1 - shareOfMyItems_Me);

        const revenueAssocItems_Me = assocItemsTotal_CRC * shareOfAssocItems_Me; // My Commission
        const revenueAssocItems_Assoc = assocItemsTotal_CRC * (1 - shareOfAssocItems_Me);

        const cost_Me = boothCost * shareOfExpenses_Me;
        const cost_Assoc = boothCost - cost_Me;

        // 5. Final Calculations
        grossSales = myItemsTotalValue_CRC + assocItemsTotal_CRC;

        // Akiles Net (CRC)
        akilesNet = revenueMyItems_Me + revenueAssocItems_Me - cost_Me;

        // Associate Net (CRC)
        associateNet = revenueAssocItems_Assoc + revenueMyItems_Assoc - cost_Assoc;

        return {
            grossSales,
            myNet: akilesNet,
            associateNet,
            myCommissions: revenueAssocItems_Me,
            associateCommissions: revenueAssocItems_Assoc,
            breakdown: {
                principalSharePct_Me: shareOfMyItems_Me * 100,
                principalSharePct_Associate: (1 - shareOfMyItems_Me) * 100,
                associateSharePct_Me: shareOfAssocItems_Me * 100,
                associateSharePct_Associate: (1 - shareOfAssocItems_Me) * 100,
                mySales: myItemsTotalValue_CRC,
                assocSales: assocItemsTotal_CRC,
                costMe: cost_Me,
                costAssoc: cost_Assoc
            }
        };

    }, [myItems, associateEntries, boothCost, activeContract, exchangeRate]);

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
                    totalColones: 0,
                    totalDollars: total, // All Inventory treated as USD
                    totalBitcoin: 0,
                    totalCard: 0,
                    commissionAmount: 0,
                    ownerAmount: 0
                };
            } else {
                akilesRows[category].totalDollars += total;
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

            // Optional fields defaultsthe input
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

            {/* Header / Setup Toolbar */}
            <div className="flex items-center gap-4 bg-white dark:bg-slate-800 p-2 rounded-lg shadow-sm border mb-4">

                {/* Date */}
                <div className="flex items-center gap-2">
                    <span className="text-xs font-medium text-muted-foreground">Date:</span>
                    <Popover>
                        <PopoverTrigger asChild>
                            <Button variant="outline" size="sm" className="h-8 justify-start text-left font-normal w-32">
                                <CalendarIcon className="mr-2 h-3 w-3" />
                                {saleDate ? format(saleDate, "dd-MM-yyyy") : <span>Pick a date</span>}
                            </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="start">
                            <Calendar mode="single" selected={saleDate} onSelect={(d) => d && setSaleDate(d)} initialFocus />
                        </PopoverContent>
                    </Popover>
                </div>

                {/* Rate */}
                <div className="flex items-center gap-2 bg-slate-100 dark:bg-slate-900 px-3 py-1.5 rounded-md border border-slate-700/50">
                    <span className="text-xs font-bold text-slate-500">$/₡:</span>
                    <span className="text-xs font-medium text-slate-400">{exchangeRate}</span>
                </div>

                {/* Booth Cost */}
                <div className="flex items-center gap-2">
                    <span className="text-xs font-medium text-muted-foreground">Booth Cost:</span>
                    <NumericInput
                        value={boothCost}
                        onChange={setBoothCost}
                        className="h-8 w-24 border-red-500/30 text-red-500 font-medium text-xs bg-slate-900/50"
                        placeholder="0"
                    />
                </div>

                {/* Site */}
                <div className="flex items-center gap-2">
                    <span className="text-xs font-medium text-muted-foreground">Site:</span>
                    <SearchableSelect
                        value={siteId}
                        onValueChange={setSiteId}
                        options={createSiteOptionsWithCategories(sites)}
                        autoGroupByCategory
                        placeholder="Select site..."
                        className="h-8 w-40"
                    />
                </div>

                <div className="w-px h-6 bg-slate-200 dark:bg-slate-700 mx-2 ml-auto" />

                {/* Associate / Partner Toggle & Selector (Moved to Header) */}
                <div className="flex items-center gap-2">
                    {/* Role Toggle */}
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

                    {/* Entity Selector */}
                    <div className="w-48">
                        <div className="relative">
                            <select
                                value={selectedAssociateId}
                                onChange={(e) => setSelectedAssociateId(e.target.value)}
                                className={cn(
                                    "h-8 w-full rounded-md border bg-slate-900 px-3 py-1 text-xs shadow-sm focus:outline-none focus:ring-1 focus:ring-pink-500 truncate pr-8 appearance-none",
                                    selectedAssociateId ? "border-pink-500/50 text-pink-200" : "border-slate-700 text-slate-400"
                                )}
                            >
                                <option value="">Select {viewMode}...</option>
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

                            {/* Clear Button (Only if selected) */}
                            {selectedAssociateId && (
                                <button
                                    onClick={() => setSelectedAssociateId('')}
                                    className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-500 hover:text-red-400"
                                >
                                    <Trash2 className="h-3 w-3" />
                                </button>
                            )}
                        </div>
                    </div>
                </div>

            </div>

            <div className="grid grid-cols-12 gap-6 flex-1 min-h-0">

                {/* SECTION B: SPLIT VIEW (My Inventory vs. Partner Sales) */}
                <div className="col-span-12 lg:col-span-7 flex flex-col gap-4 min-h-0 overflow-y-auto pr-2">
                    <div className="flex flex-col gap-4">
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

                        {/* Card 2: Partner / Associate (Only if selected) */}
                        {selectedAssociateId && (
                            <Card className="border-pink-500/20 bg-pink-950/20">
                                <CardContent className="p-4 space-y-3">
                                    <div className="flex flex-col gap-2">
                                        <div className="flex justify-between items-center">
                                            <div className="text-sm font-bold text-pink-400 flex items-center gap-2">
                                                <User className="h-4 w-4" />
                                                {getAssociateName(selectedAssociateId)}
                                                <span className="text-[10px] font-normal text-pink-500/70">({viewMode})</span>
                                            </div>
                                        </div>

                                        {/* Contract Selector */}
                                        <div className="flex items-center gap-2 w-full">
                                            <div className="w-auto text-[10px] text-pink-300 font-medium shrink-0">
                                                Agreement:
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <select
                                                    value={selectedContractId}
                                                    onChange={(e) => setSelectedContractId(e.target.value)}
                                                    className="h-6 w-full rounded border border-pink-500/30 bg-pink-950/30 px-2 text-[10px] shadow-sm focus:outline-none focus:ring-1 focus:ring-pink-500 text-pink-100 truncate"
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
                                    </div>

                                    {/* Quick Entry Form */}
                                    <div className="bg-slate-900/50 p-3 rounded-lg border border-slate-800 space-y-2">
                                        <div className="flex gap-2">
                                            <NumericInput
                                                value={parseFloat(quickAmount) || 0}
                                                onChange={(val) => setQuickAmount(val.toString())}
                                                placeholder="0 ₡"
                                                className="w-24 bg-slate-950 border-slate-700 h-8 text-xs"
                                            />
                                            <Input
                                                value={quickCat}
                                                onChange={(e) => setQuickCat(e.target.value)}
                                                placeholder="Products"
                                                className="flex-1 bg-slate-950 border-slate-700 h-8 text-xs"
                                            />
                                            <Button
                                                onClick={handleAddAssociateEntry}
                                                className="bg-pink-600 hover:bg-pink-700 text-white shrink-0 h-8 text-xs"
                                                disabled={!quickAmount}
                                                size="sm"
                                            >
                                                Add
                                            </Button>
                                        </div>
                                    </div>

                                    {/* List */}
                                    <div className="space-y-1 max-h-[150px] overflow-y-auto">
                                        {associateEntries.map(entry => (
                                            <div key={entry.id} className="flex justify-between items-center text-xs p-2 bg-slate-800 rounded border border-slate-700/50">
                                                <span className="font-medium text-pink-200">{entry.category}</span>
                                                <div className="flex items-center gap-3">
                                                    <span className="font-mono text-pink-300">₡{entry.amount.toLocaleString()}</span>
                                                    <Button variant="ghost" size="icon" className="h-5 w-5 text-red-400 hover:bg-slate-700" onClick={() => handleRemoveAssociateEntry(entry.id)}>
                                                        <Trash2 className="h-3 w-3" />
                                                    </Button>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </CardContent>
                            </Card>
                        )}
                    </div>
                </div >

                {/* SECTION C: SETTLEMENT MATRIX (The Excel View) - Right Column */}
                <div className="col-span-12 lg:col-span-5 flex flex-col min-h-0 bg-white dark:bg-slate-800 rounded-xl border shadow-sm overflow-hidden">

                    {/* Matrix Header */}
                    <div className="grid grid-cols-12 gap-2 p-3 bg-slate-900 border-b border-slate-700 text-[10px] font-semibold text-slate-400 uppercase tracking-wider text-center">
                        <div className={`text-left pl-2 ${selectedAssociateId ? 'col-span-3' : 'col-span-6'}`}>Category</div>
                        <div className={`text-right ${selectedAssociateId ? 'col-span-2' : 'col-span-3'}`}>Total ($)</div>
                        <div className={`text-right ${selectedAssociateId ? 'col-span-2' : 'col-span-3'}`}>Total (₡)</div>
                        {selectedAssociateId && (
                            <>
                                <div className="col-span-2 text-right text-indigo-400">My Share ($)</div>
                                <div className="col-span-3 text-right text-pink-400">Assoc. Share ($)</div>
                            </>
                        )}
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
                                            <div className={`font-medium text-indigo-100 truncate ${selectedAssociateId ? 'col-span-3' : 'col-span-6'}`} title={row.label}>{row.label}</div>
                                            <div className={`text-right font-mono text-slate-300 ${selectedAssociateId ? 'col-span-2' : 'col-span-3'}`}>${row.totalDollars.toLocaleString()}</div>
                                            <div className={`text-right font-mono text-slate-400 ${selectedAssociateId ? 'col-span-2' : 'col-span-3'}`}>₡{row.totalColones.toLocaleString()}</div>
                                            {selectedAssociateId && (
                                                <>
                                                    <div className="col-span-2 text-right text-indigo-300 font-bold">${(row.ownerAmount / exchangeRate).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
                                                    <div className="col-span-3 text-right text-pink-300/70">${(row.commissionAmount / exchangeRate).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
                                                </>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            )
                        }

                        {/* Associate Section (Only if selected) */}
                        {
                            selectedAssociateId && salesDistributionMatrix.associate.length > 0 && (
                                <div className="p-2 bg-pink-950/20">
                                    <div className="text-[10px] font-bold text-pink-400 mb-2 px-2 mt-2 uppercase tracking-wide">
                                        {`ASSOCIATE (${getAssociateName(selectedAssociateId).toUpperCase()})`}
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
                        <div className="flex items-center justify-end">
                            {/* Title Lozenge (Right Aligned) */}
                            <div className="flex items-center gap-2 px-3 py-1.5 bg-indigo-500/10 rounded-md border border-indigo-500/20">
                                <Store className="h-4 w-4 text-indigo-500" />
                                <span className="text-sm font-bold text-indigo-500 whitespace-nowrap">Booth Sales</span>
                            </div>
                        </div>

                        <div className={`grid gap-4 ${selectedAssociateId ? 'grid-cols-2' : 'grid-cols-1'}`}>
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
                                    <div className="flex justify-between text-slate-400"><span>Sales:</span> <span>₡{salesDistributionMatrix.akiles.reduce((s, r) => s + r.ownerAmount, 0).toLocaleString()}</span></div>
                                    {selectedAssociateId && (
                                        <div className="flex justify-between text-slate-400"><span>Comm:</span> <span>+₡{totals.myCommissions.toLocaleString()}</span></div>
                                    )}
                                    <div className="flex justify-between text-red-400/70"><span>Booth:</span> <span>-₡{totals.breakdown.costMe.toLocaleString()}</span></div>

                                    <div className="border-t border-indigo-500/20 pt-2 mt-2 space-y-1">
                                        <div className="flex justify-between font-bold text-sm text-indigo-400">
                                            <span>Total ($):</span>
                                            <span>${(totals.myNet / exchangeRate).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                                        </div>
                                        <div className="flex justify-between text-xs text-indigo-400/50">
                                            <span>Total (₡):</span>
                                            <span>₡{totals.myNet.toLocaleString()}</span>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Associate Payout (Conditional) */}
                            {selectedAssociateId && (
                                <div className="p-3 bg-slate-900 rounded-lg border border-pink-500/20 shadow-sm">
                                    <div className="flex items-center gap-2 mb-2">
                                        <div className="h-6 w-6 rounded-full bg-pink-500/20 flex items-center justify-center text-pink-400 font-bold text-[10px]">
                                            {selectedAssociateId ? getAssociateName(selectedAssociateId).substring(0, 1).toUpperCase() : 'A'}
                                        </div>
                                        <div>
                                            <div className="text-xs font-bold text-pink-100">
                                                {selectedAssociateId ? `${getAssociateName(selectedAssociateId)} Net` : 'Associate Net'}
                                            </div>
                                            <div className="text-[10px] text-slate-500">Payout to Associate</div>
                                        </div>
                                    </div>
                                    <div className="space-y-1 text-xs bg-pink-950/10 p-2 rounded border border-pink-500/10">
                                        <div className="flex justify-between text-slate-400"><span>Sales:</span> <span>₡{salesDistributionMatrix.associate.reduce((s, r) => s + r.ownerAmount, 0).toLocaleString()}</span></div>
                                        <div className="flex justify-between text-slate-400"><span>Comm:</span> <span>+₡{totals.associateCommissions.toLocaleString()}</span></div>
                                        <div className="flex justify-between text-red-400/70"><span>Booth:</span> <span>-₡{totals.breakdown.costAssoc.toLocaleString()}</span></div>

                                        <div className="border-t border-pink-500/20 pt-2 mt-2 space-y-1">
                                            <div className="flex justify-between font-bold text-sm text-pink-400">
                                                <span>Total ($):</span>
                                                <span>${(totals.associateNet / exchangeRate).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                                            </div>
                                            <div className="flex justify-between text-xs text-pink-400/50">
                                                <span>Total (₡):</span>
                                                <span>₡{totals.associateNet.toLocaleString()}</span>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </div>

            </div>

            <div className="p-4 border-t bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-800 flex justify-end gap-2">
                <Button variant="ghost" onClick={onCancel} disabled={isSaving}>Cancel</Button>
                <Button onClick={handleSave} disabled={isSaving} className="bg-indigo-600 hover:bg-indigo-700">
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
