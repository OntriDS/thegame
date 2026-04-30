'use client';

import { useState, useEffect, useCallback, Suspense } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useThemeColors } from "@/lib/hooks/use-theme-colors";
import { useUserPreferences } from "@/lib/hooks/use-user-preferences";
import { InventoryDisplay } from "@/components/inventory/inventory-display";
import { ClientAPI } from "@/lib/client-api";
import { ItemStatus } from "@/types/enums";
import { getItemStatusLabel } from "@/lib/constants/status-display-labels";
import { Item, Site } from "@/types/entities";
import { getZIndexClass } from "@/lib/utils/z-index-utils";
import { CurrencyExchangeRates, DEFAULT_CURRENCY_EXCHANGE_RATES } from "@/lib/constants/financial-constants";
import { Archive, Loader2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { MonthSelector } from "@/components/ui/month-selector";
import { useMonthlySummary } from '@/lib/hooks/use-monthly-summary';
import { InventoriesDeepLinkTrigger } from '@/components/admin/admin-deep-link-triggers';

function InventoriesPageContent() {
  const { activeBg } = useThemeColors();
  const { getPreference, setPreference, isLoading } = useUserPreferences();
  const [selectedSite, setSelectedSite] = useState<string | 'all'>('all');
  const [selectedStatus, setSelectedStatus] = useState<ItemStatus | 'all'>('all');
  const [sites, setSites] = useState<Site[]>([]);
  const [deepLinkItem, setDeepLinkItem] = useState<Item | null>(null);
  const {
    selectedMonthKey,
    setSelectedMonthKey,
    availableMonths,
  } = useMonthlySummary({ loadSummary: false });

  const handleInventoryDeepLink = useCallback((item: Item) => {
    setDeepLinkItem(item);
  }, []);

  const clearDeepLinkItem = useCallback(() => setDeepLinkItem(null), []);

  // Load sites and available months
  useEffect(() => {
    const loadData = async () => {
      try {
        const sitesData = await ClientAPI.getSites();
        setSites(sitesData);
      } catch (error) {
        console.error('Failed to load inventories data:', error);
      }
    };
    loadData();
  }, []);

  // Load saved preferences on mount (wait for KV to load)
  useEffect(() => {
    if (isLoading) return;

    const savedSite = getPreference('inventory-selected-site', 'all');
    const savedStatus = getPreference('inventory-selected-status', 'all');

    if (savedSite) setSelectedSite(savedSite);
    if (savedStatus) setSelectedStatus(savedStatus);
  }, [getPreference, isLoading]);

  // If the saved selected site was deleted, fall back to all sites
  useEffect(() => {
    if (!selectedSite || selectedSite === 'all') return;
    const siteStillExists = sites.some(site => site.id === selectedSite);
    if (!siteStillExists) {
      setSelectedSite('all');
      setPreference('inventory-selected-site', 'all');
    }
  }, [sites, selectedSite, setPreference]);


  return (
    <div className="space-y-6">
      <InventoriesDeepLinkTrigger onItem={handleInventoryDeepLink} />
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

          <div className="flex items-center gap-2 border rounded-md px-3 py-1 bg-background/50 h-8">
            <span className="text-muted-foreground text-xs font-medium">Status:</span>
            <Select value={selectedStatus} onValueChange={(value) => {
              const newStatus = value as ItemStatus | 'all';
              setSelectedStatus(newStatus);
              setPreference('inventory-selected-status', newStatus);
            }}>
              <SelectTrigger className="w-28 h-6 border-none bg-transparent shadow-none hover:bg-accent/50 transition-colors">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All</SelectItem>
                {Object.values(ItemStatus).map(status => (
                  <SelectItem key={status} value={status}>{getItemStatusLabel(status)}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

        </div>
      </div>

      {/* Inventory Display */}
      <InventoryDisplay
        sites={sites}
        selectedSite={selectedSite}
        selectedStatus={selectedStatus}
        selectedMonthKey={selectedMonthKey}
        availableMonths={availableMonths}
        onMonthChange={setSelectedMonthKey}
        deepLinkItem={deepLinkItem}
        onDeepLinkItemConsumed={clearDeepLinkItem}
      />


    </div>
  );
}

export default function InventoriesPage() {
  return (
    <Suspense fallback={<div className="container mx-auto px-6 py-8 text-sm text-muted-foreground">Loading inventory…</div>}>
      <InventoriesPageContent />
    </Suspense>
  );
}

