'use client';

import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { NumericInput } from '@/components/ui/numeric-input';
import { Coins, DollarSign, Zap } from 'lucide-react';
import { Player, Character } from '@/types/entities';
import { getZIndexClass } from '@/lib/utils/z-index-utils';
import { ClientAPI } from '@/lib/client-api';
import { CharacterRole } from '@/types/enums';
import { BITCOIN_SATOSHIS_PER_BTC } from '@/lib/constants/financial-constants';

interface CashOutJ$ModalProps {
  player: Player | null;
  playerCharacter: Character | null;
  currentJ$Balance: number;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCashOut: (j$Sold: number, cashOutType: 'USD' | 'ZAPS', j$Rate?: number, zapsRate?: number) => Promise<void>;
}

export default function CashOutJ$Modal({ 
  player, 
  playerCharacter, 
  currentJ$Balance, 
  open, 
  onOpenChange, 
  onCashOut 
}: CashOutJ$ModalProps) {
  const [j$ToCashOut, setJ$ToCashOut] = useState(0);
  const [cashOutType, setCashOutType] = useState<'USD' | 'ZAPS'>('USD');
  const [conversionRates, setConversionRates] = useState<any>(null);
  const [isCashingOut, setIsCashingOut] = useState(false);
  const [companyStation, setCompanyStation] = useState<'Founder' | 'Team' | null>(null);
  const [zapsRate, setZapsRate] = useState<number | undefined>(undefined);
  const [bitcoinPriceError, setBitcoinPriceError] = useState<string | null>(null);

  // Determine company station from character role
  useEffect(() => {
    if (playerCharacter) {
      if (playerCharacter.roles.includes(CharacterRole.FOUNDER)) {
        setCompanyStation('Founder');
      } else if (playerCharacter.roles.includes(CharacterRole.TEAM)) {
        setCompanyStation('Team');
      } else {
        setCompanyStation('Founder'); // Default to Founder
      }
    } else {
      setCompanyStation('Founder'); // Default to Founder if no character
    }
  }, [playerCharacter]);

  // Fetch conversion rates on modal open
  useEffect(() => {
    if (open) {
      const loadRates = async () => {
        try {
          const rates = await ClientAPI.getFinancialConversionRates();
          setConversionRates(rates);
          setBitcoinPriceError(null);
          
          // Calculate Zaps rate if Bitcoin price is available
          if (rates?.bitcoinToUsd && rates.bitcoinToUsd > 0) {
            const j$Rate = 10; // 1 J$ = $10 USD
            const calculatedZapsRate = (j$Rate / rates.bitcoinToUsd) * BITCOIN_SATOSHIS_PER_BTC;
            setZapsRate(calculatedZapsRate);
          } else {
            setBitcoinPriceError('Bitcoin price not available');
            setZapsRate(undefined);
          }
        } catch (error) {
          console.error('Failed to load conversion rates:', error);
          setBitcoinPriceError('Failed to load Bitcoin price');
          setZapsRate(undefined);
        }
      };
      loadRates();
      
      // Reset form
      setJ$ToCashOut(0);
      setCashOutType('USD');
    }
  }, [open]);

  if (!player) {
    return null;
  }

  const j$Rate = 10; // Default: 1 J$ = $10 USD

  // Calculate USD equivalent
  const usdEquivalent = j$ToCashOut * j$Rate;

  // Calculate Zaps equivalent
  const zapsEquivalent = zapsRate ? j$ToCashOut * zapsRate : 0;

  // Validation
  const canCashOut = j$ToCashOut > 0 && 
                     j$ToCashOut <= currentJ$Balance &&
                     (cashOutType === 'USD' || (cashOutType === 'ZAPS' && zapsRate !== undefined && !bitcoinPriceError));

  const handleCashOut = async () => {
    if (!canCashOut) return;
    
    setIsCashingOut(true);
    try {
      await onCashOut(
        j$ToCashOut,
        cashOutType,
        j$Rate,
        cashOutType === 'ZAPS' ? zapsRate : undefined
      );
    } catch (error) {
      console.error('Cash-out failed:', error);
      // Error handling is done in parent component
    } finally {
      setIsCashingOut(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className={`max-w-2xl ${getZIndexClass('CRITICAL')}`}>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Coins className="h-5 w-5" />
            Cash Out J$
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4 py-4">
          {/* Current Balance */}
          <Card className="bg-muted/30">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm">Current J$ Balance</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-center">
                <div className="text-3xl font-bold text-green-600">
                  {currentJ$Balance.toFixed(2)} J$
                </div>
                <div className="text-sm text-muted-foreground mt-1">
                  ≈ ${(currentJ$Balance * j$Rate).toFixed(2)} USD
                </div>
              </div>
            </CardContent>
          </Card>

          {/* J$ Amount Input */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm">Amount to Cash Out</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="flex items-center gap-3">
                  <div className="w-20 text-sm font-medium">J$ Amount</div>
                  <NumericInput
                    min={0}
                    max={currentJ$Balance}
                    value={j$ToCashOut}
                    onChange={(value) => setJ$ToCashOut(Math.max(0, Math.min(value, currentJ$Balance)))}
                    className="flex-1 px-3 py-2"
                    placeholder="0.00"
                  />
                  <div className="w-32 text-xs text-muted-foreground">
                    Max: {currentJ$Balance.toFixed(2)} J$
                  </div>
                </div>
                {j$ToCashOut > currentJ$Balance && (
                  <div className="text-sm text-red-600">
                    Amount exceeds available balance
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Cash-Out Type Selection */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm">Cash-Out Type</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex gap-3">
                <Button
                  type="button"
                  variant={cashOutType === 'USD' ? 'default' : 'outline'}
                  onClick={() => setCashOutType('USD')}
                  className="flex-1 flex items-center gap-2"
                >
                  <DollarSign className="h-4 w-4" />
                  USD
                </Button>
                <Button
                  type="button"
                  variant={cashOutType === 'ZAPS' ? 'default' : 'outline'}
                  onClick={() => setCashOutType('ZAPS')}
                  className="flex-1 flex items-center gap-2"
                  disabled={!zapsRate || !!bitcoinPriceError}
                >
                  <Zap className="h-4 w-4" />
                  Zaps
                </Button>
              </div>
              {bitcoinPriceError && (
                <div className="text-sm text-yellow-600 mt-2">
                  {bitcoinPriceError}. Zaps option is disabled.
                </div>
              )}
            </CardContent>
          </Card>

          {/* Preview */}
          <Card className="bg-primary/5">
            <CardContent className="pt-6">
              <div className="space-y-4">
                <div className="text-center">
                  <div className="text-sm text-muted-foreground mb-2">You will receive:</div>
                  {cashOutType === 'USD' ? (
                    <div className="text-3xl font-bold text-primary">
                      ${usdEquivalent.toFixed(2)} USD
                    </div>
                  ) : (
                    <div className="text-3xl font-bold text-primary">
                      {zapsEquivalent > 0 ? `${zapsEquivalent.toFixed(0)} sats` : 'N/A'}
                    </div>
                  )}
                </div>
                
                {companyStation && (
                  <div className="text-center text-sm text-muted-foreground">
                    Company station: <span className="font-semibold">{companyStation}</span>
                  </div>
                )}

                <Button 
                  onClick={handleCashOut}
                  disabled={!canCashOut || isCashingOut}
                  className="w-full mt-4"
                  size="lg"
                >
                  {isCashingOut ? 'Processing...' : `Cash Out ${j$ToCashOut.toFixed(2)} J$`}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
        
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

