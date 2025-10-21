'use client';

import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { TrendingUp, BarChart3, Calendar, Target } from 'lucide-react';
import { getZIndexClass } from '@/lib/utils/z-index-utils';

interface PlayerStatsTabProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  playerData: any;
  personalAssets: any;
}

export default function PlayerStatsTab({ 
  open, 
  onOpenChange, 
  playerData, 
  personalAssets 
}: PlayerStatsTabProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className={`w-full max-w-7xl max-h-[90vh] overflow-hidden ${getZIndexClass('MODAL_TABS')}`}>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-2xl">
            <TrendingUp className="h-6 w-6" />
            Player Stats • {playerData?.name}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Lifetime Points */}
          <Card className="border-2">
            <CardHeader className="pb-3">
              <CardTitle className="text-lg flex items-center gap-2">
                <Target className="h-5 w-5 text-primary" />
                Lifetime Points (All-Time Earned)
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-4 gap-4">
                {[
                  { key: 'xp', label: 'Total XP', value: playerData?.points?.xp || 0, color: 'bg-blue-500' },
                  { key: 'rp', label: 'Total RP', value: playerData?.points?.rp || 0, color: 'bg-green-500' },
                  { key: 'fp', label: 'Total FP', value: playerData?.points?.fp || 0, color: 'bg-yellow-500' },
                  { key: 'hp', label: 'Total HP', value: playerData?.points?.hp || 0, color: 'bg-red-500' }
                ].map((point) => (
                  <div key={point.key} className="text-center">
                    <div className={`w-16 h-16 rounded-full ${point.color} mx-auto mb-2 flex items-center justify-center text-white font-bold text-xl`}>
                      {point.value}
                    </div>
                    <div className="text-sm font-medium">{point.label}</div>
                  </div>
                ))}
              </div>
              <div className="mt-4 text-center">
                <div className="text-sm text-muted-foreground">All Points Ever Earned:</div>
                <div className="text-3xl font-bold text-primary">
                  {((playerData?.points?.xp || 0) + (playerData?.points?.rp || 0) + (playerData?.points?.fp || 0) + (playerData?.points?.hp || 0))}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Financial Overview */}
          <Card className="border-2 border-green-200 dark:border-green-800">
            <CardHeader className="pb-3">
              <CardTitle className="text-lg flex items-center gap-2">
                <BarChart3 className="h-5 w-5 text-green-600" />
                Financial Overview
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-6">
                <div className="space-y-4">
                  <div className="text-center">
                    <div className="text-2xl font-bold text-green-600">
                      {personalAssets?.jungleCoins?.toFixed(1) || '0.0'} J$
                    </div>
                    <div className="text-sm text-muted-foreground">Current Jungle Coins</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold">
                      ${personalAssets?.usdValue?.toFixed(2) || '0.00'}
                    </div>
                    <div className="text-sm text-muted-foreground">USD Value</div>
                  </div>
                </div>
                <div className="space-y-4">
                  <div className="text-center">
                    <div className="text-2xl font-bold">
                      ${personalAssets?.totalPurchased?.toFixed(2) || '0.00'}
                    </div>
                    <div className="text-sm text-muted-foreground">Total Purchased</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-blue-600">
                      {personalAssets?.conversionRate || '10.0'}x
                    </div>
                    <div className="text-sm text-muted-foreground">Conversion Rate</div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Activity Statistics */}
          <Card className="border-2">
            <CardHeader className="pb-3">
              <CardTitle className="text-lg flex items-center gap-2">
                <Calendar className="h-5 w-5 text-primary" />
                Activity Statistics
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-3 gap-4">
                <div className="text-center">
                  <div className="text-3xl font-bold text-primary">0</div>
                  <div className="text-sm text-muted-foreground">Tasks Completed</div>
                </div>
                <div className="text-center">
                  <div className="text-3xl font-bold text-green-600">0</div>
                  <div className="text-sm text-muted-foreground">Sales Made</div>
                </div>
                <div className="text-center">
                  <div className="text-3xl font-bold text-blue-600">0</div>
                  <div className="text-sm text-muted-foreground">Items Sold</div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </DialogContent>
    </Dialog>
  );
}
