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
    Building2,
    DollarSign
} from 'lucide-react';
import {
    ItemType,
    Station
} from '@/types/enums';
import { SaleLine, Item, Site, Character, ServiceLine, ItemSaleLine, BundleSaleLine } from '@/types/entities';
import { v4 as uuid } from 'uuid';
import { createSiteOptionsWithCategories } from '@/lib/utils/site-options-utils';
import SaleItemsSubModal from './sale-items-submodal';
import { DEFAULT_CURRENCY_EXCHANGE_RATES } from '@/lib/constants/financial-constants';

// ============================================================================
// Types
// ============================================================================

export interface FeriaSalesDashboardProps {
    // Data
    sites: Site[];
    characters: Character[];
    items: Item[];

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

interface PartnerQuickEntry {
    id: string;
    description: string;
    amount: number;
    category: string; // e.g., 'O2 Jewelry'
}

type SettlementRow = {
    id: string; // category name or item id
    label: string;
    isPartner: boolean;
    totalColones: number;
    totalDollars: number;
    totalBitcoin: number;
    totalCard: number; // pending
    // Calculated commissions
    commissionAmount: number; // 25% of converted total
    ownerAmount: number; // 75% of converted total
}

// ============================================================================
// Component Booth Sales

// ============================================================================

export default function FeriaSalesDashboard({
    sites,
    characters,
    items,
    saleDate,
    setSaleDate,
    lines,
    setLines,
    siteId,
    setSiteId,
    onSave,
    onCancel,
    isSaving
}: FeriaSalesDashboardProps) {

    // 1. Setup State
    // ============================================================================
    const [boothCost, setBoothCost] = useState<number>(0); // Default to 0
    const exchangeRate = DEFAULT_CURRENCY_EXCHANGE_RATES.colonesToUsd; // Read-only from system
    const [showItemSelector, setShowItemSelector] = useState(false);

    // Partner Quick Entry State
    const [partnerEntries, setPartnerEntries] = useState<PartnerQuickEntry[]>([]);
    const [partnerEntryForm, setPartnerEntryForm] = useState({
        description: '',
        amount: 0,
        category: 'O2 Jewelry'
    });

    // 2. Logic & Calculations (The Settlement Engine)
    // ============================================================================

    const settlementMatrix = useMemo(() => {
        // 1. Group Akiles Items (from lines)
        const akilesRows: Record<string, SettlementRow> = {};
        const partnerRows: Record<string, SettlementRow> = {};

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
                    isPartner: false,
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

        // Process Partner Entries
        partnerEntries.forEach(entry => {
            if (!partnerRows[entry.category]) {
                partnerRows[entry.category] = {
                    id: entry.category,
                    label: entry.category,
                    isPartner: true,
                    totalColones: entry.amount, // Assumption: Entered in Colones
                    totalDollars: 0,
                    totalBitcoin: 0,
                    totalCard: 0,
                    commissionAmount: 0,
                    ownerAmount: 0
                };
            } else {
                partnerRows[entry.category].totalColones += entry.amount;
            }
        });

        // Calculate Commissions (The 75/25 Split)
        // Convert everything to a base currency (Colones) for split calculation? 
        // Or keep in original currency? 
        // User Example shows splits in Colones.

        [...Object.values(akilesRows), ...Object.values(partnerRows)].forEach(row => {
            // Simple logic: 25% commission
            const totalValue = row.totalColones + (row.totalDollars * exchangeRate);
            row.commissionAmount = totalValue * 0.25;
            row.ownerAmount = totalValue * 0.75;
        });

        return {
            akiles: Object.values(akilesRows),
            partner: Object.values(partnerRows)
        };
    }, [lines, partnerEntries, items, exchangeRate]);

    // Totals
    const totals = useMemo(() => {
        // const allRows = [...settlementMatrix.akiles, ...settlementMatrix.partner];
        // const totalSales = allRows.reduce((sum, row) => sum + row.totalColones + (row.totalDollars * exchangeRate), 0);
        const totalSales =
            settlementMatrix.akiles.reduce((s, r) => s + r.totalColones + (r.totalDollars * exchangeRate), 0) +
            settlementMatrix.partner.reduce((s, r) => s + r.totalColones + (r.totalDollars * exchangeRate), 0);

        // Akiles (Me)
        const mySales = settlementMatrix.akiles.reduce((sum, r) => sum + r.ownerAmount, 0); // My 75%
        const myCommissions = settlementMatrix.partner.reduce((sum, r) => sum + r.commissionAmount, 0); // My 25% from Partner
        const myShareOfBooth = boothCost / 2; // Assuming 50/50 split
        const myNet = mySales + myCommissions + myShareOfBooth; // Booth is negative, so adding negative = subtract

        // Partner (Maria)
        const partnerSales = settlementMatrix.partner.reduce((sum, r) => sum + r.ownerAmount, 0); // Her 75%
        const partnerCommissions = settlementMatrix.akiles.reduce((sum, r) => sum + r.commissionAmount, 0); // Her 25% from Me
        const partnerShareOfBooth = boothCost / 2;
        const partnerNet = partnerSales + partnerCommissions + partnerShareOfBooth;

        return {
            totalSales,
            myNet,
            partnerNet,
            myCommissions,
            partnerCommissions
        };
    }, [settlementMatrix, boothCost, exchangeRate]);

    // 3. Handlers
    // ============================================================================

    const addPartnerEntry = () => {
        if (partnerEntryForm.amount <= 0) return;

        const newEntry: PartnerQuickEntry = {
            id: uuid(),
            ...partnerEntryForm
        };

        setPartnerEntries([...partnerEntries, newEntry]);

        // Also add to "Lines" as a Service Line so it saves to backend?
        // User wants "Associate Profits and Costs" - maybe a Service Line to 'Partner Sales'?
        // Note: We don't add to lines state until save, or we keep them separate.

        setPartnerEntryForm({ ...partnerEntryForm, amount: 0, description: '' });
    };

    const deletePartnerEntry = (id: string) => {
        setPartnerEntries(prev => prev.filter(e => e.id !== id));
    };

    // Handler to merge everything and Save
    const handleSave = () => {
        // 1. Convert Partner Entries to Service Lines (if not already done)
        const partnerLines: ServiceLine[] = partnerEntries.map(entry => ({
            lineId: uuid(),
            kind: 'service',
            station: 'Partner Sales' as Station,
            revenue: entry.amount,
            description: `[Partner: O2] ${entry.category} - ${entry.description}`,
            taxAmount: 0,
            createTask: false
        }));

        // Strategy: 
        // - Save Akiles Items as regular Item Lines.
        // - Save Partner Sales as Service Lines (Revenue).

        // We need to pass these merged lines back to the parent `lines` state before calling onSave.

        // For now, let's update the lines locally then call save.
        const allLines = [...lines.filter(l => l.kind !== 'service'), ...partnerLines];
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
                    <h2 className="text-lg font-bold text-slate-800 dark:text-slate-100 whitespace-nowrap">Booth Sales</h2>
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
                <div className="col-span-4 flex flex-col gap-4 min-h-0 overflow-y-auto pr-2">

                    {/* My Inventory Card */}
                    <Card className="border-indigo-100 dark:border-indigo-900 shadow-sm">
                        <CardContent className="p-4 space-y-4">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                    <User className="h-4 w-4 text-indigo-600" />
                                    <span className="font-semibold text-sm">My Inventory (Akiles)</span>
                                </div>
                                <Badge variant="secondary" className="text-xs bg-indigo-50 text-indigo-700">{lines.length} Items</Badge>
                            </div>

                            <Button
                                variant="outline"
                                className="w-full justify-start text-muted-foreground hover:text-foreground border-dashed"
                                onClick={() => setShowItemSelector(true)}
                            >
                                <Plus className="h-4 w-4 mr-2" />
                                Add Items from Inventory...
                            </Button>

                            <div className="space-y-2 max-h-[200px] overflow-y-auto">
                                {lines.map((line, idx) => {
                                    let displayText = 'Item';
                                    let qty = 0;
                                    let price = 0;

                                    if (line.kind === 'item') {
                                        const l = line as ItemSaleLine;
                                        const item = items.find(i => i.id === l.itemId);
                                        displayText = item?.name || l.description || 'Unknown Item';
                                        qty = l.quantity;
                                        price = l.unitPrice;
                                    } else if (line.kind === 'bundle') {
                                        const l = line as BundleSaleLine;
                                        displayText = 'Bundle';
                                        qty = l.quantity;
                                        price = l.unitPrice;
                                    } else {
                                        displayText = 'Service';
                                    }

                                    return (
                                        <div key={line.lineId} className="flex items-center justify-between text-xs p-2 bg-slate-50 dark:bg-slate-800 rounded border">
                                            <div className="flex flex-col truncate">
                                                <span className="font-medium truncate">
                                                    {displayText}
                                                </span>
                                                <span className="text-muted-foreground">Qty: {qty}</span>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <span className="font-bold">₡{(qty * price).toLocaleString()}</span>
                                                <Button variant="ghost" size="icon" className="h-6 w-6 text-red-400" onClick={() => {
                                                    const newLines = [...lines];
                                                    newLines.splice(idx, 1);
                                                    setLines(newLines);
                                                }}>
                                                    <Trash2 className="h-3 w-3" />
                                                </Button>
                                            </div>
                                        </div>
                                    )
                                })}
                            </div>
                        </CardContent>
                    </Card>

                    {/* Partner Quick Entry Card */}
                    <Card className="border-pink-100 dark:border-pink-900 shadow-sm">
                        <CardContent className="p-4 space-y-4">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                    <User className="h-4 w-4 text-pink-600" />
                                    <span className="font-semibold text-sm">Partner (O2 / Maria)</span>
                                </div>
                                <Badge variant="secondary" className="text-xs bg-pink-50 text-pink-700">{partnerEntries.length} Entries</Badge>
                            </div>

                            <div className="space-y-3 bg-slate-50 dark:bg-slate-800 p-3 rounded-lg border">
                                <div className="grid grid-cols-2 gap-2">
                                    <Input
                                        placeholder="Amount (₡)"
                                        type="number"
                                        value={partnerEntryForm.amount || ''}
                                        onChange={(e) => setPartnerEntryForm({ ...partnerEntryForm, amount: parseFloat(e.target.value) })}
                                        className="h-8 text-xs bg-white"
                                    />
                                    <Input
                                        placeholder="Category"
                                        value={partnerEntryForm.category}
                                        onChange={(e) => setPartnerEntryForm({ ...partnerEntryForm, category: e.target.value })}
                                        className="h-8 text-xs bg-white"
                                    />
                                </div>
                                <div className="flex gap-2">
                                    <Input
                                        placeholder="Description..."
                                        value={partnerEntryForm.description}
                                        onChange={(e) => setPartnerEntryForm({ ...partnerEntryForm, description: e.target.value })}
                                        className="h-8 text-xs flex-1 bg-white"
                                    />
                                    <Button size="sm" onClick={addPartnerEntry} className="h-8 px-3 bg-pink-600 hover:bg-pink-700 text-white">
                                        Add
                                    </Button>
                                </div>
                            </div>

                            <div className="space-y-1 max-h-[150px] overflow-y-auto">
                                {partnerEntries.map(entry => (
                                    <div key={entry.id} className="flex items-center justify-between text-xs px-2 py-1 border-l-2 border-pink-400 pl-2">
                                        <span>{entry.category} ({entry.description})</span>
                                        <div className="flex items-center gap-2">
                                            <span className="font-medium">₡{entry.amount.toLocaleString()}</span>
                                            <Button variant="ghost" size="icon" className="h-5 w-5 text-red-400" onClick={() => deletePartnerEntry(entry.id)}>
                                                <Trash2 className="h-3 w-3" />
                                            </Button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </CardContent>
                    </Card>
                </div>

                {/* SECTION C: SETTLEMENT MATRIX (The Excel View) - Right Column */}
                <div className="col-span-8 flex flex-col min-h-0 bg-white dark:bg-slate-800 rounded-xl border shadow-sm overflow-hidden">

                    {/* Matrix Header */}
                    <div className="grid grid-cols-12 gap-2 p-3 bg-slate-100 dark:bg-slate-900 border-b text-xs font-semibold text-muted-foreground uppercase tracking-wider text-center">
                        <div className="col-span-3 text-left pl-2">Category</div>
                        <div className="col-span-3 text-right">Total</div>
                        <div className="col-span-3 text-right text-indigo-600">My Share (75%)</div>
                        <div className="col-span-3 text-right text-pink-600">Seller Comm (25%)</div>
                    </div>

                    {/* Matrix Body (Scrollable) */}
                    <div className="flex-1 overflow-y-auto">
                        {/* Akiles Section */}
                        {settlementMatrix.akiles.length > 0 && (
                            <div className="p-2 bg-indigo-50/30">
                                <div className="text-xs font-bold text-indigo-700 mb-2 px-2">AKILES PRODUCTS</div>
                                {settlementMatrix.akiles.map(row => (
                                    <div key={row.id} className="grid grid-cols-12 gap-2 p-2 text-sm border-b border-indigo-100 last:border-0 hover:bg-white/50 transition-colors">
                                        <div className="col-span-3 font-medium text-slate-700 dark:text-slate-200">{row.label}</div>
                                        <div className="col-span-3 text-right font-bold">₡{row.totalColones.toLocaleString()}</div>
                                        <div className="col-span-3 text-right text-indigo-600">₡{row.ownerAmount.toLocaleString()}</div>
                                        <div className="col-span-3 text-right text-pink-400">₡{row.commissionAmount.toLocaleString()}</div>
                                    </div>
                                ))}
                            </div>
                        )}

                        {/* Partner Section */}
                        {settlementMatrix.partner.length > 0 && (
                            <div className="p-2 bg-pink-50/30">
                                <div className="text-xs font-bold text-pink-700 mb-2 px-2 mt-2">PARTNER PRODUCTS (O2)</div>
                                {settlementMatrix.partner.map(row => (
                                    <div key={row.id} className="grid grid-cols-12 gap-2 p-2 text-sm border-b border-pink-100 last:border-0 hover:bg-white/50 transition-colors">
                                        <div className="col-span-3 font-medium text-slate-700 dark:text-slate-200">{row.label}</div>
                                        <div className="col-span-3 text-right font-bold">₡{row.totalColones.toLocaleString()}</div>
                                        <div className="col-span-3 text-right text-indigo-400">₡{row.commissionAmount.toLocaleString()}</div>
                                        <div className="col-span-3 text-right text-pink-600">₡{row.ownerAmount.toLocaleString()}</div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* Summary Footer */}
                    <div className="p-4 bg-slate-50 dark:bg-slate-900 border-t space-y-4">
                        <div className="text-xs font-bold text-muted-foreground uppercase flex items-center gap-2">
                            <DollarSign className="h-3 w-3" /> Final Settlement
                        </div>

                        <div className="grid grid-cols-2 gap-8">
                            {/* My Payout */}
                            <div className="p-4 bg-white dark:bg-slate-800 rounded-lg border border-indigo-100 shadow-sm">
                                <div className="flex items-center gap-2 mb-3">
                                    <div className="h-8 w-8 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-700 font-bold text-xs">A</div>
                                    <div>
                                        <div className="text-sm font-bold">Akiles Net</div>
                                        <div className="text-xs text-muted-foreground">Payout to Me</div>
                                    </div>
                                </div>
                                <div className="space-y-1 text-sm bg-slate-50 p-2 rounded">
                                    <div className="flex justify-between text-muted-foreground"><span>Sales (75%):</span> <span>₡{settlementMatrix.akiles.reduce((s, r) => s + r.ownerAmount, 0).toLocaleString()}</span></div>
                                    <div className="flex justify-between text-muted-foreground"><span>Comm (25%):</span> <span>+₡{totals.myCommissions.toLocaleString()}</span></div>
                                    <div className="flex justify-between text-red-400"><span>Booth Cost:</span> <span>-₡{(Math.abs(boothCost) / 2).toLocaleString()}</span></div>
                                    <div className="border-t pt-1 mt-1 flex justify-between font-bold text-lg text-indigo-600">
                                        <span>Total:</span> <span>₡{totals.myNet.toLocaleString()}</span>
                                    </div>
                                </div>
                            </div>

                            {/* Partner Payout */}
                            <div className="p-4 bg-white dark:bg-slate-800 rounded-lg border border-pink-100 shadow-sm">
                                <div className="flex items-center gap-2 mb-3">
                                    <div className="h-8 w-8 rounded-full bg-pink-100 flex items-center justify-center text-pink-700 font-bold text-xs">M</div>
                                    <div>
                                        <div className="text-sm font-bold">Maria Net</div>
                                        <div className="text-xs text-muted-foreground">Payout to Her</div>
                                    </div>
                                </div>
                                <div className="space-y-1 text-sm bg-slate-50 p-2 rounded">
                                    <div className="flex justify-between text-muted-foreground"><span>Sales (75%):</span> <span>₡{settlementMatrix.partner.reduce((s, r) => s + r.ownerAmount, 0).toLocaleString()}</span></div>
                                    <div className="flex justify-between text-muted-foreground"><span>Comm (25%):</span> <span>+₡{totals.partnerCommissions.toLocaleString()}</span></div>
                                    <div className="flex justify-between text-red-400"><span>Booth Cost:</span> <span>-₡{(Math.abs(boothCost) / 2).toLocaleString()}</span></div>
                                    <div className="border-t pt-1 mt-1 flex justify-between font-bold text-lg text-pink-600">
                                        <span>Total:</span> <span>₡{totals.partnerNet.toLocaleString()}</span>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="flex justify-end gap-3 pt-2">
                            <Button variant="outline" onClick={onCancel} disabled={isSaving}>Cancel</Button>
                            <Button onClick={handleSave} disabled={isSaving} className="bg-indigo-600 hover:bg-indigo-700 text-white min-w-[150px]">
                                {isSaving ? 'Processing...' : 'Confirm Settlement'}
                            </Button>
                        </div>
                    </div>

                </div>
            </div>

            {/* Item SubModal for adding inventory items */}
            <SaleItemsSubModal
                open={showItemSelector}
                onOpenChange={setShowItemSelector}
                onSave={(newItems) => {
                    // Convert local SaleItemLine to entity ItemSaleLine
                    const convertedLines: SaleLine[] = newItems.map(item => ({
                        kind: 'item',
                        lineId: item.id || uuid(),
                        itemId: item.itemId,
                        quantity: item.quantity,
                        unitPrice: item.unitPrice,
                        description: item.itemName
                    } as ItemSaleLine));

                    setLines(convertedLines); // Replace all lines with the new selection
                    setShowItemSelector(false);
                }}
                initialItems={
                    // Convert existing lines back to SaleItemLine format for editing
                    lines
                        .filter(line => line.kind === 'item')
                        .map(line => {
                            const itemLine = line as ItemSaleLine;
                            const item = items.find(i => i.id === itemLine.itemId);
                            return {
                                id: itemLine.lineId,
                                itemId: itemLine.itemId,
                                itemName: item?.name || itemLine.description || itemLine.itemId,
                                siteId: siteId,
                                quantity: itemLine.quantity,
                                unitPrice: itemLine.unitPrice,
                                total: itemLine.quantity * itemLine.unitPrice
                            };
                        })
                }
                defaultSiteId={siteId}
            />

        </div>
    );
}
