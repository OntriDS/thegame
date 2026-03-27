'use client';

import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { NumericInput } from '@/components/ui/numeric-input';
import { Coins } from 'lucide-react';
import { Player } from '@/types/entities';
import { getZIndexClass } from '@/lib/utils/z-index-utils';
import { ClientAPI } from '@/lib/client-api';
import { hasConfiguredPlayerConversionRates } from '@/lib/constants/financial-constants';

interface ExchangePointsModalProps {
  player: Player | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onExchange: (pointsToExchange: { hp: number; fp: number; rp: number; xp: number }, j$Received: number) => Promise<void>;
}

export default function ExchangePointsModal({ player, open, onOpenChange, onExchange }: ExchangePointsModalProps) {
  const [hpToExchange, setHpToExchange] = useState(0);
  const [fpToExchange, setFpToExchange] = useState(0);
  const [rpToExchange, setRpToExchange] = useState(0);
  const [xpToExchange, setXpToExchange] = useState(0);
  const [conversionRates, setConversionRates] = useState<any | undefined>(undefined);
  const [isExchanging, setIsExchanging] = useState(false);

  useEffect(() => {
    if (open) {
      setConversionRates(undefined);
      const loadRates = async () => {
        const rates = await ClientAPI.getPlayerConversionRates();
        setConversionRates(rates ?? null);
      };
      loadRates();

      setHpToExchange(0);
      setFpToExchange(0);
      setRpToExchange(0);
      setXpToExchange(0);
    }
  }, [open]);

  if (!player) {
    return null;
  }

  const ratesConfigured =
    conversionRates !== undefined && hasConfiguredPlayerConversionRates(conversionRates);

  const activeRates = ratesConfigured ? conversionRates : null;

  const calculateJ$Preview = () => {
    if (!activeRates) return 0;
    return (
      (hpToExchange / activeRates.hpToJ$) +
      (fpToExchange / activeRates.fpToJ$) +
      (rpToExchange / activeRates.rpToJ$) +
      (xpToExchange / activeRates.xpToJ$)
    );
  };

  const j$Preview = Math.round(calculateJ$Preview() * 100) / 100;
  const usdValue = activeRates ? j$Preview * activeRates.j$ToUSD : 0;

  const canExchange =
    !!activeRates &&
    j$Preview > 0 &&
    hpToExchange <= (player.points?.hp || 0) &&
    fpToExchange <= (player.points?.fp || 0) &&
    rpToExchange <= (player.points?.rp || 0) &&
    xpToExchange <= (player.points?.xp || 0);

  const handleExchange = async () => {
    if (!canExchange || !activeRates) return;

    setIsExchanging(true);
    try {
      await onExchange(
        { hp: hpToExchange, fp: fpToExchange, rp: rpToExchange, xp: xpToExchange },
        j$Preview
      );
    } catch (error) {
      console.error('Exchange failed:', error);
      alert('Exchange failed. Please try again.');
    } finally {
      setIsExchanging(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className={`max-w-2xl ${getZIndexClass('CRITICAL')}`}>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Coins className="h-5 w-5" />
            Exchange Points for J$
          </DialogTitle>
        </DialogHeader>

        {conversionRates === undefined && (
          <p className="text-sm text-muted-foreground py-6">Loading conversion rates…</p>
        )}

        {conversionRates !== undefined && !ratesConfigured && (
          <p className="text-sm text-muted-foreground py-6">
            No saved point conversion rates yet. On the Player page, use <strong>Edit Conversion Rates</strong> and save — rates are read from the database only, not from code defaults.
          </p>
        )}

        {activeRates && (
          <div className="space-y-4 py-4">
            <Card className="bg-muted/30">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm">Available Points</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-4 gap-3 text-center">
                  {[
                    { key: 'XP', value: player.points?.xp || 0, color: 'bg-blue-500' },
                    { key: 'RP', value: player.points?.rp || 0, color: 'bg-green-500' },
                    { key: 'FP', value: player.points?.fp || 0, color: 'bg-yellow-500' },
                    { key: 'HP', value: player.points?.hp || 0, color: 'bg-red-500' },
                  ].map((point) => (
                    <div key={point.key}>
                      <div className="text-xs text-muted-foreground">{point.key}</div>
                      <div className="text-lg font-bold">{point.value}</div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm">Select Points to Exchange</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {[
                  { key: 'xp', label: 'XP', value: xpToExchange, setValue: setXpToExchange, max: player.points?.xp || 0, rate: activeRates.xpToJ$ },
                  { key: 'rp', label: 'RP', value: rpToExchange, setValue: setRpToExchange, max: player.points?.rp || 0, rate: activeRates.rpToJ$ },
                  { key: 'fp', label: 'FP', value: fpToExchange, setValue: setFpToExchange, max: player.points?.fp || 0, rate: activeRates.fpToJ$ },
                  { key: 'hp', label: 'HP', value: hpToExchange, setValue: setHpToExchange, max: player.points?.hp || 0, rate: activeRates.hpToJ$ },
                ].map((point) => (
                  <div key={point.key} className="flex items-center gap-3">
                    <div className="w-16 text-sm font-medium">{point.label}</div>
                    <NumericInput
                      min={0}
                      max={point.max}
                      value={point.value}
                      onChange={(value) => point.setValue(Math.floor(value) || 0)}
                      className="flex-1 px-3 py-2"
                    />
                    <div className="w-20 text-xs text-muted-foreground">Max: {point.max}</div>
                    <div className="w-20 text-xs text-muted-foreground">Rate: {point.rate}x</div>
                  </div>
                ))}
              </CardContent>
            </Card>

            <Card className="bg-primary/5">
              <CardContent className="pt-6">
                <div className="text-center">
                  <div className="text-2xl font-bold text-primary">{j$Preview.toFixed(2)} J$</div>
                  <div className="text-sm text-muted-foreground">≈ ${usdValue.toFixed(2)} USD</div>
                  <Button
                    onClick={handleExchange}
                    disabled={!canExchange || isExchanging}
                    className="mt-4"
                  >
                    {isExchanging ? 'Exchanging...' : 'Exchange Points'}
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
