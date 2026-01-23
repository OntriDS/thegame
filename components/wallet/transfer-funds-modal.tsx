import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea"; // Assuming generic textarea exists or use Input for now
import { Loader2 } from "lucide-react";

interface TransferFundsModalProps {
    isOpen: boolean;
    onClose: () => void;
    characterId: string;
    onSuccess: () => void;
}

export function TransferFundsModal({ isOpen, onClose, characterId, onSuccess }: TransferFundsModalProps) {
    const [amount, setAmount] = useState<number>(0);
    const [note, setNote] = useState('');
    const [loading, setLoading] = useState(false);

    const handleTransfer = async () => {
        if (amount <= 0) return;

        try {
            setLoading(true);
            const res = await fetch(`/api/character/${characterId}/wallet/transaction`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ type: 'transfer', amount, note })
            });

            if (res.ok) {
                onSuccess();
                onClose();
                setAmount(0); // Reset
                setNote('');
            } else {
                console.error("Transfer failed");
                // Could show toast or error state
            }
        } catch (error) {
            console.error("Transfer error", error);
        } finally {
            setLoading(false);
        }
    };

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="sm:max-w-[425px]" zIndexLayer="SUB_MODALS">
                <DialogHeader>
                    <DialogTitle>Transfer J$ Funds</DialogTitle>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                    <div className="grid grid-cols-4 items-center gap-4">
                        <Label htmlFor="amount" className="text-right">
                            Amount (J$)
                        </Label>
                        <Input
                            id="amount"
                            type="number"
                            value={amount}
                            onChange={(e) => setAmount(Number(e.target.value))}
                            className="col-span-3"
                        />
                    </div>
                    <div className="grid grid-cols-4 items-center gap-4">
                        <Label htmlFor="note" className="text-right">
                            Note
                        </Label>
                        <Input
                            id="note"
                            placeholder="Reason for transfer (Bonus, Gift...)"
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
                    <Button onClick={handleTransfer} disabled={loading || amount <= 0}>
                        {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        Transfer Funds
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
