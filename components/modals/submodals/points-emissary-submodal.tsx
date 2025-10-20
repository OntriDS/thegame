'use client';

import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import NumericInput from '@/components/ui/numeric-input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { getZIndexClass } from '@/lib/utils/z-index-utils';
import { Star } from 'lucide-react';

interface PointsData {
  points: {
    xp: number;
    rp: number;
    fp: number;
    hp: number;
  };
}

interface PointsEmissarySubModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initialData?: Partial<PointsData>;
  onSave: (data: PointsData) => void;
}

export default function PointsEmissarySubModal({
  open,
  onOpenChange,
  initialData = {},
  onSave,
}: PointsEmissarySubModalProps) {
  // Form state
  const [points, setPoints] = useState({
    xp: initialData.points?.xp || 0,
    rp: initialData.points?.rp || 0,
    fp: initialData.points?.fp || 0,
    hp: initialData.points?.hp || 0,
  });

  // Initialize form when modal opens
  useEffect(() => {
    if (open) {
      setPoints({
        xp: initialData.points?.xp || 0,
        rp: initialData.points?.rp || 0,
        fp: initialData.points?.fp || 0,
        hp: initialData.points?.hp || 0,
      });
    }
  }, [open, initialData]);

  const updatePoint = (type: keyof typeof points, value: number) => {
    setPoints(prev => ({ ...prev, [type]: value }));
  };

  const handleSave = () => {
    const data: PointsData = {
      points: { ...points },
    };
    onSave(data);
    onOpenChange(false);
  };

  const handleCancel = () => {
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className={`sm:max-w-[400px] ${getZIndexClass('MODALS')}`}>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Star className="h-5 w-5" />
            Point Rewards
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Points - Clean 2x2 Grid */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="xp">XP</Label>
              <NumericInput
                id="xp"
                value={points.xp}
                onChange={(value) => updatePoint('xp', value)}
                min={0}
                step={1}
                placeholder="0"
                className="h-8"
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="rp">RP</Label>
              <NumericInput
                id="rp"
                value={points.rp}
                onChange={(value) => updatePoint('rp', value)}
                min={0}
                step={1}
                placeholder="0"
                className="h-8"
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="fp">FP</Label>
              <NumericInput
                id="fp"
                value={points.fp}
                onChange={(value) => updatePoint('fp', value)}
                min={0}
                step={1}
                placeholder="0"
                className="h-8"
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="hp">HP</Label>
              <NumericInput
                id="hp"
                value={points.hp}
                onChange={(value) => updatePoint('hp', value)}
                min={0}
                step={1}
                placeholder="0"
                className="h-8"
              />
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleCancel}>
            Cancel
          </Button>
          <Button onClick={handleSave}>
            Save Points
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export type { PointsData };
