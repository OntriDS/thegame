'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { NumericInput } from '@/components/ui/numeric-input';
import { Label } from '@/components/ui/label';
import { getZIndexClass } from '@/lib/utils/z-index-utils';
import { getPointsConversionMetadata } from '@/lib/utils/points-utils';
import { createEmptyPlayerConversionRatesForm } from '@/lib/constants/financial-constants';

interface ConversionRatesModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (rates: {
    xpToJ$: number;
    rpToJ$: number;
    fpToJ$: number;
    hpToJ$: number;
    j$ToUSD: number;
    colonesToUsd: number;
    bitcoinToUsd: number;
  }) => void;
  initialRates?: {
    xpToJ$: number;
    rpToJ$: number;
    fpToJ$: number;
    hpToJ$: number;
    j$ToUSD: number;
    colonesToUsd: number;
    bitcoinToUsd: number;
  };
}

export default function ConversionRatesModal({ isOpen, onClose, onSave, initialRates }: ConversionRatesModalProps) {
  const empty = createEmptyPlayerConversionRatesForm();
  const [pointsRates, setPointsRates] = useState({
    xpToJ$: initialRates?.xpToJ$ ?? empty.xpToJ$,
    rpToJ$: initialRates?.rpToJ$ ?? empty.rpToJ$,
    fpToJ$: initialRates?.fpToJ$ ?? empty.fpToJ$,
    hpToJ$: initialRates?.hpToJ$ ?? empty.hpToJ$,
  });
  const [currencyRates, setCurrencyRates] = useState({
    colonesToUsd: initialRates?.colonesToUsd ?? empty.colonesToUsd,
    bitcoinToUsd: initialRates?.bitcoinToUsd ?? empty.bitcoinToUsd,
    j$ToUSD: initialRates?.j$ToUSD ?? empty.j$ToUSD,
  });

  // Update state when initialRates changes (e.g., when modal opens with new data)
  useEffect(() => {
    if (initialRates) {
      const d = createEmptyPlayerConversionRatesForm();
      setPointsRates({
        xpToJ$: initialRates.xpToJ$ ?? d.xpToJ$,
        rpToJ$: initialRates.rpToJ$ ?? d.rpToJ$,
        fpToJ$: initialRates.fpToJ$ ?? d.fpToJ$,
        hpToJ$: initialRates.hpToJ$ ?? d.hpToJ$,
      });
      setCurrencyRates({
        colonesToUsd: initialRates.colonesToUsd ?? d.colonesToUsd,
        bitcoinToUsd: initialRates.bitcoinToUsd ?? d.bitcoinToUsd,
        j$ToUSD: initialRates.j$ToUSD ?? d.j$ToUSD,
      });
    }
  }, [initialRates, isOpen]);

  const handleSave = () => {
    const merged = { ...pointsRates, ...currencyRates };
    if (
      merged.xpToJ$ < 1 ||
      merged.rpToJ$ < 1 ||
      merged.fpToJ$ < 1 ||
      merged.hpToJ$ < 1 ||
      merged.j$ToUSD <= 0 ||
      merged.colonesToUsd <= 0 ||
      merged.bitcoinToUsd <= 0
    ) {
      window.alert('Set every rate to a positive value before saving (XP/RP/FP/HP need at least 1 point per J$).');
      return;
    }
    onSave(merged);
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
                  <NumericInput
                    value={pointsRates[key as keyof typeof pointsRates]}
                    onChange={(value) => setPointsRates({ ...pointsRates, [key]: Math.floor(value) || 0 })}
                    min={0}
                    className="h-8"
                  />
                </div>
              ))}
            </div>
          </div>
          
          <div className="space-y-3">
            <h4 className="font-medium text-sm text-muted-foreground">Currency Exchange Rates</h4>
            <div className="grid grid-cols-3 gap-4">
              {[
                { key: 'colonesToUsd', label: '₡ to $', desc: 'Colones per $1 USD' },
                {
                  key: 'bitcoinToUsd',
                  label: '₿ fallback (USD/BTC)',
                  desc: 'Used when live Bitcoin price cannot be loaded (e.g. API offline)',
                },
                { key: 'j$ToUSD', label: 'J$ to $', desc: 'USD value of 1 J$' },
              ].map(({ key, label, desc }) => (
                <div key={key} className="space-y-1">
                  <label className="block text-sm font-medium">{label}</label>
                  <div className="text-xs text-muted-foreground">{desc}</div>
                  <NumericInput
                    value={currencyRates[key as keyof typeof currencyRates]}
                    onChange={(value) => setCurrencyRates({ ...currencyRates, [key]: value || 0 })}
                    min={0.01}
                    step={0.01}
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