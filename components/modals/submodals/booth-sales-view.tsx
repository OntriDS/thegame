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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
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
import ConfirmationModal from './confirmation-submodal';
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
    onDelete?: () => void;
    isSaving: boolean;

    // Status State
    status: SaleStatus;
    setStatus: (status: SaleStatus) => void;
    isNotPaid: boolean;
    setIsNotPaid: (val: boolean) => void;
    isNotCharged: boolean;
    setIsNotCharged: (val: boolean) => void;
}

interface AssociateQuickEntry {
    id: string;
    description: string;
    amountCRC: number;
    amountUSD: number;
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
    isSaving,
    status,
    setStatus,
    isNotPaid,
    setIsNotPaid,
    isNotCharged,
    setIsNotCharged,
    onDelete
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

    // Delete Confirmation State
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

    // Payments Logic: Auto-calculate remaining need
    // "reduce from colones then convert to dollars"



    // View Mode: 'Associate' | 'Partner' | 'Off' (Nullable logic handled by string literal)
    const [viewMode, setViewMode] = useState<'Associate' | 'Partner' | 'Off'>('Off');

    // Quick Entry Form State
    const [quickAmountCRC, setQuickAmountCRC] = useState<string>('');
    const [quickAmountUSD, setQuickAmountUSD] = useState<string>('');
    // const [quickDesc, setQuickDesc] = useState<string>(''); // Removed as requested
    const [quickCat, setQuickCat] = useState<string>('');

    // Payment Distribution State
    const [paymentBitcoin, setPaymentBitcoin] = useState<number>(0); // Value in CRC
    const [paymentCard, setPaymentCard] = useState<number>(0);       // Value in CRC

    // Manual Payment Entry for Cash (Split)
    const [paymentCashCRC, setPaymentCashCRC] = useState<number>(0);
    const [paymentCashUSD, setPaymentCashUSD] = useState<number>(0);

    // Effect to auto-calculate Cash remainder initially (OPTIONAL)
    // For now, minimizing magic. If user wants to type, let them type. 
    // But helpful to pre-fill? Maybe not, complicates "editable".
    // Let's leave them 0 for now or user can fill.
    // Actually, "auto-calculated Cash remainder display" was the OLD feature. 
    // New feature is "Split... into two editable fields". 
    // Users might prefer auto-calc. Let's start with 0.

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
        // Mocking "Maria" as default if she exists IF viewMode is NOT Off
        if (viewMode !== 'Off' && !selectedAssociateId && characters.length > 0) {
            const maria = characters.find(c => c.name.toLowerCase().includes('maria') || c.name.includes('O2'));
            if (maria) setSelectedAssociateId(maria.id);
        }

        // Clear selection if Off
        if (viewMode === 'Off') {
            setSelectedAssociateId('');
        }
    }, [characters, selectedAssociateId, viewMode]);

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

        // Associate Entries are entered in Colones (and USD now)
        const assocItemsTotal_CRC = associateEntries.reduce((sum, e) => {
            const crcVal = e.amountCRC || 0;
            const usdValAsCRC = (e.amountUSD || 0) * exchangeRate;
            return sum + crcVal + usdValAsCRC;
        }, 0);

        // 2. Default Shares (No Contract Defaults = 100% Me, 0% Assoc, Me pays Costs)
        let shareOfMyItems_Me = 1.0;
        let shareOfAssocItems_Me = 0.0;
        let shareOfExpenses_Me = 1.0;

        // 3. Apply Contract Clauses (Corrected Logic)
        if (activeContract) {
            // A. Principal Items (My Items) -> Apply SALES_COMMISSION Clause (If I pay comm)
            // Logic: I keep 'companyShare' of My Items.
            const commClause = activeContract.clauses.find(c => c.type === ContractClauseType.SALES_COMMISSION);
            if (commClause) {
                shareOfMyItems_Me = commClause.companyShare;
            }

            // B. Associate Items (Their Items) -> Apply SALES_SERVICE Clause (If I provide service)
            // Logic: I keep 'companyShare' of Their Items (My Commission).
            const serviceClause = activeContract.clauses.find(c => c.type === ContractClauseType.SALES_SERVICE);
            if (serviceClause) {
                shareOfAssocItems_Me = serviceClause.companyShare;
            }

            // C. Expense Sharing
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

                // Use metadata partial totals if available, otherwise fallback to total (USD)
                const metaUSD = itemLine.metadata?.totalUSD ?? 0;
                const metaCRC = itemLine.metadata?.totalCRC ?? 0;

                // If we have specific metadata (new system), use it.
                // Otherwise fallback to legacy behavior (quantity * unitPrice = USD).
                if (metaUSD > 0 || metaCRC > 0) {
                    // Check if this line is purely derived from expressions
                    total = (itemLine.quantity || 0) * (itemLine.unitPrice || 0);
                    // But for the matrix, we want the split.
                } else {
                    total = (itemLine.quantity || 0) * (itemLine.unitPrice || 0);
                }

                const item = items.find(i => i.id === itemLine.itemId);
                if (item) {
                    category = item.subItemType ? `${item.type}: ${item.subItemType}` : item.type;
                }

                if (!akilesRows[category]) {
                    akilesRows[category] = {
                        id: category,
                        label: category,
                        isAssociate: false,
                        totalColones: metaCRC,
                        totalDollars: (metaUSD > 0 || metaCRC > 0) ? metaUSD : total,
                        totalBitcoin: 0,
                        totalCard: 0,
                        commissionAmount: 0,
                        ownerAmount: 0
                    };
                } else {
                    akilesRows[category].totalDollars += ((metaUSD > 0 || metaCRC > 0) ? metaUSD : total);
                    akilesRows[category].totalColones += metaCRC;
                }
            } else if (line.kind === 'bundle') {
                const bundleLine = line as BundleSaleLine;
                total = (bundleLine.quantity || 0) * (bundleLine.unitPrice || 0);
                category = bundleLine.subItemType ? `Bundle: ${bundleLine.subItemType}` : 'Bundle';

                // Bundle logic remains simple (USD) for now unless extended
                if (!akilesRows[category]) {
                    akilesRows[category] = {
                        id: category,
                        label: category,
                        isAssociate: false,
                        totalColones: 0,
                        totalDollars: total,
                        totalBitcoin: 0,
                        totalCard: 0,
                        commissionAmount: 0,
                        ownerAmount: 0
                    };
                } else {
                    akilesRows[category].totalDollars += total;
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
                    totalColones: entry.amountCRC || 0,
                    totalDollars: entry.amountUSD || 0,
                    totalBitcoin: 0,
                    totalCard: 0,
                    commissionAmount: 0,
                    ownerAmount: 0
                };
            } else {
                associateRows[catLabel].totalColones += (entry.amountCRC || 0);
                associateRows[catLabel].totalDollars += (entry.amountUSD || 0);
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
    }, [myItems, associateEntries, items, exchangeRate, totals, lines]);


    // Payments Logic: Auto-calculate remaining need
    // Moved here to be after salesDistributionMatrix is defined
    useEffect(() => {
        // 1. Calculate Total Incomes (Separated by Currency)
        const totalCRC = salesDistributionMatrix.akiles.reduce((acc, r) => acc + r.totalColones, 0) +
            salesDistributionMatrix.associate.reduce((acc, r) => acc + r.totalColones, 0);

        const totalDollars = salesDistributionMatrix.akiles.reduce((acc, r) => acc + r.totalDollars, 0) +
            salesDistributionMatrix.associate.reduce((acc, r) => acc + r.totalDollars, 0);

        // 2. Calculate Non-USD Payments (Card, BTC, CashCRC)
        const paymentCardVal = Number(paymentCard) || 0;
        const paymentBtcVal = Number(paymentBitcoin) || 0;
        const paymentCashCRCVal = Number(paymentCashCRC) || 0;

        // 3. Logic:
        // Cash USD = (Total Sales USD) + Remaining Colones Value Converted to USD
        // Remaining Colones = Total Sales CRC - Card - BTC - CashCRC
        const remainingCRC = totalCRC - paymentCardVal - paymentBtcVal - paymentCashCRCVal;

        // Convert remainder to USD
        const remainingCRCInUSD = remainingCRC / exchangeRate;

        // Final Expected Cash USD
        const expectedCashUSD = totalDollars + remainingCRCInUSD;

        // 4. Update State
        // Ensure accurate rounding to 2 decimal places to match currency conventions
        const groundedUSD = Math.round(expectedCashUSD * 100) / 100;

        setPaymentCashUSD(groundedUSD);

    }, [salesDistributionMatrix, paymentCard, paymentBitcoin, paymentCashCRC, exchangeRate]);

    // 3. Handlers
    // ============================================================================

    const handleAddAssociateEntry = () => {
        const amountCRC = parseFloat(quickAmountCRC) || 0;
        const amountUSD = parseFloat(quickAmountUSD) || 0;

        if ((amountCRC <= 0 && amountUSD <= 0) || !selectedAssociateId || !quickCat) return;

        const newEntry: AssociateQuickEntry = {
            id: uuid(),
            description: '', // Description removed from UI
            amountCRC: amountCRC,
            amountUSD: amountUSD,
            category: quickCat,
            associateId: selectedAssociateId
        };

        setAssociateEntries([...associateEntries, newEntry]);
        setQuickAmountCRC('');
        setQuickAmountUSD('');
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

        // 1. Convert Associate Entries to Service Lines (Revenue in USD)
        const associateServiceLines: ServiceLine[] = associateEntries.map(entry => ({
            lineId: uuid(),
            kind: 'service',
            station: 'Associate Sales' as Station,
            // Convert everything to USD for the official record
            revenue: ((entry.amountCRC || 0) / exchangeRate) + (entry.amountUSD || 0),
            // Helper to get name
            description: `[Associate: ${getAssociateName(entry.associateId)}] ${entry.category}`,
            taxAmount: 0,
            createTask: false,
            customerCharacterId: entry.associateId,
            // Add metadata for tracking splits if needed
            metadata: {
                originalAmountCRC: entry.amountCRC,
                originalAmountUSD: entry.amountUSD,
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
                calculatedTotals: totals,
                paymentDistribution: {
                    bitcoin: paymentBitcoin,
                    card: paymentCard,
                    cashCRC: paymentCashCRC,
                    cashUSD: paymentCashUSD
                }
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
            status: status, // Use selected status
            isNotPaid: isNotPaid,
            isNotCharged: isNotCharged,
            siteId: siteId,
            salesChannel: 'Booth Sales' as Station,
            customerId: (viewMode !== 'Off' && selectedAssociateId) ? selectedAssociateId : null,

            // Financials (Converted to USD)
            lines: allLines,
            totals: {
                subtotal: totals.grossSales / exchangeRate,
                discountTotal: 0,
                taxTotal: 0,
                totalRevenue: totals.grossSales / exchangeRate
            },

            // Metadata & Links
            archiveMetadata: boothMetadata,
            links: [], // Rosetta Stone initialization

            // Lifecycle defaults
            createdAt: new Date(),
            updatedAt: new Date(),
            isCollected: false,

            // Optional fields defaults
        };

        // 5. Pass to Parent
        onSave(fullSale);
    };


    // 4. Render
    // ============================================================================
    return (
        <div className="flex flex-col h-full bg-slate-50/50 dark:bg-slate-900/50 -mx-6 -mt-6 -mb-4 p-4 pt-4">

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



                {/* Booth Sales Lozenge (Relocated) */}
                <div className="flex items-center gap-1.5 px-2 py-0.5 bg-indigo-500/10 rounded-md border border-indigo-500/20 ml-2">
                    <Store className="h-3 w-3 text-indigo-500" />
                    <span className="text-[10px] font-bold text-indigo-500 whitespace-nowrap uppercase tracking-wider">Booth Sales</span>
                </div>

                <div className="w-px h-6 bg-slate-200 dark:bg-slate-700 mx-2 ml-auto" />

                {/* Associate / Partner Toggle & Selector (Moved to Header) */}
                <div className="flex items-center gap-2">
                    {/* Role Toggle 3-Way */}
                    <div className="flex bg-slate-900 rounded-md p-0.5 border border-slate-700 shrink-0">
                        <button
                            onClick={() => setViewMode('Off')}
                            className={`text-[10px] px-2 py-1 rounded-sm transition-colors ${viewMode === 'Off' ? 'bg-slate-700 text-white font-medium' : 'text-slate-400 hover:text-slate-300'}`}
                        >
                            Off
                        </button>
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
                                disabled={viewMode === 'Off'}
                                onChange={(e) => setSelectedAssociateId(e.target.value)}
                                className={cn(
                                    "h-8 w-full rounded-md border bg-slate-900 px-3 py-1 text-xs shadow-sm focus:outline-none focus:ring-1 focus:ring-pink-500 truncate pr-8 appearance-none",
                                    selectedAssociateId ? "border-pink-500/50 text-pink-200" : "border-slate-700 text-slate-400",
                                    viewMode === 'Off' && "opacity-50 cursor-not-allowed border-slate-800 text-slate-600"
                                )}
                            >
                                <option value="">{viewMode === 'Off' ? 'Disabled' : `Select ${viewMode}...`}</option>
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

                            {/* Clear Button (Only if selected and Enabled) */}
                            {selectedAssociateId && viewMode !== 'Off' && (
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

                                {/* List of Added Items - Table View */}
                                <div className="max-h-[300px] overflow-y-auto rounded-md border border-indigo-500/20">
                                    <table className="w-full text-xs text-left">
                                        <thead className="bg-indigo-900/30 text-indigo-200 sticky top-0 font-semibold">
                                            <tr>
                                                <th className="p-2 w-[40%]">Item</th>
                                                <th className="p-2 w-[15%]">Price ($)</th>
                                                <th className="p-2 w-[15%]">Calc ($)</th>
                                                <th className="p-2 w-[15%]">Calc (₡)</th>
                                                <th className="p-2 w-[5%] text-center">Qty</th>
                                                <th className="p-2 w-[10%] text-right">Total ($)</th>
                                                <th className="p-2 w-[5%]"></th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-indigo-500/10">
                                            {myItems.length === 0 && (
                                                <tr>
                                                    <td colSpan={7} className="p-4 text-center text-muted-foreground italic">
                                                        No items selected. Click &quot;Add&quot; to select inventory.
                                                    </td>
                                                </tr>
                                            )}
                                            {myItems.map(line => {
                                                const item = items.find(i => i.id === (line as ItemSaleLine).itemId);
                                                const meta = line.metadata || {};
                                                return (
                                                    <tr key={line.lineId} className="bg-slate-900/40 hover:bg-indigo-500/10 transition-colors group cursor-pointer" onClick={() => setShowItemPicker(true)}>
                                                        <td className="p-2 font-medium text-slate-200">
                                                            {item ? item.name : 'Unknown Item'}
                                                        </td>
                                                        <td className="p-2 text-slate-400">
                                                            ${(line.unitPrice || 0).toFixed(2)}
                                                        </td>
                                                        <td className="p-2 text-slate-400 font-mono text-[10px]">
                                                            {meta.usdExpression || '-'}
                                                        </td>
                                                        <td className="p-2 text-slate-400 font-mono text-[10px]">
                                                            {meta.crcExpression || '-'}
                                                        </td>
                                                        <td className="p-2 text-center font-bold text-white bg-indigo-500/10 rounded">
                                                            {line.quantity}
                                                        </td>
                                                        <td className="p-2 text-right font-bold text-green-400">
                                                            ${((line.unitPrice || 0) * (line.quantity || 0)).toFixed(2)}
                                                        </td>
                                                        <td className="p-2 text-right">
                                                            <Button variant="ghost" size="icon" className="h-6 w-6 text-red-400 opacity-0 group-hover:opacity-100 transition-opacity" onClick={(e) => { e.stopPropagation(); handleRemoveLine(line.lineId); }}>
                                                                <Trash2 className="h-3 w-3" />
                                                            </Button>
                                                        </td>
                                                    </tr>
                                                );
                                            })}
                                        </tbody>
                                    </table>
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
                                            {/* Contract Selector - Moved to Header */}
                                            <div className="flex items-center gap-2 w-auto">
                                                <div className="w-auto text-[10px] text-pink-300 font-medium shrink-0">
                                                    Agreement:
                                                </div>
                                                <div className="w-48">
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
                                    </div>

                                    {/* Quick Entry Form */}
                                    <div className="bg-slate-900/50 p-3 rounded-lg border border-slate-800 space-y-2">
                                        <div className="flex gap-2">
                                            <div className="relative">
                                                <span className="absolute left-2 top-1.5 text-[10px] text-pink-500 font-bold">₡</span>
                                                <NumericInput
                                                    value={parseFloat(quickAmountCRC) || 0}
                                                    onChange={(val) => setQuickAmountCRC(val.toString())}
                                                    placeholder="0"
                                                    className="w-24 bg-slate-950 border-slate-700 h-8 text-xs pl-5"
                                                />
                                            </div>
                                            <div className="relative">
                                                <span className="absolute left-2 top-1.5 text-[10px] text-green-500 font-bold">$</span>
                                                <NumericInput
                                                    value={parseFloat(quickAmountUSD) || 0}
                                                    onChange={(val) => setQuickAmountUSD(val.toString())}
                                                    placeholder="0.00"
                                                    className="w-24 bg-slate-950 border-slate-700 h-8 text-xs pl-5"
                                                />
                                            </div>
                                            <Input
                                                value={quickCat}
                                                onChange={(e) => setQuickCat(e.target.value)}
                                                placeholder="Description / Category"
                                                className="flex-1 bg-slate-950 border-slate-700 h-8 text-xs"
                                            />
                                            <Button
                                                onClick={handleAddAssociateEntry}
                                                className="bg-pink-600 hover:bg-pink-700 text-white shrink-0 h-8 text-xs"
                                                disabled={!quickAmountCRC && !quickAmountUSD}
                                                size="sm"
                                            >
                                                Add
                                            </Button>
                                        </div>
                                    </div>

                                    {/* List - Table View */}
                                    <div className="max-h-[200px] overflow-y-auto rounded-md border border-pink-500/20">
                                        <table className="w-full text-xs text-left">
                                            <thead className="bg-pink-900/30 text-pink-200 sticky top-0 font-semibold">
                                                <tr>
                                                    <th className="p-2 w-[40%]">Description</th>
                                                    <th className="p-2 w-[25%] text-right">Amount ($)</th>
                                                    <th className="p-2 w-[25%] text-right">Amount (₡)</th>
                                                    <th className="p-2 w-[10%]"></th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-pink-500/10">
                                                {associateEntries.length === 0 && (
                                                    <tr>
                                                        <td colSpan={4} className="p-4 text-center text-muted-foreground italic">
                                                            No entries yet.
                                                        </td>
                                                    </tr>
                                                )}
                                                {associateEntries.map(entry => (
                                                    <tr key={entry.id} className="bg-slate-900/40 hover:bg-pink-500/10 transition-colors group">
                                                        <td className="p-2 text-slate-300 font-medium">{entry.category || entry.description}</td>
                                                        <td className="p-2 text-slate-400 text-right font-mono">
                                                            {entry.amountUSD ? `$${entry.amountUSD.toFixed(2)}` : '-'}
                                                        </td>
                                                        <td className="p-2 text-slate-400 text-right font-mono">
                                                            {entry.amountCRC ? `₡${entry.amountCRC.toLocaleString()}` : '-'}
                                                        </td>
                                                        <td className="p-2 text-right">
                                                            <Button variant="ghost" size="icon" className="h-6 w-6 text-red-400 opacity-0 group-hover:opacity-100 transition-opacity" onClick={() => handleRemoveAssociateEntry(entry.id)}>
                                                                <Trash2 className="h-3 w-3" />
                                                            </Button>
                                                        </td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
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
                        <div className={`text-right ${selectedAssociateId ? 'col-span-2' : 'col-span-3'}`}>T₡</div>
                        <div className={`text-right ${selectedAssociateId ? 'col-span-2' : 'col-span-3'}`}>T$</div>
                        {selectedAssociateId && (
                            <>
                                <div className="col-span-2 text-right text-indigo-400">Our Share $</div>
                                <div className="col-span-3 text-right text-pink-400">Their Share $</div>
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
                                            <div className={`text-right font-mono text-slate-400 ${selectedAssociateId ? 'col-span-2' : 'col-span-3'}`}>₡{row.totalColones.toLocaleString()}</div>
                                            <div className={`text-right font-mono text-slate-300 ${selectedAssociateId ? 'col-span-2' : 'col-span-3'}`}>${row.totalDollars.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 2 })}</div>
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
                                            <div className="col-span-2 text-right font-mono text-slate-400">₡{row.totalColones.toLocaleString()}</div>
                                            <div className="col-span-2 text-right font-mono text-slate-300">${row.totalDollars.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 2 })}</div>
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

                        <div className={`grid gap-4 ${selectedAssociateId ? 'grid-cols-2' : 'grid-cols-1'}`}>
                            {/* My Payout */}
                            <div className="p-3 bg-slate-900 rounded-lg border border-indigo-500/20 shadow-sm">
                                <div className="flex items-center gap-2 mb-2">
                                    <div className="h-6 w-6 rounded-full bg-indigo-500/20 flex items-center justify-center text-indigo-400 font-bold text-[10px]">C</div>
                                    <div>
                                        <div className="text-xs font-bold text-indigo-100">TheCompany Net</div>
                                        <div className="text-[10px] text-slate-500">Net Profit</div>
                                    </div>
                                </div>
                                <div className="space-y-1 text-xs bg-indigo-950/10 p-2 rounded border border-indigo-500/10">

                                    {/* Footer: 2-Column Summary */}
                                    <div className="border-t border-indigo-500/20 pt-2 mt-0">
                                        <div className="grid grid-cols-3 gap-2 text-xs font-medium text-indigo-100/70 mb-1 border-b border-indigo-500/10 pb-1">
                                            <span></span>
                                            <span className="text-right">₡</span>
                                            <span className="text-right">$</span>
                                        </div>
                                        <div className="grid grid-cols-3 gap-2 text-xs text-indigo-100">
                                            <span>Sales:</span>
                                            <div className="text-right font-mono">₡{salesDistributionMatrix.akiles.reduce((s, r) => s + r.totalColones, 0).toLocaleString()}</div>
                                            <div className="text-right font-mono">${salesDistributionMatrix.akiles.reduce((s, r) => s + r.totalDollars, 0).toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 2 })}</div>
                                        </div>
                                        <div className="grid grid-cols-3 gap-2 text-xs text-red-400">
                                            <span>Booth:</span>
                                            <div className="text-right font-mono text-red-400">-₡{(totals.breakdown.costMe * exchangeRate).toLocaleString()}</div>
                                            <div className="text-right font-mono text-red-400">-${totals.breakdown.costMe.toLocaleString(undefined, { minimumFractionDigits: 2 })}</div>
                                        </div>
                                    </div>
                                    {/* Explicit T$ and T₡ rows as requested */}
                                    <div className="grid grid-cols-3 gap-2 text-sm font-bold border-t border-indigo-500/20 pt-1 mt-1 text-indigo-400">
                                        <span className="col-span-1">T$:</span>
                                        <span className="col-span-2 text-right">${(totals.myNet / exchangeRate).toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 2 })}</span>
                                    </div>
                                    <div className="grid grid-cols-3 gap-2 text-xs font-medium text-indigo-400/50">
                                        <span className="col-span-1">T₡:</span>
                                        <span className="col-span-2 text-right">₡{totals.myNet.toLocaleString()}</span>
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

                                    <div className="border-t border-pink-500/20 pt-2 mt-0">
                                        <div className="grid grid-cols-3 gap-2 text-xs font-medium text-pink-100/70 mb-1 border-b border-pink-500/10 pb-1">
                                            <span></span>
                                            <span className="text-right">₡</span>
                                            <span className="text-right">$</span>
                                        </div>
                                        <div className="grid grid-cols-3 gap-2 text-xs text-pink-100">
                                            <span>Sales:</span>
                                            <div className="text-right font-mono">₡{salesDistributionMatrix.associate.reduce((s, r) => s + r.totalColones, 0).toLocaleString()}</div>
                                            <div className="text-right font-mono">${salesDistributionMatrix.associate.reduce((s, r) => s + r.totalDollars, 0).toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 2 })}</div>
                                        </div>
                                        <div className="grid grid-cols-3 gap-2 text-xs text-red-400">
                                            <span>Booth:</span>
                                            <div className="text-right font-mono">-₡{(totals.breakdown.costAssoc * exchangeRate).toLocaleString()}</div>
                                            <div className="text-right font-mono">-${totals.breakdown.costAssoc.toLocaleString(undefined, { minimumFractionDigits: 2 })}</div>
                                        </div>
                                        <div className="grid grid-cols-3 gap-2 text-sm font-bold border-t border-pink-500/20 pt-1 mt-1 text-pink-400">
                                            <span className="col-span-1">T$:</span>
                                            <span className="col-span-2 text-right">${(totals.associateNet / exchangeRate).toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 2 })}</span>
                                        </div>
                                        <div className="grid grid-cols-3 gap-2 text-xs font-medium text-pink-400/50">
                                            <span className="col-span-1">T₡:</span>
                                            <span className="col-span-2 text-right">₡{totals.associateNet.toLocaleString()}</span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>


            <div className="p-4 border-t bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-800 flex justify-between items-center">

                {/* Left Side: Status Controls (Moved to Footer) */}
                <div className="flex items-center gap-2">
                    {/* Status Selector */}
                    <div className="flex items-center gap-2">
                        <Label className="text-xs text-muted-foreground mr-1">Status:</Label>
                        <Select value={status} onValueChange={(val) => setStatus(val as SaleStatus)}>
                            <SelectTrigger className="h-8 w-[130px] text-xs bg-white dark:bg-slate-950 border-slate-300 dark:border-slate-700">
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                {Object.values(SaleStatus).map(s => (
                                    <SelectItem key={s} value={s}>{s}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>

                    <div className="w-px h-6 bg-slate-300 dark:bg-slate-700 mx-2"></div>

                    {/* Payment Status Toggles */}
                    <div className="flex items-center gap-2">
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setIsNotPaid(!isNotPaid)}
                            className={`h-8 text-xs px-3 font-medium transition-colors ${isNotPaid
                                ? 'border-orange-500/50 text-orange-600 dark:text-orange-400 bg-orange-500/10 hover:bg-orange-500/20'
                                : 'border-emerald-500/50 text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 hover:bg-emerald-500/20'
                                }`}
                        >
                            {isNotPaid ? "⚠ Not Paid" : "✓ Paid"}
                        </Button>

                        <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setIsNotCharged(!isNotCharged)}
                            className={`h-8 text-xs px-3 font-medium transition-colors ${isNotCharged
                                ? 'border-orange-500/50 text-orange-600 dark:text-orange-400 bg-orange-500/10 hover:bg-orange-500/20'
                                : 'border-emerald-500/50 text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 hover:bg-emerald-500/20'
                                }`}
                        >
                            {isNotCharged ? "⚠ Not Charged" : "✓ Charged"}
                        </Button>
                    </div>

                </div>


                {/* Center: Payment Distribution Inputs */}
                <div className="flex items-center gap-2 mx-4">
                    <div className="flex items-center gap-2">
                        <Label className="text-[9px] text-muted-foreground uppercase tracking-wide">Payments</Label>

                        {/* Bitcoin Input */}
                        <div className="flex items-center relative" title="Bitcoin Payment (CRC)">
                            <span className="absolute left-2 text-[10px] text-orange-500 font-bold z-10">₿</span>
                            <NumericInput
                                value={paymentBitcoin}
                                onChange={setPaymentBitcoin}
                                className="h-8 w-20 pl-8 text-xs bg-slate-100 dark:bg-slate-950 border-orange-500/20 text-orange-600 dark:text-orange-400 focus:border-orange-500/50"
                                placeholder="BTC"
                            />
                        </div>

                        {/* Card Input */}
                        <div className="flex items-center relative" title="Card Payment (CRC)">
                            <span className="absolute left-2 text-[10px] text-indigo-500 font-bold z-10">💳</span>
                            <NumericInput
                                value={paymentCard}
                                onChange={setPaymentCard}
                                className="h-8 w-20 pl-8 text-xs bg-slate-100 dark:bg-slate-950 border-indigo-500/20 text-indigo-600 dark:text-indigo-400 focus:border-indigo-500/50"
                                placeholder="Card"
                            />
                        </div>

                        {/* Cash CRC Input */}
                        <div className="flex items-center relative" title="Cash Payment (CRC)">
                            <span className="absolute left-2 text-[10px] text-emerald-500 font-bold z-10">₡</span>
                            <NumericInput
                                value={paymentCashCRC}
                                onChange={setPaymentCashCRC}
                                className="h-8 w-20 pl-8 text-xs bg-emerald-500/10 border-emerald-500/20 text-emerald-600 dark:text-emerald-400 focus:border-emerald-500/50"
                                placeholder="CRC"
                            />
                        </div>

                        {/* Cash USD Input */}
                        <div className="flex items-center relative" title="Cash Payment (USD)">
                            <span className="absolute left-2 text-[10px] text-emerald-500 font-bold z-10">$</span>
                            <NumericInput
                                value={paymentCashUSD}
                                onChange={setPaymentCashUSD}
                                className="h-8 w-20 pl-8 text-xs bg-emerald-500/10 border-emerald-500/20 text-emerald-600 dark:text-emerald-400 focus:border-emerald-500/50"
                                placeholder="USD"
                            />
                        </div>
                    </div>
                </div>

                {/* Right Side: Action Buttons */}
                <div className="flex gap-2">
                    {onDelete && (
                        <Button
                            onClick={() => setShowDeleteConfirm(true)}
                            disabled={isSaving}
                            className="mr-auto bg-red-500/10 text-red-500 hover:bg-red-500/20 border border-red-500/20 h-9"
                        >
                            Delete
                        </Button>
                    )}
                    <Button variant="ghost" onClick={onCancel} disabled={isSaving}>Cancel</Button>
                    <Button onClick={handleSave} disabled={isSaving} className="bg-indigo-600 hover:bg-indigo-700">
                        {isSaving ? 'Processing...' : 'Confirm'}
                    </Button>
                </div>
            </div >

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
                            crcExpression: saleItem.crcExpression,
                            totalUSD: saleItem.totalUSD,
                            totalCRC: saleItem.totalCRC
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
                initialItems={
                    lines.filter(l => l.kind === 'item').map(l => {
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
                    })
                }
                defaultSiteId={siteId}
                exchangeRate={exchangeRate}
            />

            {/* Delete Confirmation Modal */}
            <ConfirmationModal
                open={showDeleteConfirm}
                onOpenChange={setShowDeleteConfirm}
                title="Delete Sale"
                description="Are you sure you want to delete this sale? This action cannot be undone."
                confirmText="Delete"
                cancelText="Cancel"
                variant="destructive"
                onConfirm={() => {
                    setShowDeleteConfirm(false);
                    if (onDelete) onDelete();
                }}
                onCancel={() => setShowDeleteConfirm(false)}
            />
        </div >
    );
}
