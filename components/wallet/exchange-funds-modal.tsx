import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { NumericInput } from "@/components/ui/numeric-input";
import { Label } from "@/components/ui/label";
import { Loader2 } from "lucide-react";

interface ExchangeFundsModalProps {
    isOpen: boolean;
    onClose: () => void;
    characterId: string;
    currentBalance: number;
    onSuccess: () => void;
}

export function ExchangeFundsModal({ isOpen, onClose, characterId, currentBalance, onSuccess }: ExchangeFundsModalProps) {
    const [amount, setAmount] = useState<number>(0);
    const [note, setNote] = useState('');
    const [loading, setLoading] = useState(false);

    // Validate balance
    const isBalanceSufficient = amount <= currentBalance;

    const handleExchange = async () => {
        if (amount <= 0 || !isBalanceSufficient) return;

        try {
            setLoading(true);
            const res = await fetch(`/api/character/${characterId}/wallet/transaction`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ type: 'exchange', amount, note })
            });

            if (res.ok) {
                onSuccess();
                onClose();
                setAmount(0);
                setNote('');
            } else {
                console.error("Exchange failed");
            }
        } catch (error) {
            console.error("Exchange error", error);
        } finally {
            setLoading(false);
        }
    };

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="sm:max-w-[425px]" zIndexLayer="SUB_MODALS">
                <DialogHeader>
                    <DialogTitle>Exchange J$ (Reduce Balance)</DialogTitle>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                    <div className="grid grid-cols-4 items-center gap-4">
                        <Label htmlFor="current" className="text-right text-muted-foreground">
                            Current
                        </Label>
                        <div className="col-span-3 text-sm font-medium">
                            {currentBalance} J$
                        </div>
                    </div>
                    <div className="grid grid-cols-4 items-center gap-4">
                        <Label htmlFor="amount" className="text-right">
                            Amount (J$)
                        </Label>
                        <NumericInput
                            id="amount"
                            value={amount}
                            onChange={(val) => setAmount(val)}
                            className="col-span-3"
                            min={0}
                        />
                    </div>
                    {!isBalanceSufficient && (
                        <div className="text-xs text-rose-500 text-right col-span-4 pr-1">Insufficient Funds</div>
                    )}
                    <div className="grid grid-cols-4 items-center gap-4">
                        <Label htmlFor="note" className="text-right">
                            Note
                        </Label>
                        <Input
                            id="note"
                            placeholder="Reason (Cash Out, Purchase...)"
                            value={note}
                            onChange={(e) => setNote(e.target.value)}
                            className="col-span-3"
                        />
                    </div>
                </div>
                <DialogFooter>
                    <Button variant="outline" onClick={onClose} disabled={loading}>
                        Cancel
                    </Button>
                    <Button
                        className="bg-destructive hover:bg-destructive/90 text-white"
                        onClick={handleExchange}
                        disabled={loading || amount <= 0 || !isBalanceSufficient}
                    >
                        {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        Exchange (Deduct)
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
