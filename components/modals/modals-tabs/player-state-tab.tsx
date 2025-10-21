'use client';

import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Target, TrendingUp, Flag, Coins, Award, ShoppingCart, Package, DollarSign } from 'lucide-react';
import { getZIndexClass } from '@/lib/utils/z-index-utils';

// Content-only component for embedding in parent modals
export function PlayerStateContent({
  playerData,
  currentMonthMetrics,
  personalAssets
}: {
  playerData: any;
  currentMonthMetrics: any;
  personalAssets: any;
}) {
  return (
    <div className="space-y-4">
      {/* Current Points (Uncollected) */}
      <Card className="border-2">
        <CardHeader className="pb-3">
          <CardTitle className="text-lg flex items-center gap-2">
            <Coins className="h-5 w-5 text-primary" />
            Current Points (Uncollected)
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-4 gap-4">
            {[
              { key: 'xp', label: 'XP', value: playerData?.points?.xp || 0, color: 'bg-blue-500' },
              { key: 'rp', label: 'RP', value: playerData?.points?.rp || 0, color: 'bg-green-500' },
              { key: 'fp', label: 'FP', value: playerData?.points?.fp || 0, color: 'bg-yellow-500' },
              { key: 'hp', label: 'HP', value: playerData?.points?.hp || 0, color: 'bg-red-500' }
            ].map((point) => (
              <div key={point.key} className="text-center">
                <div className={`w-12 h-12 rounded-full ${point.color} mx-auto mb-2 flex items-center justify-center text-white font-bold`}>
                  {point.value}
                </div>
                <div className="text-sm font-medium">{point.label}</div>
              </div>
            ))}
          </div>
          <div className="mt-4 text-center">
            <div className="text-sm text-muted-foreground">All Points Ever Earned:</div>
            <div className="text-2xl font-bold text-primary">
              {((playerData?.points?.xp || 0) + (playerData?.points?.rp || 0) + (playerData?.points?.fp || 0) + (playerData?.points?.hp || 0))}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Player Level & Progression */}
      <Card className="border-2 border-primary/30">
        <CardHeader className="pb-3">
          <CardTitle className="text-lg flex items-center gap-2">
            <Award className="h-5 w-5 text-primary" />
            Player Level & Progression
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center mb-4">
            <div className="text-3xl font-bold text-primary">Current Level: 0</div>
          </div>
          <div className="text-xs p-3 border rounded-lg bg-primary/5">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-4 h-4 bg-primary/20 rounded flex items-center justify-center">
                <Award className="h-3 w-3 text-primary" />
              </div>
              <span className="font-semibold">Level System Coming in V0.2</span>
            </div>
            <p className="text-muted-foreground">Experience-based progression, level unlocks, skill points, and more!</p>
          </div>
        </CardContent>
      </Card>

      {/* All-Time Activity Stats */}
      <Card className="border-2">
        <CardHeader className="pb-3">
          <CardTitle className="text-lg flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-primary" />
            All-Time Activity Stats
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">Total Tasks Completed:</span>
                <Badge variant="secondary" className="text-lg font-bold">0</Badge>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">Total Sales Made:</span>
                <Badge variant="secondary" className="text-lg font-bold">0</Badge>
              </div>
            </div>
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">Total Items Sold:</span>
                <Badge variant="secondary" className="text-lg font-bold">0</Badge>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">Max J$ Achieved:</span>
                <Badge variant="outline" className="text-lg font-bold text-green-600">0.0 J$</Badge>
              </div>
            </div>
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
      <DialogContent className={`w-full max-w-7xl max-h-[90vh] ${getZIndexClass('MODAL_TABS')}`}>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-2xl">
            <Target className="h-6 w-6" />
            Player State • {playerData?.name}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 overflow-y-auto max-h-[calc(90vh-8rem)] pr-2">
          {/* Current Points (Uncollected) */}
          <Card className="border-2">
            <CardHeader className="pb-3">
              <CardTitle className="text-lg flex items-center gap-2">
                <Coins className="h-5 w-5 text-primary" />
                Current Points (Uncollected)
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-4 gap-4">
                {[
                  { key: 'xp', label: 'XP', value: playerData?.points?.xp || 0, color: 'bg-blue-500' },
                  { key: 'rp', label: 'RP', value: playerData?.points?.rp || 0, color: 'bg-green-500' },
                  { key: 'fp', label: 'FP', value: playerData?.points?.fp || 0, color: 'bg-yellow-500' },
                  { key: 'hp', label: 'HP', value: playerData?.points?.hp || 0, color: 'bg-red-500' }
                ].map((point) => (
                  <div key={point.key} className="text-center">
                    <div className={`w-12 h-12 rounded-full ${point.color} mx-auto mb-2 flex items-center justify-center text-white font-bold`}>
                      {point.value}
                    </div>
                    <div className="text-sm font-medium">{point.label}</div>
                  </div>
                ))}
              </div>
              <div className="mt-4 text-center">
                <div className="text-sm text-muted-foreground">All Points Ever Earned:</div>
                <div className="text-2xl font-bold text-primary">
                  {((playerData?.points?.xp || 0) + (playerData?.points?.rp || 0) + (playerData?.points?.fp || 0) + (playerData?.points?.hp || 0))}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Player Level & Progression */}
          <Card className="border-2 border-primary/30">
            <CardHeader className="pb-3">
              <CardTitle className="text-lg flex items-center gap-2">
                <Award className="h-5 w-5 text-primary" />
                Player Level & Progression
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-center mb-4">
                <div className="text-3xl font-bold text-primary">Current Level: 0</div>
              </div>
              <div className="text-xs p-3 border rounded-lg bg-primary/5">
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-4 h-4 bg-primary/20 rounded flex items-center justify-center">
                    <Award className="h-3 w-3 text-primary" />
                  </div>
                  <span className="font-semibold">Level System Coming in V0.2</span>
                </div>
                <p className="text-muted-foreground">Experience-based progression, level unlocks, skill points, and more!</p>
              </div>
            </CardContent>
          </Card>

          {/* All-Time Activity Stats */}
          <Card className="border-2">
            <CardHeader className="pb-3">
              <CardTitle className="text-lg flex items-center gap-2">
                <TrendingUp className="h-5 w-5 text-primary" />
                All-Time Activity Stats
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-muted-foreground">Total Tasks Completed:</span>
                    <Badge variant="secondary" className="text-lg font-bold">0</Badge>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-muted-foreground">Total Sales Made:</span>
                    <Badge variant="secondary" className="text-lg font-bold">0</Badge>
                  </div>
                </div>
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-muted-foreground">Total Items Sold:</span>
                    <Badge variant="secondary" className="text-lg font-bold">0</Badge>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-muted-foreground">Max J$ Achieved:</span>
                    <Badge variant="outline" className="text-lg font-bold text-green-600">0.0 J$</Badge>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </DialogContent>
    </Dialog>
  );
}
