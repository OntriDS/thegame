'use client';

import React, { useEffect, useState } from 'react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { SearchableSelect } from '@/components/ui/searchable-select';
import { DatePicker } from '@/components/ui/date-picker';
import NumericInput from '@/components/ui/numeric-input';
import {
  ModalToggleTooltip,
  MODAL_TOGGLE_TOOLTIP_COPY,
} from '@/components/ui/modal-toggle-tooltip';
import { Package, Gift, ListPlus } from 'lucide-react';
import type { Station } from '@/types/type-aliases';
import { Discount, Task, Character, Item, Site, SaleLine } from '@/types/entities';
import { TaskType } from '@/types/enums';
import { createSiteOptionsWithCategories } from '@/lib/utils/site-options-utils';
import { createStationCategoryOptions, createTaskParentOptions, getCategoryFromCombined, getStationFromCombined } from '@/lib/utils/searchable-select-utils';
import { formatItemTypeSubtypeLabel, getStationValue } from '@/lib/utils/sales-modal-utils';
import type { SaleItemLine } from './submodals/sale-items-submodal';

export interface SalesModalDirectContentCommonProps {
  saleDate: Date;
  setSaleDate: (date: Date) => void;
  emissaryColumnExpanded: boolean;
  showAdvanced: boolean;
  toggleAdvanced: () => void;
  siteId: string;
  setSiteId: (value: string) => void;
  customerId: string | null;
  setCustomerId: (value: string | null) => void;
  isNewCustomer: boolean;
  setIsNewCustomer: (value: boolean) => void;
  newCustomerName: string;
  setNewCustomerName: (value: string) => void;
  onOpenItemsSubModal: () => void;
  selectedItems: SaleItemLine[];
  items: Item[];
  selectedItemsSubtotal: number;
  cost: number;
  onCostChange: (value: number) => void;
  revenue: number;
  onRevenueChange: (value: number) => void;
  isNotPaid: boolean;
  setIsNotPaid: (value: boolean) => void;
  isNotCharged: boolean;
  setIsNotCharged: (value: boolean) => void;
  updateSaleStatus: (isNotCharged: boolean) => void;
  playerPoints: { xp: number; rp: number; fp: number; hp: number };
  setPlayerPoints: React.Dispatch<React.SetStateAction<{ xp: number; rp: number; fp: number; hp: number }>>;
  description: string;
  setDescription: (value: string) => void;
  overallDiscount: Discount;
  setOverallDiscount: React.Dispatch<React.SetStateAction<Discount>>;
  characters: Character[];
  sites: Site[];
}

export interface SalesModalDirectContentServiceProps {
  tasks: Task[];
  taskName: string;
  setTaskName: (value: string) => void;
  taskType: TaskType;
  setTaskType: (value: TaskType) => void;
  taskParentId: string;
  setTaskParentId: (value: string) => void;
  taskStation: Station;
  setTaskStation: (station: Station) => void;
  onOpenTaskItemSubModal: () => void;
  onOpenTaskPointsSubModal: () => void;
}

export interface SalesModalDirectContentModeProps {
  initialWhatKind: 'product' | 'service';
  onWhatKindChange: (kind: 'product' | 'service') => void;
  isWhatKindToggleDisabled: boolean;
  lines: SaleLine[];
  showValidationError: (message: string) => void;
  showWhatKindToggle?: boolean;
}

export interface SalesModalDirectContentProps extends
  SalesModalDirectContentCommonProps,
  SalesModalDirectContentModeProps,
  SalesModalDirectContentServiceProps {}

const UNKNOWN_SALE_ITEM_LABEL = 'Unknown item';

export default function SalesModalDirectContent({
  saleDate,
  setSaleDate,
  emissaryColumnExpanded,
  showAdvanced,
  toggleAdvanced,
  siteId,
  setSiteId,
  customerId,
  setCustomerId,
  isNewCustomer,
  setIsNewCustomer,
  newCustomerName,
  setNewCustomerName,
  onOpenItemsSubModal,
  selectedItems,
  items,
  selectedItemsSubtotal,
  cost,
  onCostChange,
  revenue,
  onRevenueChange,
  isNotPaid,
  setIsNotPaid,
  isNotCharged,
  setIsNotCharged,
  updateSaleStatus,
  playerPoints,
  setPlayerPoints,
  description,
  setDescription,
  overallDiscount,
  setOverallDiscount,
  tasks,
  taskName,
  setTaskName,
  taskType,
  setTaskType,
  taskParentId,
  setTaskParentId,
  taskStation,
  setTaskStation,
  onOpenTaskItemSubModal,
  onOpenTaskPointsSubModal,
  initialWhatKind,
  onWhatKindChange,
  isWhatKindToggleDisabled,
  showWhatKindToggle = false,
  lines,
  showValidationError,
  characters,
  sites,
}: SalesModalDirectContentProps) {
  const [whatKind, setWhatKind] = useState<'product' | 'service'>(initialWhatKind);

  useEffect(() => {
    setWhatKind(initialWhatKind);
  }, [initialWhatKind]);

  useEffect(() => {
    onWhatKindChange(whatKind);
  }, [whatKind, onWhatKindChange]);

  const handleWhatKindToggle = () => {
    if (isWhatKindToggleDisabled) {
      return;
    }

    const newKind = whatKind === 'product' ? 'service' : 'product';

    if (lines.length > 0) {
      const existingKinds = new Set(lines.map(line => line.kind));

      if (newKind === 'product' && existingKinds.has('service')) {
        showValidationError('Cannot switch to Product mode. This sale already has service lines. Please clear all lines first.');
        return;
      }

      if (newKind === 'service' && existingKinds.has('item')) {
        showValidationError('Cannot switch to Service mode. This sale already has product lines. Please clear all lines first.');
        return;
      }
    }

    const nextKind = newKind;
    setWhatKind(nextKind);
  };

  const customerOptions = characters.map((char) => ({
    value: char.id,
    label: char.name,
    group: char.roles && char.roles.length > 0 ? char.roles[0] : 'Other',
  }));

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-hidden border-b border-border/80">
      <div className="min-h-0 flex-1 space-y-4 overflow-y-auto px-6 py-4">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">Date:</span>
            <div className="min-w-[220px]">
              <DatePicker
                value={saleDate}
                onChange={(date) => setSaleDate(date || new Date())}
              />
            </div>
          </div>
          {showWhatKindToggle && (
            <Button
              size="sm"
              variant="outline"
              onClick={handleWhatKindToggle}
              className={`h-8 shrink-0 px-3 text-xs ${isWhatKindToggleDisabled ? 'opacity-50 cursor-not-allowed' : ''}`}
              disabled={isWhatKindToggleDisabled}
              title={isWhatKindToggleDisabled ? 'Product/Service type cannot be changed after creation' : 'Toggle between Product and Service'}
            >
              {whatKind === 'product' ? 'Product' : 'Service'}
            </Button>
          )}
        </div>

        {whatKind === 'product' && (
          <>
            <div className={`grid gap-4 ${emissaryColumnExpanded ? 'grid-cols-4' : 'grid-cols-3'} mb-2`}>
              <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Ambassadors</div>
              <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Ambassadors</div>
              <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Ambassadors</div>
              {emissaryColumnExpanded && (
                <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Emissaries</div>
              )}
            </div>

            <div className={`grid gap-4 ${emissaryColumnExpanded ? 'grid-cols-4' : 'grid-cols-3'}`}>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="site" className="text-xs">Site</Label>
                  <SearchableSelect
                    value={siteId}
                    onValueChange={setSiteId}
                    options={createSiteOptionsWithCategories(sites)}
                    autoGroupByCategory={true}
                    placeholder="Select site"
                    className="h-8 text-sm"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="customer" className="text-xs">Customer</Label>
                  <ModalToggleTooltip content={MODAL_TOGGLE_TOOLTIP_COPY.newExistingCustomer}>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setIsNewCustomer(!isNewCustomer)}
                      className={`h-6 text-xs px-2`}
                    >
                      {isNewCustomer ? 'New' : 'Existing'}
                    </Button>
                  </ModalToggleTooltip>
                  {isNewCustomer ? (
                    <Input
                      id="customer"
                      value={newCustomerName}
                      onChange={(e) => setNewCustomerName(e.target.value)}
                      placeholder="New customer name"
                      className="h-8 text-sm"
                    />
                  ) : (
                    <SearchableSelect
                      value={customerId || ''}
                      onValueChange={setCustomerId}
                      options={customerOptions}
                      autoGroupByCategory={true}
                      placeholder="Select customer"
                      className="h-8 text-sm"
                    />
                  )}
                </div>

                <Button
                  size="sm"
                  variant="outline"
                  onClick={toggleAdvanced}
                  className={`h-8 w-full text-xs ${showAdvanced ? 'bg-transparent text-white' : 'bg-muted text-muted-foreground'}`}
                >
                  Advanced
                </Button>
              </div>

              <div className="space-y-4">
                <div className="space-y-2">
                  <Label className="text-xs">Selected Items</Label>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={onOpenItemsSubModal}
                    className="h-12 w-full text-xs"
                  >
                    <ListPlus className="mr-2 h-4 w-4" />
                    {selectedItems.length > 0 ? `Edit Items (${selectedItems.length})` : 'Add Items'}
                  </Button>
                </div>
                {selectedItems.length > 0 && (
                  <div className="rounded-md border bg-muted/20 p-2">
                    <div
                      className="grid gap-x-2 gap-y-1 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground"
                      style={{
                        gridTemplateColumns: 'minmax(0,1.1fr) minmax(0,1fr) auto auto auto',
                      }}
                    >
                      <div className="truncate">Item</div>
                      <div className="truncate">Type / Subtype</div>
                      <div className="text-right">Qty Sold</div>
                      <div className="text-right">Price</div>
                      <div className="text-right">Total</div>
                    </div>
                    <div className="mt-1 space-y-0.5 border-t border-border/60 pt-1">
                      {selectedItems.map((row) => (
                        <div
                          key={row.id}
                          className="grid gap-x-2 gap-y-0 text-[11px] text-foreground"
                          style={{
                            gridTemplateColumns: 'minmax(0,1.1fr) minmax(0,1fr) auto auto auto',
                          }}
                        >
                          <span className="min-w-0 truncate" title={row.itemName}>
                            {row.itemName || UNKNOWN_SALE_ITEM_LABEL}
                          </span>
                          <span className="min-w-0 truncate text-muted-foreground" title={formatItemTypeSubtypeLabel(row.itemId, items)}>
                            {formatItemTypeSubtypeLabel(row.itemId, items)}
                          </span>
                          <span className="text-right tabular-nums">{row.quantity ?? 0}</span>
                          <span className="text-right tabular-nums">${(row.unitPrice || 0).toFixed(2)}</span>
                          <span className="text-right font-medium tabular-nums">${(row.total || 0).toFixed(2)}</span>
                        </div>
                      ))}
                    </div>
                    <div className="mt-2 flex items-center justify-end gap-2 border-t border-border/60 pt-2">
                      <span className="text-muted-foreground">Grand Total</span>
                      <span className="text-xl font-bold tabular-nums text-foreground">${selectedItemsSubtotal.toFixed(2)}</span>
                    </div>
                  </div>
                )}
              </div>

              <div className="space-y-4">
                <div className="space-y-2">
                  <Label className="text-xs">Cost & Revenue</Label>
                  <div className="grid grid-cols-2 gap-2">
                    <div className="space-y-2">
                      <Label htmlFor="cost" className="text-xs">Cost</Label>
                      <NumericInput
                        id="cost"
                        value={cost}
                        onChange={onCostChange}
                        min={0}
                        step={1}
                        placeholder="0.00"
                        className="h-8 text-sm"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="revenue" className="text-xs">Revenue</Label>
                      <NumericInput
                        id="revenue"
                        value={revenue}
                        onChange={onRevenueChange}
                        min={0}
                        step={1}
                        placeholder="0.00"
                        className="h-8 text-sm"
                      />
                    </div>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label className="text-xs">Payment Status</Label>
                  <div className="grid grid-cols-2 gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setIsNotPaid(!isNotPaid)}
                      className={`h-8 text-xs ${isNotPaid ? 'border-orange-500 text-orange-600' : ''}`}
                    >
                      {isNotPaid ? "⚠ Not Paid" : "✓ Paid"}
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        const newIsNotCharged = !isNotCharged;
                        setIsNotCharged(newIsNotCharged);
                        updateSaleStatus(newIsNotCharged);
                      }}
                      className={`h-8 text-xs ${isNotCharged ? 'border-orange-500 text-orange-600' : ''}`}
                    >
                      {isNotCharged ? "⚠ Not Charged" : "✓ Charged"}
                    </Button>
                  </div>
                </div>
              </div>

              {emissaryColumnExpanded && (
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label className="text-xs">Point Rewards</Label>
                    <div className="grid grid-cols-4 gap-2">
                      <div>
                        <Label htmlFor="multiple-reward-xp" className="text-xs">XP</Label>
                        <NumericInput
                          id="multiple-reward-xp"
                          value={playerPoints.xp}
                          onChange={(value) => setPlayerPoints({ ...playerPoints, xp: value })}
                          min={0}
                          step={1}
                          className="h-8 text-sm"
                        />
                      </div>
                      <div>
                        <Label htmlFor="multiple-reward-rp" className="text-xs">RP</Label>
                        <NumericInput
                          id="multiple-reward-rp"
                          value={playerPoints.rp}
                          onChange={(value) => setPlayerPoints({ ...playerPoints, rp: value })}
                          min={0}
                          step={1}
                          className="h-8 text-sm"
                        />
                      </div>
                      <div>
                        <Label htmlFor="multiple-reward-fp" className="text-xs">FP</Label>
                        <NumericInput
                          id="multiple-reward-fp"
                          value={playerPoints.fp}
                          onChange={(value) => setPlayerPoints({ ...playerPoints, fp: value })}
                          min={0}
                          step={1}
                          className="h-8 text-sm"
                        />
                      </div>
                      <div>
                        <Label htmlFor="multiple-reward-hp" className="text-xs">HP</Label>
                        <NumericInput
                          id="multiple-reward-hp"
                          value={playerPoints.hp}
                          onChange={(value) => setPlayerPoints({ ...playerPoints, hp: value })}
                          min={0}
                          step={1}
                          className="h-8 text-sm"
                        />
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {showAdvanced && (
              <div className="mt-4 space-y-4">
                <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Native</div>
                <div className="grid grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="description" className="text-xs">Description</Label>
                    <Textarea
                      id="description"
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      placeholder="Additional sale details..."
                      className="h-16 resize-none text-sm"
                      rows={3}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="discountAmount" className="text-xs">Discount Amount</Label>
                    <NumericInput
                      id="discountAmount"
                      value={overallDiscount.amount || 0}
                      onChange={(value) => setOverallDiscount({
                        ...overallDiscount,
                        amount: value > 0 ? value : undefined,
                        percent: value > 0 ? undefined : overallDiscount.percent,
                      })}
                      min={0}
                      step={1}
                      placeholder="0.00"
                      className="h-8 text-sm"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="discountPercent" className="text-xs">Discount Percent (%)</Label>
                    <NumericInput
                      id="discountPercent"
                      value={overallDiscount.percent || 0}
                      onChange={(value) => setOverallDiscount({
                        ...overallDiscount,
                        percent: value > 0 && value <= 100 ? value : undefined,
                        amount: value > 0 ? undefined : overallDiscount.amount,
                      })}
                      min={0}
                      step={1}
                      placeholder="0"
                      className="h-8 text-sm"
                    />
                  </div>
                </div>
              </div>
            )}
          </>
        )}

        {whatKind === 'service' && (
          <>
            <div className={`grid gap-4 ${emissaryColumnExpanded ? 'grid-cols-4' : 'grid-cols-3'} mb-2`}>
              <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Ambassadors</div>
              <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Ambassadors</div>
              <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Ambassadors</div>
              {emissaryColumnExpanded && (
                <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Emissaries</div>
              )}
            </div>

            <div className={`grid gap-4 ${emissaryColumnExpanded ? 'grid-cols-4' : 'grid-cols-3'}`}>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="site" className="text-xs">Site</Label>
                  <SearchableSelect
                    value={siteId}
                    onValueChange={setSiteId}
                    options={createSiteOptionsWithCategories(sites)}
                    autoGroupByCategory={true}
                    placeholder="Select site"
                    className="h-8 text-sm"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="customer" className="text-xs">Customer</Label>
                  <ModalToggleTooltip content={MODAL_TOGGLE_TOOLTIP_COPY.newExistingCustomer}>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setIsNewCustomer(!isNewCustomer)}
                      className={`h-6 text-xs px-2`}
                    >
                      {isNewCustomer ? 'New' : 'Existing'}
                    </Button>
                  </ModalToggleTooltip>
                  {isNewCustomer ? (
                    <Input
                      id="customer"
                      value={newCustomerName}
                      onChange={(e) => setNewCustomerName(e.target.value)}
                      placeholder="New customer name"
                      className="h-8 text-sm"
                    />
                  ) : (
                    <SearchableSelect
                      value={customerId || ''}
                      onValueChange={setCustomerId}
                      options={customerOptions}
                      autoGroupByCategory={true}
                      placeholder="Select customer"
                      className="h-8 text-sm"
                    />
                  )}
                </div>
              </div>

              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="taskName" className="text-xs">Task Name</Label>
                  <Input
                    id="taskName"
                    value={taskName}
                    onChange={(e) => setTaskName(e.target.value)}
                    placeholder="Task name"
                    className="h-8 text-sm"
                  />
                </div>

                <div>
                  <Label htmlFor="taskStation" className="text-xs">Station</Label>
                  <SearchableSelect
                    value={getStationValue(taskStation)}
                    onValueChange={(value) => {
                      const station = getStationFromCombined(value);
                      setTaskStation(station as Station);
                    }}
                    placeholder="Select station..."
                    options={createStationCategoryOptions()}
                    autoGroupByCategory={true}
                    getCategoryForValue={(value) => getCategoryFromCombined(value)}
                    className="h-8 text-sm"
                  />
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div className="space-y-2">
                    <Label htmlFor="taskType" className="text-xs">Type</Label>
                    <Select value={taskType} onValueChange={(value) => setTaskType(value as TaskType)}>
                      <SelectTrigger className="h-8 text-sm">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {Object.values(TaskType).map((type) => (
                          <SelectItem key={type} value={type}>
                            {type}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="taskParent" className="text-xs">Parent</Label>
                    <SearchableSelect
                      value={taskParentId}
                      onValueChange={setTaskParentId}
                      placeholder="No Parent"
                      options={createTaskParentOptions(tasks, undefined)}
                      autoGroupByCategory={true}
                      className="h-8 text-sm"
                    />
                  </div>
                </div>

                <div className="flex justify-center gap-4 mt-4">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={onOpenTaskItemSubModal}
                    className="flex items-center gap-2"
                  >
                    <Package className="h-4 w-4" />
                    Task Item
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={onOpenTaskPointsSubModal}
                    className="flex items-center gap-2"
                  >
                    <Gift className="h-4 w-4" />
                    Task Rewards
                  </Button>
                </div>
              </div>

              <div className="space-y-4">
                <div className="space-y-2">
                  <Label className="text-xs">Cost & Revenue</Label>
                  <div className="grid grid-cols-2 gap-2">
                    <div className="space-y-2">
                      <Label htmlFor="cost" className="text-xs">Cost</Label>
                      <NumericInput
                        id="cost"
                        value={cost}
                        onChange={onCostChange}
                        min={0}
                        step={1}
                        placeholder="0.00"
                        className="h-8 text-sm"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="revenue" className="text-xs">Revenue</Label>
                      <NumericInput
                        id="revenue"
                        value={revenue}
                        onChange={onRevenueChange}
                        min={0}
                        step={1}
                        placeholder="0.00"
                        className="h-8 text-sm"
                      />
                    </div>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label className="text-xs">Payment Status</Label>
                  <div className="grid grid-cols-2 gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setIsNotPaid(!isNotPaid)}
                      className={`h-8 text-xs ${isNotPaid ? 'border-orange-500 text-orange-600' : ''}`}
                    >
                      {isNotPaid ? "⚠ Not Paid" : "✓ Paid"}
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        const newIsNotCharged = !isNotCharged;
                        setIsNotCharged(newIsNotCharged);
                        updateSaleStatus(newIsNotCharged);
                      }}
                      className={`h-8 text-xs ${isNotCharged ? 'border-orange-500 text-orange-600' : ''}`}
                    >
                      {isNotCharged ? "⚠ Not Charged" : "✓ Charged"}
                    </Button>
                  </div>
                </div>
              </div>

              {emissaryColumnExpanded && (
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label className="text-xs">Sale Player Points (SALE_PLAYER)</Label>
                    <div className="grid grid-cols-4 gap-2">
                      <div>
                        <Label htmlFor="service-reward-xp" className="text-xs">XP</Label>
                        <NumericInput
                          id="service-reward-xp"
                          value={playerPoints.xp}
                          onChange={(value) => setPlayerPoints({ ...playerPoints, xp: value })}
                          min={0}
                          step={1}
                          className="h-8 text-sm"
                        />
                      </div>
                      <div>
                        <Label htmlFor="service-reward-rp" className="text-xs">RP</Label>
                        <NumericInput
                          id="service-reward-rp"
                          value={playerPoints.rp}
                          onChange={(value) => setPlayerPoints({ ...playerPoints, rp: value })}
                          min={0}
                          step={1}
                          className="h-8 text-sm"
                        />
                      </div>
                      <div>
                        <Label htmlFor="service-reward-fp" className="text-xs">FP</Label>
                        <NumericInput
                          id="service-reward-fp"
                          value={playerPoints.fp}
                          onChange={(value) => setPlayerPoints({ ...playerPoints, fp: value })}
                          min={0}
                          step={1}
                          className="h-8 text-sm"
                        />
                      </div>
                      <div>
                        <Label htmlFor="service-reward-hp" className="text-xs">HP</Label>
                        <NumericInput
                          id="service-reward-hp"
                          value={playerPoints.hp}
                          onChange={(value) => setPlayerPoints({ ...playerPoints, hp: value })}
                          min={0}
                          step={1}
                          className="h-8 text-sm"
                        />
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>

            <div className="mt-4">
              <Button
                size="sm"
                variant="outline"
                onClick={toggleAdvanced}
                className={`h-8 text-xs ${showAdvanced ? 'bg-transparent text-white' : 'bg-muted text-muted-foreground'}`}
              >
                Advanced
              </Button>

              {showAdvanced && (
                <div className="mt-3 space-y-4">
                  <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">Native</div>

                  <div className="grid grid-cols-3 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="description" className="text-xs">Description</Label>
                      <Textarea
                        id="description"
                        value={description}
                        onChange={(e) => setDescription(e.target.value)}
                        placeholder="Additional sale details..."
                        className="h-16 text-sm resize-none"
                        rows={3}
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="discountAmount" className="text-xs">Discount Amount</Label>
                      <NumericInput
                        id="discountAmount"
                        value={overallDiscount.amount || 0}
                        onChange={(value) => setOverallDiscount({
                          ...overallDiscount,
                          amount: value > 0 ? value : undefined,
                          percent: value > 0 ? undefined : overallDiscount.percent,
                        })}
                        min={0}
                        step={1}
                        placeholder="0.00"
                        className="h-8 text-sm"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="discountPercent" className="text-xs">Discount Percent (%)</Label>
                      <NumericInput
                        id="discountPercent"
                        value={overallDiscount.percent || 0}
                        onChange={(value) => setOverallDiscount({
                          ...overallDiscount,
                          percent: value > 0 && value <= 100 ? value : undefined,
                          amount: value > 0 ? undefined : overallDiscount.amount,
                        })}
                        min={0}
                        step={1}
                        placeholder="0"
                        className="h-8 text-sm"
                      />
                    </div>
                  </div>
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
