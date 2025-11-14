'use client';

import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Target, Coins } from 'lucide-react';

// Content-only component for embedding in parent modals
export function PlayerStateContent({
  playerData,
  currentMonthMetrics,
  personalAssets,
  conversionRates
}: {
  playerData: any;
  currentMonthMetrics: any;
  personalAssets: any;
  conversionRates?: {
    xpToJ$?: number;
    rpToJ$?: number;
    fpToJ$?: number;
    hpToJ$?: number;
    j$ToUSD?: number;
  };
}) {
  // Calculate J$ value from available points
  const calculateJ$FromPoints = () => {
    const rates = conversionRates || {
      xpToJ$: 6,
      rpToJ$: 12,
      fpToJ$: 8,
      hpToJ$: 10,
      j$ToUSD: 10,
    };
    const safeDiv = (value: number, rate: number | undefined) =>
      rate && rate > 0 ? value / rate : 0;

    const xp = playerData?.points?.xp || 0;
    const rp = playerData?.points?.rp || 0;
    const fp = playerData?.points?.fp || 0;
    const hp = playerData?.points?.hp || 0;

    const xpPreview = safeDiv(xp, rates.xpToJ$);
    const rpPreview = safeDiv(rp, rates.rpToJ$);
    const fpPreview = safeDiv(fp, rates.fpToJ$);
    const hpPreview = safeDiv(hp, rates.hpToJ$);

    return xpPreview + rpPreview + fpPreview + hpPreview;
  };

  const j$Value = calculateJ$FromPoints();
  const usdValue = j$Value * (conversionRates?.j$ToUSD || 10);

  return (
    <div className="space-y-4">
      <Card className="border-2">
        <CardHeader className="pb-3">
          <CardTitle className="text-lg flex items-center gap-2">
            <Coins className="h-5 w-5 text-primary" />
            Current Points
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center mb-6">
            <div className="text-sm text-muted-foreground mb-2">Available Points</div>
            <div className="flex items-center justify-center gap-4">
              <div className="text-4xl font-extrabold tracking-tight">
                {((playerData?.points?.xp || 0) + (playerData?.points?.rp || 0) + (playerData?.points?.fp || 0) + (playerData?.points?.hp || 0))}
              </div>
              <div className="text-2xl font-bold text-green-600">
                ${usdValue.toFixed(2)}
              </div>
            </div>
            <div className="text-xs text-muted-foreground mt-2">
              ≈ {j$Value.toFixed(2)} J$ → ${(conversionRates?.j$ToUSD || 10).toFixed(2)} USD
            </div>
          </div>
          <div className="grid grid-cols-4 gap-4">
            {[
              { key: 'xp', label: 'XP', value: playerData?.points?.xp || 0 },
              { key: 'rp', label: 'RP', value: playerData?.points?.rp || 0 },
              { key: 'fp', label: 'FP', value: playerData?.points?.fp || 0 },
              { key: 'hp', label: 'HP', value: playerData?.points?.hp || 0 }
            ].map((point) => (
              <div key={point.key} className="p-4 rounded-lg border bg-muted/20">
                <div className="text-xs text-muted-foreground mb-1">{point.label}</div>
                <div className="text-2xl font-bold">{point.value}</div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

interface PlayerStateTabProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  playerData: any;
  currentMonthMetrics: any;
  personalAssets: any;
}

export default function PlayerStateTab({ 
  open, 
  onOpenChange, 
  playerData, 
  currentMonthMetrics, 
  personalAssets 
}: PlayerStateTabProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent zIndexLayer={'INNER_FIELDS'} className="w-full max-w-7xl max-h-[90vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-2xl">
            <Target className="h-6 w-6" />
            Player Current State • {playerData?.name}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 overflow-y-auto max-h-[calc(90vh-8rem)] pr-2">
          <Card className="border-2">
            <CardHeader className="pb-3">
              <CardTitle className="text-lg flex items-center gap-2">
                <Coins className="h-5 w-5 text-primary" />
                Current Points
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-center mb-6">
                <div className="text-sm text-muted-foreground">Available Points</div>
                <div className="text-4xl font-extrabold tracking-tight">
                  {((playerData?.points?.xp || 0) + (playerData?.points?.rp || 0) + (playerData?.points?.fp || 0) + (playerData?.points?.hp || 0))}
                </div>
              </div>
              <div className="grid grid-cols-4 gap-4">
                {[
                  { key: 'xp', label: 'XP', value: playerData?.points?.xp || 0 },
                  { key: 'rp', label: 'RP', value: playerData?.points?.rp || 0 },
                  { key: 'fp', label: 'FP', value: playerData?.points?.fp || 0 },
                  { key: 'hp', label: 'HP', value: playerData?.points?.hp || 0 }
                ].map((point) => (
                  <div key={point.key} className="p-4 rounded-lg border bg-muted/20">
                    <div className="text-xs text-muted-foreground mb-1">{point.label}</div>
                    <div className="text-2xl font-bold">{point.value}</div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </DialogContent>
    </Dialog>
  );
}
