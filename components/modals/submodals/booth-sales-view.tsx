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
    ContractClauseType
} from '@/types/enums';
import { SaleLine, Item, Site, Character, ServiceLine, ItemSaleLine, BundleSaleLine, Business, Contract } from '@/types/entities';
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
    onSave: () => void;
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
    const [boothCost, setBoothCost] = useState(0); // Default to 0 as requested
    const exchangeRate = DEFAULT_CURRENCY_EXCHANGE_RATES.colonesToUsd; // 500

    // State for Principal (Me)
    const [selectedContractId_Principal, setSelectedContractId_Principal] = useState<string>('');

    // State for Associate (Them)
    const [selectedAssociateId, setSelectedAssociateId] = useState<string>(''); // Character ID
    const [selectedContractId_Associate, setSelectedContractId_Associate] = useState<string>('');

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
        const defaultPrincipalContract = contracts.find(c => c.status === ContractStatus.ACTIVE); // Simplified
        if (defaultPrincipalContract && !selectedContractId_Principal) {
            setSelectedContractId_Principal(defaultPrincipalContract.id);
        }
    }, [contracts, selectedContractId_Principal]);

    // Load Default Associate (One time)
    useEffect(() => {
        // Mocking "Maria" as default if she exists
        if (!selectedAssociateId && characters.length > 0) {
            const maria = characters.find(c => c.name.toLowerCase().includes('maria') || c.name.includes('O2'));
            if (maria) setSelectedAssociateId(maria.id);
        }
    }, [characters, selectedAssociateId]);


    // 2. Logic & Calculations (The Sales Distribution Engine)
    // ============================================================================

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
                category = item ? item.type : 'Other';
                if (item?.type === ItemType.STICKER) category = 'Stickers';
                if (item?.type === ItemType.PRINT) category = 'Prints';
                if (item?.type === ItemType.ARTWORK) category = 'Artworks';
                if (item?.type === ItemType.MERCH) category = 'Merch';
            } else if (line.kind === 'bundle') {
                const bundleLine = line as BundleSaleLine;
                total = (bundleLine.quantity || 0) * (bundleLine.unitPrice || 0);
                category = 'Bundles';
            }

            if (!akilesRows[category]) {
                akilesRows[category] = {
                    id: category,
                    label: category,
                    isAssociate: false,
                    totalColones: total, // Assumption: Feria sales usually in Colones
                    totalDollars: 0,
                    totalBitcoin: 0,
                    totalCard: 0,
                    commissionAmount: 0,
                    ownerAmount: 0
                };
            } else {
                akilesRows[category].totalColones += total;
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

        // Calculate Splits using Contract Logic or Defaults
        // Akiles Rows (Principal Products)
        Object.values(akilesRows).forEach(row => {
            const totalValue = row.totalColones + (row.totalDollars * exchangeRate);

            // Default: 100% Owner (Me), 0% Associate
            let pShare = 1.0;
            let aShare = 0.0;

            const contract = contracts.find(c => c.id === selectedContractId_Principal);

            if (contract) {
                // TRY NEW SYSTEM (Clauses)
                if (contract.clauses && Array.isArray(contract.clauses)) {
                    const clause = contract.clauses.find(c =>
                        c.type === ContractClauseType.SALES_COMMISSION && c.itemCategory === row.label
                    ) || contract.clauses.find(c =>
                        c.type === ContractClauseType.SALES_COMMISSION && !c.itemCategory
                    );

                    if (clause) {
                        pShare = clause.companyShare;
                        aShare = clause.associateShare;
                    }
                }
                // FALLBACK TO LEGACY SYSTEM (Terms)
                else if ((contract as any).terms?.principalProducts) {
                    const terms = (contract as any).terms.principalProducts;
                    pShare = terms.principalShare;
                    aShare = terms.associateShare;
                }
            }

            row.ownerAmount = totalValue * pShare;
            row.commissionAmount = totalValue * aShare;
        });

        // Associate Rows (Associate Products)
        Object.values(associateRows).forEach(row => {
            const totalValue = row.totalColones + (row.totalDollars * exchangeRate);

            // Default: 25% Owner (Me/Service Fee), 75% Associate (Them)
            let pShare = 0.25;
            let aShare = 0.75;

            const contract = contracts.find(c => c.id === selectedContractId_Associate);

            if (contract) {
                // TRY NEW SYSTEM (Clauses)
                if (contract.clauses && Array.isArray(contract.clauses)) {
                    const clause = contract.clauses.find(c =>
                        c.type === ContractClauseType.SALES_COMMISSION && c.itemCategory === row.label
                    ) || contract.clauses.find(c =>
                        c.type === ContractClauseType.SALES_COMMISSION && !c.itemCategory
                    );

                    if (clause) {
                        pShare = clause.companyShare;   // Our Service Fee
                        aShare = clause.associateShare; // Their Take
                    }
                }
                // FALLBACK TO LEGACY SYSTEM (Terms)
                else if ((contract as any).terms?.associateProducts) {
                    const terms = (contract as any).terms.associateProducts;
                    pShare = terms.principalShare;
                    aShare = terms.associateShare;
                }
            }

            row.ownerAmount = totalValue * pShare;
            row.commissionAmount = totalValue * aShare;
        });

        return {
            akiles: Object.values(akilesRows),
            associate: Object.values(associateRows)
        };
    }, [lines, associateEntries, items, exchangeRate, selectedContractId_Principal, selectedContractId_Associate, contracts]);

    // Totals
    const totals = useMemo(() => {
        const totalSales =
            salesDistributionMatrix.akiles.reduce((s, r) => s + r.totalColones + (r.totalDollars * exchangeRate), 0) +
            salesDistributionMatrix.associate.reduce((s, r) => s + r.totalColones + (r.totalDollars * exchangeRate), 0);

        // Akiles (Me)
        // My Sales Share + My Commission from Associate Sales
        const myNet = salesDistributionMatrix.akiles.reduce((sum, r) => sum + r.ownerAmount, 0) +
            salesDistributionMatrix.associate.reduce((sum, r) => sum + r.ownerAmount, 0);

        const myShareOfBooth = boothCost / 2; // TODO: Contract-based expense sharing
        const finalMyNet = myNet - myShareOfBooth;

        // Associate (Selected)
        // Associate Commission from My Sales + Associate Share from Their Sales
        const associateNet = salesDistributionMatrix.akiles.reduce((sum, r) => sum + r.commissionAmount, 0) +
            salesDistributionMatrix.associate.reduce((sum, r) => sum + r.commissionAmount, 0);

        const myCommissions = salesDistributionMatrix.associate.reduce((sum, r) => sum + r.ownerAmount, 0);
        const associateCommissions = salesDistributionMatrix.akiles.reduce((sum, r) => sum + r.commissionAmount, 0);

        const associateShareOfBooth = boothCost / 2;
        const finalAssociateNet = associateNet - associateShareOfBooth;

        return {
            totalSales,
            myNet: finalMyNet,
            associateNet: finalAssociateNet,
            myCommissions: myCommissions,
            associateCommissions: associateCommissions
        };
    }, [salesDistributionMatrix, boothCost, exchangeRate]);


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
        // 1. Convert Associate Entries to Service Lines (if not already done)
        const associateServiceLines: ServiceLine[] = associateEntries.map(entry => ({
            lineId: uuid(),
            kind: 'service',
            station: 'Associate Sales' as Station,
            revenue: entry.amount,
            description: `[Associate: ${entry.associateId}] ${entry.category} - ${entry.description}`,
            taxAmount: 0,
            createTask: false,
            // Tag with associate ID for future reference
            customerCharacterId: entry.associateId
        }));

        // Strategy: 
        // - Save Akiles Items as regular Item Lines.
        // - Save Partner Sales as Service Lines (Revenue).

        // For now, let's update the lines locally then call save.
        const allLines = [...lines.filter(l => l.kind !== 'service'), ...associateServiceLines];
        setLines(allLines);

        // Wait for state update? React batching might handle it, but it's risky.
        setTimeout(() => {
            onSave(); // Trigger parent save
        }, 100);
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
            </div>

            <div className="grid grid-cols-12 gap-6 flex-1 min-h-0">

                {/* SECTION B: INPUTS (The Cart) - Left Column */}
                <div className="col-span-12 lg:col-span-7 flex flex-col gap-4 min-h-0 overflow-y-auto pr-2">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {/* Card 1: My Inventory (Akiles) */}
                        <Card className="border-indigo-500/20 bg-indigo-950/20">
                            <CardContent className="p-4 space-y-4">
                                <div className="flex items-center justify-between">
                                    <h3 className="text-lg font-semibold flex items-center text-indigo-300">
                                        <User className="h-5 w-5 mr-2" />
                                        My Inventory (Akiles)
                                    </h3>
                                    <Badge variant="secondary">{lines.filter(l => l.kind === 'item' || l.kind === 'bundle').length} Items</Badge>
                                </div>

                                {/* Contract Selector for My Inventory */}
                                <div className="flex items-center gap-2 max-w-sm">
                                    <Label className="text-xs text-muted-foreground whitespace-nowrap">Applicable Contract:</Label>
                                    <SearchableSelect
                                        options={contracts.map(c => ({ value: c.id, label: c.name }))}
                                        value={selectedContractId_Principal}
                                        onValueChange={setSelectedContractId_Principal}
                                        placeholder="Select Contract (Optional)"
                                        className="h-8 text-xs bg-slate-800 border-indigo-500/30 max-w-[200px] truncate"
                                    />
                                </div>

                                {/* Add Items Button / Area */}
                                <div className="p-4 border-2 border-dashed border-indigo-500/30 rounded-lg flex flex-col items-center justify-center text-muted-foreground hover:bg-slate-800/50 transition-colors cursor-pointer" onClick={() => setShowItemPicker(true)}>
                                    <Plus className="h-6 w-6 mb-2" />
                                    <span className="text-sm">Add Items from Inventory...</span>
                                </div>

                                {/* List of Added Items */}
                                <div className="space-y-2 max-h-[200px] overflow-y-auto">
                                    {lines.filter(l => l.kind === 'item' || l.kind === 'bundle').map(line => {
                                        // Simple rendering for now
                                        const item = line.kind === 'item' ? items.find(i => i.id === (line as ItemSaleLine).itemId) : null;
                                        return (
                                            <div key={line.lineId} className="flex justify-between items-center text-sm p-2 bg-slate-800 rounded border border-slate-700">
                                                <span className="truncate max-w-[150px]">{item ? item.name : 'Bundle'}</span>
                                                <div className="flex items-center gap-4">
                                                    <span>{line.quantity}x</span>
                                                    <span>₡{((line.unitPrice || 0) * (line.quantity || 0)).toLocaleString()}</span>
                                                    <Button variant="ghost" size="icon" className="h-6 w-6 text-red-400" onClick={() => handleRemoveLine(line.lineId)}>
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
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-2">
                                        <div className="flex bg-slate-900 rounded-md p-0.5 border border-slate-700">
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
                                        <div className="w-[180px]">
                                            <select
                                                value={selectedAssociateId}
                                                onChange={(e) => setSelectedAssociateId(e.target.value)}
                                                className="h-8 w-full rounded-md border border-slate-700 bg-slate-900 px-3 py-1 text-xs shadow-sm focus:outline-none focus:ring-1 focus:ring-pink-500 text-slate-200"
                                            >
                                                <option value="" disabled>Select {viewMode}...</option>
                                                {characters
                                                    .filter(c => {
                                                        // Filter logic: Show all for now, but ideally filter by role
                                                        // For simplicity and robustness, showing basic list sorted by name
                                                        return true;
                                                    })
                                                    .map(c => (
                                                        <option key={c.id} value={c.id}>
                                                            {c.name}
                                                        </option>
                                                    ))}
                                            </select>
                                        </div>
                                    </div>
                                    <Badge variant="secondary" className="bg-pink-500/20 text-pink-300 hover:bg-pink-500/30">{associateEntries.length} Entries</Badge>
                                </div>

                                {/* Contract Selector for Partner - With overflow fix */}
                                <div className="flex items-center gap-2 max-w-sm">
                                    <Label className="text-xs text-muted-foreground whitespace-nowrap">Applicable Contract:</Label>
                                    <SearchableSelect
                                        options={contracts.map(c => ({ value: c.id, label: c.name }))}
                                        value={selectedContractId_Associate}
                                        onValueChange={setSelectedContractId_Associate}
                                        placeholder={`Select ${viewMode} Contract...`}
                                        className="h-8 text-xs bg-slate-800 border-pink-500/30 max-w-[200px] truncate"
                                    />
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
                </div>

                {/* SECTION C: SETTLEMENT MATRIX (The Excel View) - Right Column */}
                <div className="col-span-12 lg:col-span-5 flex flex-col min-h-0 bg-white dark:bg-slate-800 rounded-xl border shadow-sm overflow-hidden">

                    {/* Matrix Header */}
                    <div className="grid grid-cols-12 gap-2 p-3 bg-slate-100 dark:bg-slate-900 border-b text-xs font-semibold text-muted-foreground uppercase tracking-wider text-center">
                        <div className="col-span-3 text-left pl-2">Category</div>
                        <div className="col-span-3 text-right">Total</div>
                        <div className="col-span-3 text-right text-indigo-600">My Share</div>
                        <div className="col-span-3 text-right text-pink-600">Assoc. Share</div>
                    </div>

                    {/* Matrix Body (Scrollable) */}
                    <div className="flex-1 overflow-y-auto">
                        {/* Akiles Section */}
                        {salesDistributionMatrix.akiles.length > 0 && (
                            <div className="p-2 bg-indigo-50/30">
                                <div className="text-xs font-bold text-indigo-700 mb-2 px-2">AKILES PRODUCTS</div>
                                {salesDistributionMatrix.akiles.map(row => (
                                    <div key={row.id} className="grid grid-cols-12 gap-2 p-2 text-sm border-b border-indigo-100 last:border-0 hover:bg-white/50 transition-colors">
                                        <div className="col-span-3 font-medium text-slate-700 dark:text-slate-200">{row.label}</div>
                                        <div className="col-span-3 text-right font-bold">₡{row.totalColones.toLocaleString()}</div>
                                        <div className="col-span-3 text-right text-indigo-600">₡{row.ownerAmount.toLocaleString()}</div>
                                        <div className="col-span-3 text-right text-pink-400">₡{row.commissionAmount.toLocaleString()}</div>
                                    </div>
                                ))}
                            </div>
                        )}

                        {/* Associate Section */}
                        {salesDistributionMatrix.associate.length > 0 && (
                            <div className="p-2 bg-pink-50/30">
                                <div className="text-xs font-bold text-pink-700 mb-2 px-2 mt-2">
                                    {selectedAssociateId
                                        ? `ASSOCIATE (${characters.find(c => c.id === selectedAssociateId)?.name?.toUpperCase()})`
                                        : 'ASSOCIATE SALES'}
                                </div>
                                {salesDistributionMatrix.associate.map(row => (
                                    <div key={row.id} className="grid grid-cols-12 gap-2 p-2 text-sm border-b border-pink-100 last:border-0 hover:bg-white/50 transition-colors">
                                        <div className="col-span-3 font-medium text-slate-700 dark:text-slate-200">{row.label}</div>
                                        <div className="col-span-3 text-right font-bold">₡{row.totalColones.toLocaleString()}</div>
                                        <div className="col-span-3 text-right text-indigo-400">₡{row.ownerAmount.toLocaleString()} (Comm)</div>
                                        <div className="col-span-3 text-right text-pink-600">₡{row.commissionAmount.toLocaleString()}</div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* Summary Footer */}
                    <div className="p-4 bg-slate-50 dark:bg-slate-900 border-t space-y-4">
                        <div className="text-xs font-bold text-muted-foreground uppercase flex items-center gap-2">
                            <DollarSign className="h-3 w-3" /> Sales Distribution
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            {/* My Payout */}
                            <div className="p-3 bg-white dark:bg-slate-800 rounded-lg border border-indigo-100 shadow-sm">
                                <div className="flex items-center gap-2 mb-2">
                                    <div className="h-6 w-6 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-700 font-bold text-[10px]">A</div>
                                    <div>
                                        <div className="text-xs font-bold">Akiles Net</div>
                                        <div className="text-[10px] text-muted-foreground">Payout to Me</div>
                                    </div>
                                </div>
                                <div className="space-y-1 text-xs bg-slate-50 p-2 rounded">
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
                    </div>
                </div>
            </div>

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
                        lineId: uuid(),
                        kind: 'item',
                        itemId: saleItem.itemId,
                        unitPrice: saleItem.unitPrice,
                        quantity: saleItem.quantity,
                        description: saleItem.itemName
                    } as ItemSaleLine));

                    setLines([...lines, ...newLines]);
                    setShowItemPicker(false);
                }}
                defaultSiteId={siteId}
            />
        </div >
    );
}
