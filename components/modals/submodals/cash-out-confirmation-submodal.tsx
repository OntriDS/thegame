'use client';

import React from 'react';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { NumericInput } from '@/components/ui/numeric-input';
import { Loader2 } from 'lucide-react';
import { DEFAULT_CURRENCY_EXCHANGE_RATES } from '@/lib/constants/financial-constants';
import { Character } from '@/types/entities';

interface CashOutConfirmationSubmodalProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    character: Character;
    balance: number;
    amount: number;
    onAmountChange: (value: number) => void;
    onConfirm: () => void;
    isProcessing: boolean;
}

export default function CashOutConfirmationSubmodal({
    open,
    onOpenChange,
    character,
    balance,
    amount,
    onAmountChange,
    onConfirm,
    isProcessing
}: CashOutConfirmationSubmodalProps) {

    // Guard: if closed or no character, render nothing (standard modal pattern)
    if (!character) return null;

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-sm" zIndexLayer="SUB_MODALS">
                <DialogHeader>
                    <DialogTitle>Exchange J$ to USD</DialogTitle>
                    <DialogDescription>
                        Cash out J$ from {character.name}&apos;s wallet.
                    </DialogDescription>
                </DialogHeader>

                <div className="space-y-4 py-4">
                    <div className="flex items-center justify-between bg-muted/30 p-3 rounded-md">
                        <span className="text-sm text-muted-foreground">Available Balance</span>
                        <span className="text-sm font-bold font-mono">{balance.toLocaleString()} J$</span>
                    </div>

                    <div className="space-y-2">
                        <Label className="text-xs">Amount to Cash Out (J$)</Label>
                        <NumericInput
                            value={amount}
                            onChange={(val) => {
                                // Strict Max Limit Enforcement
                                if (val > balance) {
                                    onAmountChange(balance);
                                } else {
                                    onAmountChange(val);
                                }
                            }}
                            placeholder="0"
                            className="text-center font-mono text-lg"
                            max={balance}
                        />
                        <div className="flex justify-end">
                            <Button
                                variant="link"
                                size="sm"
                                className="h-5 text-[10px] px-0 text-muted-foreground"
                                onClick={() => onAmountChange(balance)}
                            >
                                Max
                            </Button>
                        </div>
                    </div>

                    <div className="text-center text-sm text-muted-foreground bg-emerald-50 dark:bg-emerald-950/30 p-2 rounded-md border border-emerald-100 dark:border-emerald-900/50">
                        <span className="block text-xs font-medium text-emerald-800 dark:text-emerald-300 mb-1">
                            EXCHANGE SUMMARY
                        </span>
                        <span className="font-semibold text-foreground">
                            {character.name} receives:
                        </span>
                        <div className="text-lg font-bold text-emerald-600 dark:text-emerald-400 mt-1">
                            ${(amount * DEFAULT_CURRENCY_EXCHANGE_RATES.j$ToUSD).toLocaleString()} USD
                        </div>
                    </div>
                </div>

                <DialogFooter>
                    <Button variant="outline" size="sm" onClick={() => onOpenChange(false)}>Cancel</Button>
                    <Button
                        size="sm"
                        onClick={onConfirm}
                        disabled={amount <= 0 || isProcessing}
                        className="bg-emerald-600 hover:bg-emerald-700 text-white"
                    >
                        {isProcessing ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Confirm Exchange'}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
