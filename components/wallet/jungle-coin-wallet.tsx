import React, { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Coins, ArrowRightLeft, History, PlusCircle, ArrowUpRight } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { TransferFundsModal } from "./transfer-funds-modal";
import { ExchangeFundsModal } from "./exchange-funds-modal";

interface JungleCoinWalletProps {
    characterId: string;
    className?: string;
    onBalanceChange?: () => void;
}

interface WalletData {
    characterId: string;
    characterName: string;
    cachedBalance: number;
    auditBalance: number;
    transactions: any[];
}

export function JungleCoinWallet({ characterId, className, onBalanceChange }: JungleCoinWalletProps) {
    const [data, setData] = useState<WalletData | null>(null);
    const [loading, setLoading] = useState(true);
    const [showHistory, setShowHistory] = useState(false);
    const [showTransferModal, setShowTransferModal] = useState(false);
    const [showExchangeModal, setShowExchangeModal] = useState(false);

    const fetchWalletData = useCallback(async () => {
        try {
            setLoading(true);
            const res = await fetch(`/api/character/${characterId}/wallet`);
            if (res.ok) {
                const json = await res.json();
                setData(json);
            }
        } catch (error) {
            console.error("Failed to fetch wallet data", error);
        } finally {
            setLoading(false);
        }
    }, [characterId]);

    useEffect(() => {
        fetchWalletData();
    }, [fetchWalletData]);

    if (loading) {
        return (
            <Card className={className}>
                <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                        <Coins className="h-4 w-4" /> Jungle Coin Wallet
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <Skeleton className="h-8 w-24 mb-2" />
                    <Skeleton className="h-4 w-full" />
                </CardContent>
            </Card>
        );
    }

    if (!data) return null;

    return (
        <Card className={className}>
            <CardHeader className="pb-2">
                <div className="flex justify-between items-center">
                    <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                        <Coins className="h-4 w-4 text-emerald-500" /> Jungle Coin Wallet
                    </CardTitle>
                    <Badge variant="outline" className="font-mono text-xs">
                        Ledger Verified
                    </Badge>
                </div>
            </CardHeader>
            <CardContent>
                {/* Balance Section */}
                <div className="flex items-baseline justify-between mb-4">
                    <div className="flex items-baseline gap-1">
                        <span className="text-3xl font-bold text-foreground">{data.cachedBalance}</span>
                        <span className="text-sm font-medium text-muted-foreground">J$</span>
                    </div>
                    {/* Simple Actions */}
                    <div className="flex gap-2">
                        <Button variant="outline" size="sm" className="h-8 gap-1" onClick={() => setShowTransferModal(true)}>
                            <PlusCircle className="h-3.5 w-3.5" /> Transfer
                        </Button>
                        <Button variant="outline" size="sm" className="h-8 gap-1" onClick={() => setShowExchangeModal(true)}>
                            <ArrowUpRight className="h-3.5 w-3.5" /> Exchange
                        </Button>
                    </div>
                </div>

                {/* Audit / Discrepancy Alert */}
                {data.cachedBalance !== data.auditBalance && (
                    <div className="bg-yellow-500/10 text-yellow-500 text-xs p-2 rounded mb-3 flex items-center gap-2">
                        <History className="h-3 w-3" />
                        <span>Cached ({data.cachedBalance}) !== Audit ({data.auditBalance}). Sync needed.</span>
                    </div>
                )}

                {/* History Manual Toggle */}
                <div className="border rounded-md">
                    <Button
                        variant="ghost"
                        className="w-full flex justify-between items-center py-2 h-auto hover:bg-transparent hover:underline"
                        onClick={() => setShowHistory(!showHistory)}
                    >
                        <span className="text-xs text-muted-foreground">View Transaction History ({data.transactions.length})</span>
                        {showHistory ? <ArrowUpRight className="h-3 w-3 rotate-180 transition-transform" /> : <ArrowUpRight className="h-3 w-3 rotate-90 transition-transform" />}
                    </Button>

                    {showHistory && (
                        <div className="p-2 pt-0 border-t">
                            <ScrollArea className="h-[200px] w-full pr-4">
                                <div className="space-y-3 pt-2">
                                    {data.transactions.map((record: any) => (
                                        <div key={record.id} className="flex justify-between items-start text-sm border-b border-border/50 pb-2 last:border-0">
                                            <div className="flex flex-col gap-0.5">
                                                <span className="font-medium text-foreground">{record.name}</span>
                                                <span className="text-xs text-muted-foreground">{new Date(record.createdAt).toLocaleDateString()}</span>
                                            </div>
                                            <div className={`font-mono font-medium ${record.jungleCoins > 0 ? 'text-emerald-500' : 'text-rose-500'}`}>
                                                {record.jungleCoins > 0 ? '+' : ''}{record.jungleCoins} J$
                                            </div>
                                        </div>
                                    ))}
                                    {data.transactions.length === 0 && (
                                        <div className="text-center text-xs text-muted-foreground py-4">No transactions found.</div>
                                    )}
                                </div>
                            </ScrollArea>
                        </div>
                    )}
                </div>

                {/* Modals */}
                <TransferFundsModal
                    isOpen={showTransferModal}
                    onClose={() => setShowTransferModal(false)}
                    characterId={characterId}
                    onSuccess={() => { fetchWalletData(); onBalanceChange?.(); }}
                />
                <ExchangeFundsModal
                    isOpen={showExchangeModal}
                    onClose={() => setShowExchangeModal(false)}
                    characterId={characterId}
                    currentBalance={data.cachedBalance}
                    onSuccess={() => { fetchWalletData(); onBalanceChange?.(); }}
                />

            </CardContent>
        </Card>
    );
}
