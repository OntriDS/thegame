'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { getZIndexClass } from '@/lib/utils/z-index-utils';
import { getPointsConversionMetadata } from '@/lib/utils/points-utils';
import { DEFAULT_CURRENCY_EXCHANGE_RATES } from '@/lib/constants/financial-constants';

interface ConversionRatesModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (rates: {
    hpToJ$: number;
    fpToJ$: number;
    rpToJ$: number;
    xpToJ$: number;
    j$ToUSD: number;
    colonesToUsd: number;
    bitcoinToUsd: number;
  }) => void;
  initialRates?: {
    hpToJ$: number;
    fpToJ$: number;
    rpToJ$: number;
    xpToJ$: number;
    j$ToUSD: number;
    colonesToUsd: number;
    bitcoinToUsd: number;
  };
}

export default function ConversionRatesModal({ isOpen, onClose, onSave, initialRates }: ConversionRatesModalProps) {
  const [pointsRates, setPointsRates] = useState(initialRates || {
    hpToJ$: 1,
    fpToJ$: 1,
    rpToJ$: 1,
    xpToJ$: 1,
    j$ToUSD: 1,
  });
  const [currencyRates, setCurrencyRates] = useState(initialRates || DEFAULT_CURRENCY_EXCHANGE_RATES);

  const handleSave = () => {
    onSave({ ...pointsRates, ...currencyRates });
  };

  if (!isOpen) return null;

  return (
    <div className={`fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center ${getZIndexClass('MODALS')}`}>
      <div className="bg-white dark:bg-gray-800 rounded-lg p-6 w-full max-w-2xl mx-4">
        <h3 className="text-lg font-semibold mb-4">Edit Conversion Rates</h3>
        
        <div className="space-y-6">
          <div className="space-y-3">
            <h4 className="font-medium text-sm text-muted-foreground">Points to J$ Conversion</h4>
            <div className="grid grid-cols-2 gap-4">
              {getPointsConversionMetadata().map(({ key, label, description }) => (
                <div key={key} className="space-y-1">
                  <label className="block text-sm font-medium">{label}</label>
                  <div className="text-xs text-muted-foreground">{description}</div>
                  <Input
                    type="number"
                    value={pointsRates[key as keyof typeof pointsRates]}
                    onChange={(e) => setPointsRates({ ...pointsRates, [key]: parseInt(e.target.value) || 0 })}
                    min="1"
                    className="h-8"
                  />
                </div>
              ))}
              {/* J$ to USD conversion (not part of points metadata) */}
              <div className="space-y-1">
                <label className="block text-sm font-medium">J$ to USD</label>
                <div className="text-xs text-muted-foreground">Jungle Coins</div>
                <Input
                  type="number"
                  value={pointsRates.j$ToUSD}
                  onChange={(e) => setPointsRates({ ...pointsRates, j$ToUSD: parseInt(e.target.value) || 0 })}
                  min="1"
                  className="h-8"
                />
              </div>
            </div>
          </div>
          
          <div className="space-y-3">
            <h4 className="font-medium text-sm text-muted-foreground">Currency Exchange Rates</h4>
            <div className="grid grid-cols-3 gap-4">
              {[
                { key: 'colonesToUsd', label: '₡ to $', desc: 'Colones = $1' },
                { key: 'bitcoinToUsd', label: '₿ to $', desc: 'Bitcoin price' },
                { key: 'j$ToUSD', label: 'J$ to $', desc: '1 J$ = $10' }
              ].map(({ key, label, desc }) => (
                <div key={key} className="space-y-1">
                  <label className="block text-sm font-medium">{label}</label>
                  <div className="text-xs text-muted-foreground">{desc}</div>
                  <Input
                    type="number"
                    value={currencyRates[key as keyof typeof currencyRates]}
                    onChange={(e) => setCurrencyRates({ ...currencyRates, [key]: parseFloat(e.target.value) || 0 })}
                    min="0.01"
                    step="0.01"
                    className="h-8"
                  />
                </div>
              ))}
            </div>
          </div>
        </div>
        
        <div className="flex justify-end gap-2 mt-6">
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={handleSave}>
            Save Changes
          </Button>
        </div>
      </div>
    </div>
  );
}