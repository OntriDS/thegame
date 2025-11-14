'use client';

import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Coins, ArrowUpRight, ArrowDownRight, History } from 'lucide-react';
import { FinancialRecord } from '@/types/entities';
import { getZIndexClass } from '@/lib/utils/z-index-utils';
import { ClientAPI } from '@/lib/client-api';

interface PlayerJ$TransactionsModalProps {
  playerId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

type EnrichedFinancialRecord = FinancialRecord & {
  exchangeType?: 'POINTS_TO_J$' | 'J$_TO_USD' | 'J$_TO_ZAPS' | null;
};

export default function PlayerJ$TransactionsModal({ 
  playerId, 
  open, 
  onOpenChange 
}: PlayerJ$TransactionsModalProps) {
  const [transactions, setTransactions] = useState<EnrichedFinancialRecord[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (open && playerId) {
      const loadTransactions = async () => {
        setIsLoading(true);
        try {
          const records = await ClientAPI.getPlayerFinancialRecords(playerId);
          setTransactions(records);
        } catch (error) {
          console.error('Failed to load transactions:', error);
          setTransactions([]);
        } finally {
          setIsLoading(false);
        }
      };
      
      loadTransactions();
    }
  }, [open, playerId]);

  const getTransactionTypeLabel = (exchangeType?: string | null): string => {
    switch (exchangeType) {
      case 'POINTS_TO_J$':
        return 'Points → J$';
      case 'J$_TO_USD':
        return 'J$ → USD';
      case 'J$_TO_ZAPS':
        return 'J$ → Zaps';
      default:
        return 'J$ Transaction';
    }
  };

  const getTransactionIcon = (exchangeType?: string | null) => {
    if (exchangeType === 'POINTS_TO_J$') {
      return <ArrowUpRight className="h-4 w-4 text-green-600" />;
    } else if (exchangeType === 'J$_TO_USD' || exchangeType === 'J$_TO_ZAPS') {
      return <ArrowDownRight className="h-4 w-4 text-red-600" />;
    }
    return <Coins className="h-4 w-4 text-muted-foreground" />;
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className={`max-w-3xl ${getZIndexClass('CRITICAL')}`}>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <History className="h-5 w-5" />
            J$ Transaction History
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4 py-4 max-h-[70vh] overflow-y-auto">
          {isLoading ? (
            <div className="text-center py-8 text-muted-foreground">
              Loading transactions...
            </div>
          ) : transactions.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No J$ transactions yet
            </div>
          ) : (
            <div className="space-y-2">
              {transactions.map((transaction, index) => {
                const j$Amount = transaction.jungleCoins || 0;
                const isPositive = j$Amount > 0;
                
                // Calculate running balance: sum all transactions from this point forward (newest first)
                // Since transactions are sorted newest first, we sum from index to end, then reverse
                const transactionsFromThisPoint = transactions.slice(index);
                const balanceUpToThis = transactionsFromThisPoint.reduce((sum, t) => sum + (t.jungleCoins || 0), 0);
                
                return (
                  <Card key={transaction.id} className="border">
                    <CardContent className="pt-4">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            {getTransactionIcon(transaction.exchangeType)}
                            <span className="font-semibold text-sm">
                              {getTransactionTypeLabel(transaction.exchangeType)}
                            </span>
                            {transaction.station && (
                              <span className="text-xs text-muted-foreground">
                                • {transaction.station}
                              </span>
                            )}
                          </div>
                          {transaction.description && (
                            <div className="text-xs text-muted-foreground mb-2">
                              {transaction.description}
                            </div>
                          )}
                          <div className="text-xs text-muted-foreground">
                            {new Date(transaction.createdAt || '').toLocaleString()}
                          </div>
                        </div>
                        <div className="text-right ml-4">
                          <div className={`text-lg font-bold ${isPositive ? 'text-green-600' : 'text-red-600'}`}>
                            {isPositive ? '+' : ''}{j$Amount.toFixed(2)} J$
                          </div>
                          <div className="text-xs text-muted-foreground">
                            Balance: {balanceUpToThis.toFixed(2)} J$
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </div>
        
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

