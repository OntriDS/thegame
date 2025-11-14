'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { NumericInput } from '@/components/ui/numeric-input';
import { Label } from '@/components/ui/label';
import { getZIndexClass } from '@/lib/utils/z-index-utils';
import { PRICE_STEP, DECIMAL_STEP } from '@/lib/constants/app-constants';
import { BITCOIN_SATOSHIS_PER_BTC } from '@/lib/constants/financial-constants';
import { formatDecimal } from '@/lib/utils/financial-utils';

interface AssetsEditModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: any) => void;
  section: {
    type: 'company' | 'personal';
    section: 'monetary' | 'jungleCoins' | 'inventories' | 'otherAssets';
  };
  initialData: any;
  exchangeRates: {
    colonesToUsd: number;
    bitcoinToUsd: number;
    j$ToUSD: number;
  };
}

export default function AssetsEditModal({ isOpen, onClose, onSave, section, initialData, exchangeRates }: AssetsEditModalProps) {
  const [formData, setFormData] = useState(initialData);

  // String states for monetary fields to allow clearing and typing
  const [cashString, setCashString] = useState(formData.cash?.toString() || '0');
  const [bankString, setBankString] = useState(formData.bank?.toString() || '0');
  const [bitcoinString, setBitcoinString] = useState(formData.bitcoin?.toString() || '0');
  const [cryptoString, setCryptoString] = useState(formData.crypto?.toString() || '0');
  const [toChargeString, setToChargeString] = useState(formData.toCharge?.toString() || '0');
  const [toPayString, setToPayString] = useState(formData.toPay?.toString() || '0');

  // Sync string states when formData changes (when switching sections)
  useEffect(() => {
    setCashString(formData.cash?.toString() || '0');
    setBankString(formData.bank?.toString() || '0');
    setBitcoinString(formData.bitcoin?.toString() || '0');
    setCryptoString(formData.crypto?.toString() || '0');
    setToChargeString(formData.toCharge?.toString() || '0');
    setToPayString(formData.toPay?.toString() || '0');
  }, [formData]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(formData);
  };

  const renderMonetaryFields = () => (
    <div className="space-y-4">
      {/* Cash Row */}
      <div className="grid grid-cols-4 gap-2 items-center">
        <div className="flex items-center pt-4">
          <Label htmlFor="cash">Cash</Label>
        </div>
        <div>
          <Label htmlFor="cash" className="flex justify-center pb-1">$</Label>
          <NumericInput
            id="cash"
            value={formData.cash || 0}
            onChange={(value) => {
              setFormData({ ...formData, cash: value });
              setCashString(value.toString());
            }}
            placeholder="0"
            step={DECIMAL_STEP}
            min={0}
            className="px-3 py-2"
          />
        </div>
        <div>
          <Label htmlFor="cash-colones" className="flex justify-center pb-1">₡</Label>
          <NumericInput
            id="cash-colones"
            value={formData.cashColones || 0}
            onChange={(value) => setFormData({ ...formData, cashColones: value })}
            placeholder="0"
            step={DECIMAL_STEP}
            min={0}
            className="px-3 py-2"
          />
        </div>
        <div>
          <Label htmlFor="cash-total" className="flex justify-center pb-1">T$</Label>
          <Input
            id="cash-total"
            type="number"
            value={formatDecimal((formData.cash || 0) + (formData.cashColones || 0) / exchangeRates.colonesToUsd)}
            readOnly
            className="bg-muted px-3 py-2"
          />
        </div>
      </div>

      {/* Bank Row */}
      <div className="grid grid-cols-4 gap-2 items-center">
        <div className="flex items-center pt-4">
          <Label htmlFor="bank">Bank</Label>
        </div>
        <div>
          <Label htmlFor="bank" className="flex justify-center pb-1">$</Label>
          <NumericInput
            id="bank"
            value={formData.bank || 0}
            onChange={(value) => {
              setFormData({ ...formData, bank: value });
              setBankString(value.toString());
            }}
            placeholder="0"
            step={DECIMAL_STEP}
            min={0}
            className="px-3 py-2"
          />
        </div>
        <div>
          <Label htmlFor="bank-colones" className="flex justify-center pb-1">₡</Label>
          <NumericInput
            id="bank-colones"
            value={formData.bankColones || 0}
            onChange={(value) => setFormData({ ...formData, bankColones: value })}
            placeholder="0"
            step={DECIMAL_STEP}
            min={0}
            className="px-3 py-2"
          />
        </div>
        <div>
          <Label htmlFor="bank-total" className="flex justify-center pb-1">T$</Label>
          <Input
            id="bank-total"
            type="number"
            value={formatDecimal((formData.bank || 0) + (formData.bankColones || 0) / exchangeRates.colonesToUsd)}
            readOnly
            className="bg-muted px-3 py-2"
          />
        </div>
      </div>

      {/* Bitcoin Row */}
      <div className="grid grid-cols-4 gap-2 items-center">
        <div className="flex items-center pt-4">
          <Label htmlFor="bitcoin">Bitcoin</Label>
        </div>
        <div>
          <Label htmlFor="bitcoin" className="flex justify-center pb-1">$</Label>
          <NumericInput
            id="bitcoin"
            value={formData.bitcoin || 0}
            onChange={(value) => {
              setFormData({ ...formData, bitcoin: value });
              setBitcoinString(value.toString());
            }}
            placeholder="0"
            step={DECIMAL_STEP}
            min={0}
            className="px-3 py-2"
          />
        </div>
        <div>
          <Label htmlFor="bitcoin-sats" className="flex justify-center pb-1">₿ (sats)</Label>
          <NumericInput
            id="bitcoin-sats"
            value={formData.bitcoinSats || 0}
            onChange={(value) => setFormData({ ...formData, bitcoinSats: value })}
            placeholder="0"
            step={DECIMAL_STEP}
            min={0}
            className="px-3 py-2"
          />
        </div>
        <div>
          <Label htmlFor="bitcoin-total" className="flex justify-center pb-1">T$</Label>
          <Input
            id="bitcoin-total"
            type="number"
            value={formatDecimal((formData.bitcoin || 0) + ((formData.bitcoinSats || 0) / BITCOIN_SATOSHIS_PER_BTC) * exchangeRates.bitcoinToUsd)}
            readOnly
            className="bg-muted px-3 py-2"
          />
        </div>
      </div>

      {/* Crypto Row (Personal only) */}
      {section.type === 'personal' && (
        <div className="grid grid-cols-4 gap-2 items-center">
          <div className="flex items-center pt-4">
            <Label htmlFor="crypto">Crypto</Label>
          </div>
          <div>
            <Label htmlFor="crypto" className="flex justify-center pb-1">$</Label>
            <NumericInput
              id="crypto"
              value={formData.crypto || 0}
              onChange={(value) => {
                setFormData({ ...formData, crypto: value });
                setCryptoString(value.toString());
              }}
              placeholder="0"
              step={DECIMAL_STEP}
              min={0}
            />
          </div>
          <div>
            <Label htmlFor="crypto-empty" className="flex justify-center pb-1">-</Label>
            <Input
              id="crypto-empty"
              type="text"
              value=""
              readOnly
              className="bg-muted px-3 py-2"
              placeholder="-"
            />
          </div>
          <div>
            <Label htmlFor="crypto-total" className="flex justify-center pb-1">T$</Label>
            <Input
              id="crypto-total"
              type="number"
              value={formatDecimal(formData.crypto || 0)}
              readOnly
              className="bg-muted"
            />
          </div>
        </div>
      )}

      {/* ToCharge Row */}
      <div className="grid grid-cols-4 gap-2 items-center">
        <div className="flex items-center pt-4">
          <Label htmlFor="toCharge">ToCharge</Label>
        </div>
        <div>
          <Label htmlFor="toCharge" className="flex justify-center pb-1">$</Label>
          <NumericInput
            id="toCharge"
            value={formData.toCharge || 0}
            onChange={(value) => {
              setFormData({ ...formData, toCharge: value });
              setToChargeString(value.toString());
            }}
            placeholder="0"
            step={DECIMAL_STEP}
            min={0}
            className="px-3 py-2"
          />
        </div>
        <div>
          <Label htmlFor="toCharge-colones" className="flex justify-center pb-1">₡</Label>
          <NumericInput
            id="toCharge-colones"
            value={formData.toChargeColones || 0}
            onChange={(value) => setFormData({ ...formData, toChargeColones: value })}
            placeholder="0"
            step={DECIMAL_STEP}
            min={0}
            className="px-3 py-2"
          />
        </div>
        <div>
          <Label htmlFor="toCharge-total" className="flex justify-center pb-1">T$</Label>
          <Input
            id="toCharge-total"
            type="number"
            value={formatDecimal((formData.toCharge || 0) + (formData.toChargeColones || 0) / exchangeRates.colonesToUsd)}
            readOnly
            className="bg-muted px-3 py-2"
          />
        </div>
      </div>

      {/* ToPay Row */}
      <div className="grid grid-cols-4 gap-2 items-center">
        <div className="flex items-center pt-4">
          <Label htmlFor="toPay">ToPay (-)</Label>
        </div>
        <div>
          <Label htmlFor="toPay" className="flex justify-center pb-1">$</Label>
          <NumericInput
            id="toPay"
            value={formData.toPay || 0}
            onChange={(value) => {
              setFormData({ ...formData, toPay: value });
              setToPayString(value.toString());
            }}
            placeholder="0"
            step={DECIMAL_STEP}
            min={0}
            className="px-3 py-2"
          />
        </div>
        <div>
          <Label htmlFor="toPay-colones" className="flex justify-center pb-1">₡</Label>
          <NumericInput
            id="toPay-colones"
            value={formData.toPayColones || 0}
            onChange={(value) => setFormData({ ...formData, toPayColones: value })}
            placeholder="0"
            step={DECIMAL_STEP}
            min={0}
            className="px-3 py-2"
          />
        </div>
        <div>
          <Label htmlFor="toPay-total" className="flex justify-center pb-1">T$</Label>
          <Input
            id="toPay-total"
            type="number"
            value={formatDecimal((formData.toPay || 0) + (formData.toPayColones || 0) / exchangeRates.colonesToUsd)}
            readOnly
            className="bg-muted px-3 py-2"
          />
        </div>
      </div>
    </div>
  );

  const renderJungleCoinsFields = () => (
    <div>
      <Label htmlFor="jungleCoins">
        {section.type === 'company' ? 'Company J$' : 'Personal J$'}
      </Label>
      <NumericInput
        id="jungleCoins"
        value={section.type === 'company' ? formData.companyJ$ : formData.personalJ$}
        onChange={(value) => {
          if (section.type === 'company') {
            setFormData({ companyJ$: value });
          } else {
            setFormData({ personalJ$: value });
          }
        }}
        placeholder="0"
        step={PRICE_STEP}
        min={0}
      />
      <p className="text-xs text-muted-foreground mt-1">
        Value in USD: ${((section.type === 'company' ? formData.companyJ$ : formData.personalJ$) * exchangeRates.j$ToUSD).toLocaleString()}
      </p>
    </div>
  );

  const renderInventoryFields = () => (
    <div className="space-y-4">
      {Object.entries(formData).map(([key, item]: [string, any]) => (
        <div key={key} className="space-y-2">
          <Label className="capitalize">{key}</Label>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <Label htmlFor={`${key}-value`} className="text-xs">Value</Label>
              <NumericInput
                id={`${key}-value`}
                value={item.value}
                onChange={(value) => setFormData({
                  ...formData,
                  [key]: { ...item, value }
                })}
                placeholder="0.00"
                step={DECIMAL_STEP}
                min={0}
              />
            </div>
            <div>
              <Label htmlFor={`${key}-cost`} className="text-xs">Cost</Label>
              <NumericInput
                id={`${key}-cost`}
                value={item.cost}
                onChange={(value) => setFormData({
                  ...formData,
                  [key]: { ...item, cost: value }
                })}
                placeholder="0.00"
                step={DECIMAL_STEP}
                min={0}
              />
            </div>
          </div>
        </div>
      ))}
    </div>
  );

  const renderOtherAssetsFields = () => (
    <div className="space-y-4">
      <div>
        <Label htmlFor="vehicle">Vehicle</Label>
        <NumericInput
          id="vehicle"
          value={formData.vehicle || 0}
          onChange={(value) => setFormData({ ...formData, vehicle: value })}
          placeholder="0.00"
          step={DECIMAL_STEP}
          min={0}
        />
      </div>
      <div>
        <Label htmlFor="properties">Properties</Label>
        <NumericInput
          id="properties"
          value={formData.properties || 0}
          onChange={(value) => setFormData({ ...formData, properties: value })}
          placeholder="0.00"
          step={DECIMAL_STEP}
          min={0}
        />
      </div>
      <div>
        <Label htmlFor="nfts">NFTs</Label>
        <NumericInput
          id="nfts"
          value={formData.nfts || 0}
          onChange={(value) => setFormData({ ...formData, nfts: value })}
          placeholder="0.00"
          step={DECIMAL_STEP}
          min={0}
        />
      </div>
      <div>
        <Label htmlFor="other">Other</Label>
        <NumericInput
          id="other"
          value={formData.other || 0}
          onChange={(value) => setFormData({ ...formData, other: value })}
          placeholder="0.00"
          step={DECIMAL_STEP}
          min={0}
        />
      </div>
    </div>
  );

  const getSectionTitle = () => {
    const type = section.type === 'company' ? 'Company' : 'Personal';
    switch (section.section) {
      case 'monetary': return `${type} Monetary Assets`;
      case 'jungleCoins': return `${type} J$`;
      case 'inventories': return `${type} Inventories`;
      case 'otherAssets': return `${type} Other Assets`;
      default: return `${type} Assets`;
    }
  };

  const renderFields = () => {
    switch (section.section) {
      case 'monetary': return renderMonetaryFields();
      case 'jungleCoins': return renderJungleCoinsFields();
      case 'inventories': return renderInventoryFields();
      case 'otherAssets': return renderOtherAssetsFields();
      default: return null;
    }
  };

  if (!isOpen) return null;

  return (
    <div className={`fixed inset-0 bg-black/50 flex items-center justify-center ${getZIndexClass('SUBTABS')}`}>
      <Card className="w-full max-w-md mx-4 max-h-[90vh] overflow-y-auto">
        <CardHeader>
          <CardTitle>Edit {getSectionTitle()}</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            {renderFields()}
            <div className="flex gap-2 pt-4">
              <Button type="submit" className="flex-1">Save Changes</Button>
              <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
