'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useThemeColors } from "@/lib/hooks/use-theme-colors";
import { InventoryDisplay } from "@/components/inventory/inventory-display";
import { ClientAPI } from "@/lib/client-api";
import { ItemStatus } from "@/types/enums";
import { Site } from "@/types/entities";
import { getZIndexClass } from "@/lib/utils/z-index-utils";

export default function InventoriesPage() {
  const { activeBg } = useThemeColors();
  const [selectedSite, setSelectedSite] = useState<string | 'all'>('all');
  const [selectedStatus, setSelectedStatus] = useState<ItemStatus | 'all'>('all');
  const [sites, setSites] = useState<Site[]>([]);

  // Load sites on mount
  useEffect(() => {
    const loadSites = async () => {
      try {
        const sitesData = await ClientAPI.getSites();
        setSites(sitesData);
      } catch (error) {
        console.error('Failed to load sites:', error);
      }
    };
    loadSites();
  }, []);


  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Inventory Management</h1>
        <div className="flex items-center gap-4">
          {/* Compact Filters */}
          <div className="flex items-center gap-2 text-sm">
                         <span className="text-muted-foreground">Site:</span>
              <Select value={selectedSite} onValueChange={(value) => setSelectedSite(value)}>
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
            <Select value={selectedStatus} onValueChange={(value) => setSelectedStatus(value as ItemStatus | 'all')}>
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

      {/* Inventory Display */}
      <InventoryDisplay 
        sites={sites}
        selectedSite={selectedSite}
        selectedStatus={selectedStatus}
      />



    </div>
  );
}

