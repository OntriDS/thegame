'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useThemeColors } from "@/lib/hooks/use-theme-colors";
import { useUserPreferences } from "@/lib/hooks/use-user-preferences";
import { InventoryDisplay } from "@/components/inventory/inventory-display";
import { ClientAPI } from "@/lib/client-api";
import { ItemStatus } from "@/types/enums";
import { Site } from "@/types/entities";
import { getZIndexClass } from "@/lib/utils/z-index-utils";
import { CurrencyExchangeRates, DEFAULT_CURRENCY_EXCHANGE_RATES } from "@/lib/constants/financial-constants";
import { SummaryTotals } from "@/types/entities";
import { formatCurrency } from "@/lib/utils/financial-utils";
import { MonthSelector } from "@/components/ui/month-selector";
import { getCurrentMonthKey } from "@/lib/utils/date-utils";
import { Archive, Loader2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

export default function InventoriesPage() {
  const { activeBg } = useThemeColors();
  const { getPreference, setPreference, isLoading } = useUserPreferences();
  const [selectedSite, setSelectedSite] = useState<string | 'all'>('all');
  const [selectedStatus, setSelectedStatus] = useState<ItemStatus | 'all'>('all');
  const [sites, setSites] = useState<Site[]>([]);

  const [selectedMonthKey, setSelectedMonthKey] = useState(getCurrentMonthKey());
  const [availableMonths, setAvailableMonths] = useState<string[]>([]);
  const [atomicSummary, setAtomicSummary] = useState<SummaryTotals | null>(null);
  const [isAtomicLoading, setIsAtomicLoading] = useState(false);


  // Load available months once
  useEffect(() => {
    const loadMonths = async () => {
      try {
        const months = await ClientAPI.getAvailableSummaryMonths();
        const current = getCurrentMonthKey();
        const allMonths = months.includes(current) ? months : [current, ...months];
        setAvailableMonths(allMonths.sort((a,b) => b.localeCompare(a)));
      } catch (err) {
        setAvailableMonths([getCurrentMonthKey()]);
      }
    };
    loadMonths();
  }, []);

  // Load sites and summary
  useEffect(() => {
    const loadData = async () => {
      try {
        // 1. Fetch Atomic Summary (INSTANT)
        setIsAtomicLoading(true);
        ClientAPI.getSummary(selectedMonthKey)
          .then(setAtomicSummary)
          .finally(() => setIsAtomicLoading(false));

        // 2. Fetch Sites
        const sitesData = await ClientAPI.getSites();
        setSites(sitesData);
      } catch (error) {
        console.error('Failed to load inventories data:', error);
      }
    };
    loadData();
  }, [selectedMonthKey]);

  // Load saved preferences on mount (wait for KV to load)
  useEffect(() => {
    if (isLoading) return;

    const savedSite = getPreference('inventory-selected-site', 'all');
    const savedStatus = getPreference('inventory-selected-status', 'all');

    if (savedSite) setSelectedSite(savedSite);
    if (savedStatus) setSelectedStatus(savedStatus);
  }, [getPreference, isLoading]);


  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Inventory Management</h1>
        <div className="flex items-center gap-4">
          {/* Compact Filters */}
          <div className="flex items-center gap-2 text-sm">
            <span className="text-muted-foreground">Site:</span>
            <Select value={selectedSite} onValueChange={(value) => {
              setSelectedSite(value);
              setPreference('inventory-selected-site', value);
            }}>
              <SelectTrigger className="w-32 h-8">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All</SelectItem>
                {sites.map(site => (
                  <SelectItem key={site.id} value={site.id}>{site.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-muted-foreground">Status:</span>
            <Select value={selectedStatus} onValueChange={(value) => {
              const newStatus = value as ItemStatus | 'all';
              setSelectedStatus(newStatus);
              setPreference('inventory-selected-status', newStatus);
            }}>
              <SelectTrigger className="w-32 h-8">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All</SelectItem>
                {Object.values(ItemStatus).map(status => (
                  <SelectItem key={status} value={status}>{status}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

        </div>
      </div>

      {/* Atomic Summary Row */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Inventory Value</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {formatCurrency(atomicSummary?.inventoryValue || 0)}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Inventory Cost</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">
              {formatCurrency(atomicSummary?.inventoryCost || 0)}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Potential Profit</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">
              {formatCurrency((atomicSummary?.inventoryValue || 0) - (atomicSummary?.inventoryCost || 0))}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Jungle Coins Assets</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-600">
              {atomicSummary?.inventoryJ$ || 0} J$
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Inventory Display */}
      <InventoryDisplay
        sites={sites}
        selectedSite={selectedSite}
        selectedStatus={selectedStatus}
        selectedMonthKey={selectedMonthKey}
        availableMonths={availableMonths}
      />


    </div>
  );
}

