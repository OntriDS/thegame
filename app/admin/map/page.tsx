'use client';

import { useState, useEffect, useMemo, useCallback, Suspense } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Map as MapIcon,
  MapPin,
  Building2,
  Cloud,
  Sparkles,
  Landmark,
  Layers,
  Plus,
  Search,
  ArrowUpDown,
} from "lucide-react";
import { ClientAPI } from "@/lib/client-api";
import { SiteModal } from "@/components/modals/site-modal";
import SettlementSubmodal from '@/components/modals/submodals/settlement-submodal';
import RegionSubmodal from '@/components/modals/submodals/region-submodal';
import MapWrapper from '@/components/map/map-wrapper';
import type { Site, Settlement, Region } from "@/types/entities";
import { SiteType, SiteStatus } from "@/types/enums";
import type { MapReadModel } from '@/types/map-types';
import { getSiteStatusLabel } from "@/lib/constants/status-display-labels";
import { MapDeepLinkTrigger } from '@/components/admin/admin-deep-link-triggers';
import { OPEN_ENTITY_QUERY, OPEN_ID_QUERY } from '@/lib/utils/entity-admin-deep-links';
import { adminMapWindowEvents, type CoordPickRequestDetail } from '@/lib/admin-map-events';

type MapGeoDeleteTarget =
  | { kind: 'settlement'; entity: Settlement }
  | { kind: 'region'; entity: Region };

function MapPageContent() {
  type ActiveMapView = 'map' | 'sites' | 'settlements' | 'regions';
  const [activeView, setActiveView] = useState<ActiveMapView>('map');
  const [siteFilter, setSiteFilter] = useState<'all' | SiteType | 'inactive'>('all');
  const [sites, setSites] = useState<Site[]>([]);
  const [settlements, setSettlements] = useState<Settlement[]>([]);
  const [showSiteModal, setShowSiteModal] = useState(false);
  const [selectedSite, setSelectedSite] = useState<Site | null>(null);
  const [showSettlementModal, setShowSettlementModal] = useState(false);
  const [selectedSettlement, setSelectedSettlement] = useState<Settlement | null>(null);
  const [showRegionModal, setShowRegionModal] = useState(false);
  const [selectedRegion, setSelectedRegion] = useState<Region | null>(null);
  const [regions, setRegions] = useState<Region[]>([]);
  const [mapData, setMapData] = useState<MapReadModel | null>(null);
  const [isHydrated, setIsHydrated] = useState(false);
  const [settlementSearch, setSettlementSearch] = useState('');
  const [regionSearch, setRegionSearch] = useState('');
  const [isSettlementsLoading, setIsSettlementsLoading] = useState(false);
  const [isRegionsLoading, setIsRegionsLoading] = useState(false);
  const [isMapLoading, setIsMapLoading] = useState(false);
  const [isSitesLoading, setIsSitesLoading] = useState(false);
  const [isRegionsDataLoaded, setIsRegionsDataLoaded] = useState(false);
  const [isSettlementsDataLoaded, setIsSettlementsDataLoaded] = useState(false);
  const [isSitesDataLoaded, setIsSitesDataLoaded] = useState(false);
  const [isMapDataLoaded, setIsMapDataLoaded] = useState(false);
  const [coordinatePickSession, setCoordinatePickSession] = useState<{ pickId: string } | null>(null);
  const [mapDeleteTarget, setMapDeleteTarget] = useState<MapGeoDeleteTarget | null>(null);
  const [mapDeleteBusy, setMapDeleteBusy] = useState(false);
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  
  // Search and sort state
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<'name' | 'type' | 'status' | 'createdAt'>('name');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');

  const loadSites = useCallback(async () => {
    try {
      setIsSitesLoading(true);
      const sitesData = await ClientAPI.getSites();
      setSites(sitesData || []);
      setIsSitesDataLoaded(true);
    } catch (error) {
      console.error('Failed to load sites:', error);
      setSites([]);
      setIsSitesDataLoaded(true);
    } finally {
      setIsSitesLoading(false);
    }
  }, []);

  const loadSettlements = useCallback(async () => {
    try {
      setIsSettlementsLoading(true);
      const settlementsData = await ClientAPI.getSettlements();
      setSettlements(settlementsData || []);
      setIsSettlementsDataLoaded(true);
    } catch (error) {
      console.error('Failed to load settlements:', error);
    } finally {
      setIsSettlementsLoading(false);
    }
  }, []);

  const loadRegions = useCallback(async () => {
    try {
      setIsRegionsLoading(true);
      const regionsData = await ClientAPI.getRegions();
      setRegions(regionsData || []);
      setIsRegionsDataLoaded(true);
    } catch (error) {
      console.error('Failed to load regions:', error);
      setRegions([]);
    } finally {
      setIsRegionsLoading(false);
    }
  }, []);

  const loadMapData = useCallback(async () => {
    try {
      setIsMapLoading(true);
      const mapReadModel = await ClientAPI.getMap();
      setMapData(mapReadModel);
      setIsMapDataLoaded(true);
    } catch (error) {
      console.error('Failed to load map data:', error);
      setMapData(null);
    } finally {
      setIsMapLoading(false);
    }
  }, []);

  // Load sites
  useEffect(() => {
    setIsHydrated(true);
    const handleSiteUpdate = async () => {
      await loadSites();
      setIsMapDataLoaded(false);
    };
    const handleSettlementUpdate = async () => {
      await loadSettlements();
      setIsMapDataLoaded(false);
    };
    const handleRegionUpdate = async () => {
      await loadRegions();
      setIsMapDataLoaded(false);
    };
    const handleMapDataRefresh = () => {
      setIsMapDataLoaded(false);
    };
    window.addEventListener('sitesUpdated', handleSiteUpdate);
    window.addEventListener('settlementsUpdated', handleSettlementUpdate);
    window.addEventListener('regionsUpdated', handleRegionUpdate);
    window.addEventListener('mapDataRefreshNeeded', handleMapDataRefresh);
    const handleCoordPickRequest = (ev: Event) => {
      const ce = ev as CustomEvent<CoordPickRequestDetail>;
      if (!ce.detail?.pickId) return;
      setActiveView('map');
      setCoordinatePickSession({ pickId: ce.detail.pickId });
    };
    const handleCoordPickCancelled = () => {
      setCoordinatePickSession(null);
    };
    window.addEventListener(adminMapWindowEvents.requestCoordPick, handleCoordPickRequest);
    window.addEventListener(adminMapWindowEvents.coordPickCancelled, handleCoordPickCancelled);
    return () => {
      window.removeEventListener('sitesUpdated', handleSiteUpdate);
      window.removeEventListener('settlementsUpdated', handleSettlementUpdate);
      window.removeEventListener('regionsUpdated', handleRegionUpdate);
      window.removeEventListener('mapDataRefreshNeeded', handleMapDataRefresh);
      window.removeEventListener(adminMapWindowEvents.requestCoordPick, handleCoordPickRequest);
      window.removeEventListener(adminMapWindowEvents.coordPickCancelled, handleCoordPickCancelled);
    };
  }, [loadRegions, loadSettlements, loadSites]);

  useEffect(() => {
    if (!isHydrated) return;

    if (activeView === 'sites' && !isSitesDataLoaded) {
      void loadSites();
      return;
    }

    if (activeView === 'settlements') {
      if (!isSettlementsDataLoaded) void loadSettlements();
      if (!isRegionsDataLoaded) void loadRegions();
      return;
    }

    if (activeView === 'regions' && !isRegionsDataLoaded) {
      void loadRegions();
      return;
    }

    if (activeView === 'map' && !isMapDataLoaded) {
      void loadMapData();
    }
  }, [activeView, isHydrated, isSitesDataLoaded, isSettlementsDataLoaded, isRegionsDataLoaded, isMapDataLoaded, loadSites, loadSettlements, loadRegions, loadMapData]);

  /** Settlement form needs region options; regions were only loaded on the Regions tab before. */
  useEffect(() => {
    if (!isHydrated || !showSettlementModal) return;
    if (!isRegionsDataLoaded) void loadRegions();
  }, [isHydrated, showSettlementModal, isRegionsDataLoaded, loadRegions]);

  const handleSiteSave = async (site: Site) => {
    try {
      // Check if this is a new site or an update
      const isNew = !selectedSite;
      
      // Save site using ClientAPI (workflows handled server-side)
      const finalSite = await ClientAPI.upsertSite(site);
      

      
      setShowSiteModal(false);
      // Update selectedSite with fresh data BEFORE modal closes (fixes stale UI issue)
      setSelectedSite(finalSite);
    } catch (error) {
      console.error('Failed to save site:', error);
      alert('Failed to save site');
    }
  };

  const handleManageSites = () => {
    setSelectedSite(null);
    setShowSiteModal(true);
  };

  const handleManageSettlements = () => {
    setSelectedSettlement(null);
    setShowSettlementModal(true);
  };

  const handleManageRegions = () => {
    setSelectedRegion(null);
    setShowRegionModal(true);
  };

  const handleEditSettlement = (settlement: Settlement) => {
    setSelectedSettlement(settlement);
    setShowSettlementModal(true);
  };

  const handleEditRegion = (region: Region) => {
    setSelectedRegion(region);
    setShowRegionModal(true);
  };

  const handleSettlementSave = async (settlement: Settlement) => {
    try {
      const payload: Settlement = {
        ...settlement,
        id: settlement.id || `settlement-${Date.now()}`,
        createdAt: settlement.createdAt || new Date(),
        updatedAt: new Date()
      };
      await ClientAPI.upsertSettlement(payload);
      window.dispatchEvent(new Event('settlementsUpdated'));
      setShowSettlementModal(false);
    } catch (error) {
      console.error('Failed to save settlement:', error);
      alert('Failed to save settlement');
    }
  };

  const handleDeleteSettlement = (settlement: Settlement) => {
    setMapDeleteTarget({ kind: 'settlement', entity: settlement });
  };

  const handleConfirmMapDelete = async () => {
    if (!mapDeleteTarget) return;
    setMapDeleteBusy(true);
    try {
      if (mapDeleteTarget.kind === 'settlement') {
        await ClientAPI.deleteSettlement(mapDeleteTarget.entity.id);
        window.dispatchEvent(new Event('settlementsUpdated'));
      } else {
        await ClientAPI.deleteRegion(mapDeleteTarget.entity.id);
        window.dispatchEvent(new Event('regionsUpdated'));
      }
      setMapDeleteTarget(null);
    } catch (error) {
      console.error('Failed to delete:', error);
      alert(
        mapDeleteTarget.kind === 'settlement'
          ? 'Failed to delete settlement'
          : 'Failed to delete region'
      );
    } finally {
      setMapDeleteBusy(false);
    }
  };

  const handleRegionSave = async (region: Region) => {
    try {
      await ClientAPI.upsertRegion(region);
      window.dispatchEvent(new Event('regionsUpdated'));
      setShowRegionModal(false);
    } catch (error) {
      console.error('Failed to save region:', error);
      alert('Failed to save region');
    }
  };

  const handleDeleteRegion = (region: Region) => {
    setMapDeleteTarget({ kind: 'region', entity: region });
  };

  const handleCreateRegion = async (region: Region): Promise<Region> => {
    const savedRegion = await ClientAPI.upsertRegion(region);
    window.dispatchEvent(new Event('regionsUpdated'));
    return savedRegion;
  };

  const handleMapRegionShapeSave = (updatedRegion: Region) => {
    setRegions((current) => current.map((item) => (item.id === updatedRegion.id ? updatedRegion : item)));
    setMapData((current) => {
      if (!current) return current;
      return {
        ...current,
        regions: current.regions.map((item) => (item.id === updatedRegion.id ? updatedRegion : item))
      };
    });
    setIsMapDataLoaded(true);
  };

  const handleMapSettlementShapeSave = (updatedSettlement: Settlement) => {
    setSettlements((current) => current.map((item) => (item.id === updatedSettlement.id ? updatedSettlement : item)));
    setMapData((current) => {
      if (!current) return current;
      return {
        ...current,
        settlements: current.settlements.map((item) => (item.id === updatedSettlement.id ? updatedSettlement : item))
      };
    });
    setIsMapDataLoaded(true);
  };

  const regionById = useMemo(() => {
    const map = new Map<string, Region>();
    for (const region of regions) {
      map.set(region.id, region);
    }
    return map;
  }, [regions]);

  // Helper to check if site is the protected "None" system site
  const isNoneSite = (site: Site): boolean => {
    return site.metadata.type === SiteType.SYSTEM && (site.name === 'None' || site.id === 'none');
  };

  const handleEditSite = (site: Site) => {
    // Block editing of "None" site - it's a protected system site
    if (isNoneSite(site)) {
      console.log('Cannot edit "None" site - it is a protected system site');
      return;
    }
    setSelectedSite(site);
    setShowSiteModal(true);
  };

  const handleDeepLinkSite = useCallback((site: Site) => {
    if (isNoneSite(site)) {
      return;
    }
    setSelectedSite(site);
    setShowSiteModal(true);
  }, []);

  const clearSiteDeepLink = useCallback(() => {
    const params = new URLSearchParams(searchParams.toString());
    if (!params.has(OPEN_ENTITY_QUERY) && !params.has(OPEN_ID_QUERY)) {
      return;
    }

    params.delete(OPEN_ENTITY_QUERY);
    params.delete(OPEN_ID_QUERY);

    const target = params.toString()
      ? `${pathname || '/admin/map'}?${params.toString()}`
      : (pathname || '/admin/map');
    router.replace(target, { scroll: false });
  }, [pathname, router, searchParams]);

  const handleSiteModalOpenChange = useCallback((open: boolean) => {
    setShowSiteModal(open);
    if (!open) {
      clearSiteDeepLink();
    }
  }, [clearSiteDeepLink]);

  const getSiteTypeColor = (type: SiteType): string => {
    switch (type) {
      case SiteType.PHYSICAL: return 'bg-blue-500';
      case SiteType.DIGITAL_SITE: return 'bg-purple-500';
      case SiteType.SYSTEM: return 'bg-green-500';
      default: return 'bg-gray-500';
    }
  };

  const getSiteTypeBadgeColor = (type: SiteType): string => {
    switch (type) {
      case SiteType.PHYSICAL: return 'text-blue-700 bg-blue-100 dark:text-blue-300 dark:bg-blue-900';
      case SiteType.DIGITAL_SITE: return 'text-purple-700 bg-purple-100 dark:text-purple-300 dark:bg-purple-900';
      case SiteType.SYSTEM: return 'text-green-700 bg-green-100 dark:text-green-300 dark:bg-green-900';
      default: return 'text-gray-700 bg-gray-100 dark:text-gray-300 dark:bg-gray-900';
    }
  };

  // Filter and sort sites
  const filteredAndSortedSites = useMemo(() => {
    let filtered = sites.filter(site => {
      // Apply tab filter
      if (siteFilter === 'inactive') {
        if (site.status !== SiteStatus.INACTIVE) return false;
      } else {
        const isActive = site.status === SiteStatus.ACTIVE;
        if (siteFilter === 'all') {
          if (!isActive) return false;
        } else {
          if (!isActive || site.metadata.type !== siteFilter) return false;
        }
      }

      // Apply search filter
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase();
        const matchesName = site.name.toLowerCase().includes(query);
        const matchesDescription = site.description?.toLowerCase().includes(query) || false;
        const matchesType = site.metadata.type.toLowerCase().includes(query);
        const matchesId = site.id.toLowerCase().includes(query);
        
        // For physical sites, check settlement
        if (site.metadata.type === SiteType.PHYSICAL && 'settlementId' in site.metadata) {
          const matchesSettlement = site.metadata.settlementId?.toLowerCase().includes(query) || false;
          if (!matchesName && !matchesDescription && !matchesType && !matchesId && !matchesSettlement) {
            return false;
          }
        } else {
          if (!matchesName && !matchesDescription && !matchesType && !matchesId) {
            return false;
          }
        }
      }

      return true;
    });

    // Sort sites
    filtered.sort((a, b) => {
      let comparison = 0;
      
      switch (sortBy) {
        case 'name':
          comparison = a.name.localeCompare(b.name);
          break;
        case 'type':
          comparison = a.metadata.type.localeCompare(b.metadata.type);
          break;
        case 'status':
          comparison = (a.status || SiteStatus.ACTIVE).localeCompare(b.status || SiteStatus.ACTIVE);
          break;
        case 'createdAt':
          const aTime = new Date(a.createdAt || 0).getTime();
          const bTime = new Date(b.createdAt || 0).getTime();
          comparison = aTime - bTime;
          break;
      }
      
      return sortOrder === 'asc' ? comparison : -comparison;
    });

    return filtered;
  }, [sites, siteFilter, searchQuery, sortBy, sortOrder]);

  const filteredSettlements = useMemo(() => {
    const query = settlementSearch.trim().toLowerCase();
    const list = settlements.filter((settlement) => {
      if (!query) return true;

      const text = [
        settlement.name || '',
        settlement.regionId || '',
        regionById.get(settlement.regionId || '')?.name || '',
        settlement.googleMapsAddress || '',
        settlement.coordinates?.lat,
        settlement.coordinates?.lng,
        settlement.isActive ? 'active' : 'inactive',
        settlement.id || ''
      ]
        .filter((part) => part !== undefined && part !== null)
        .map((part) => String(part).toLowerCase())
        .join(' ');

      return text.includes(query);
    });

    return [...list].sort((a, b) => a.name.localeCompare(b.name));
  }, [regionById, settlements, settlementSearch]);

  // Regions table uses canonical Region entities and computed settlement counts.
  type RegionListItem = Region & {
    settlementsCount: number;
    parentName?: string;
  };

  const filteredRegions = useMemo<RegionListItem[]>(() => {
    const counts = new Map<string, number>();
    for (const settlement of settlements) {
      if (!settlement.regionId) continue;
      counts.set(settlement.regionId, (counts.get(settlement.regionId) || 0) + 1);
    }

    const query = regionSearch.trim().toLowerCase();
    const list: RegionListItem[] = regions.map((region) => ({
      ...region,
      settlementsCount: counts.get(region.id) || 0,
      parentName: region.parentId ? regionById.get(region.parentId)?.name : undefined
    }))
      .filter((region) => {
        if (!query) return true;
        return `${region.name} ${region.settlementsCount}`.toLowerCase().includes(query);
      });

    return list.sort((a, b) => a.name.localeCompare(b.name));
  }, [regions, settlements, regionSearch, regionById]);
  
  if (!isHydrated) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold">Map</h1>
        </div>
        <div className="flex items-center justify-center h-64">
          <div className="text-muted-foreground">Loading...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex gap-6 h-[calc(100vh-8rem)]">
      <MapDeepLinkTrigger onSite={handleDeepLinkSite} />
      {/* Sidebar Menu */}
      <div className="w-64 space-y-2">
        <Card className="h-full">
          <CardHeader className="pb-4">
            <CardTitle className="text-lg">Map Sections</CardTitle>
          </CardHeader>
          <CardContent className="space-y-1">
            <Button
              variant={activeView === 'map' ? 'default' : 'ghost'}
              className="w-full justify-start"
              onClick={() => setActiveView('map')}
            >
              <MapIcon className="h-4 w-4 mr-2" />
              Map
            </Button>

            <Button
              variant={activeView === 'sites' ? 'default' : 'ghost'}
              className="w-full justify-start"
              onClick={() => setActiveView('sites')}
            >
              <Building2 className="h-4 w-4 mr-2" />
              Sites
            </Button>

            <Button
              variant={activeView === 'settlements' ? 'default' : 'ghost'}
              className="w-full justify-start"
              onClick={() => setActiveView('settlements')}
            >
              <Landmark className="h-4 w-4 mr-2" />
              Settlements
            </Button>

            <Button
              variant={activeView === 'regions' ? 'default' : 'ghost'}
              className="w-full justify-start"
              onClick={() => setActiveView('regions')}
            >
              <Layers className="h-4 w-4 mr-2" />
              Regions
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 overflow-auto">
        {/* Map View */}
        {activeView === 'map' && (
          <Card className="flex h-full min-h-0 flex-col border-0 shadow-none md:border md:shadow-sm">
            <CardContent className="flex min-h-0 flex-1 flex-col p-3 md:p-4">
              {mapData ? (
                <MapWrapper
                  mapData={mapData}
                  coordinatePickSession={coordinatePickSession}
                  onCoordinatePickComplete={() => setCoordinatePickSession(null)}
                  onRegionShapeSave={handleMapRegionShapeSave}
                  onSettlementShapeSave={handleMapSettlementShapeSave}
                />
              ) : (
                <div className="grid min-h-[16rem] flex-1 place-items-center rounded-lg border border-border bg-muted">
                  <div className="text-muted-foreground">
                    {isMapLoading ? 'Loading map…' : 'Map unavailable'}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Sites View */}
        {activeView === 'sites' && (
          <Card className="h-full">
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Sites Database</CardTitle>
              <Button onClick={handleManageSites} size="sm">
                <Plus className="w-4 h-4 mr-2" />
                Add Site
              </Button>
            </CardHeader>
            <CardContent>
            {isSitesLoading && sites.length === 0 ? (
              <div className="text-center text-muted-foreground py-16">
                <p>Loading sites...</p>
              </div>
            ) : sites.length === 0 ? (
                <div className="text-center text-muted-foreground py-16">
                  <Building2 className="h-16 w-16 mx-auto mb-4 opacity-50" />
                  <p className="text-lg font-medium">No sites yet</p>
                  <p className="text-sm">Sites will be initialized on first app load</p>
                  <Button onClick={handleManageSites} className="mt-4">
                    <Plus className="w-4 h-4 mr-2" />
                    Add Site
                  </Button>
                </div>
              ) : (
                <>
                  {/* Search and Sort Controls */}
                  <div className="flex items-center gap-4 mb-4">
                    {/* Search Input */}
                    <div className="relative flex-1 max-w-md">
                      <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input
                        placeholder="Search sites by name, description, type, or ID..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="pl-10"
                      />
                    </div>

                    {/* Sort By Dropdown */}
                    <Select value={sortBy} onValueChange={(value) => setSortBy(value as typeof sortBy)}>
                      <SelectTrigger className="w-40">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="name">Name</SelectItem>
                        <SelectItem value="type">Type</SelectItem>
                        <SelectItem value="status">Status</SelectItem>
                        <SelectItem value="createdAt">Date Created</SelectItem>
                      </SelectContent>
                    </Select>

                    {/* Sort Order Toggle */}
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
                      className="flex items-center gap-2"
                    >
                      <ArrowUpDown className="h-4 w-4" />
                      {sortOrder === 'asc' ? 'Asc' : 'Desc'}
                    </Button>
                  </div>

                  <Tabs value={siteFilter} onValueChange={(v) => setSiteFilter(v as 'all' | SiteType | 'inactive')} className="w-full">
                    <TabsList className="grid w-full grid-cols-5 mb-4">
                      <TabsTrigger value="all">All ({sites.filter(s => s.status === SiteStatus.ACTIVE).length})</TabsTrigger>
                      <TabsTrigger value={SiteType.PHYSICAL}>
                        <MapPin className="h-4 w-4 mr-1" />
                        Physical ({sites.filter(s => s.metadata.type === SiteType.PHYSICAL && s.status === SiteStatus.ACTIVE).length})
                      </TabsTrigger>
                      <TabsTrigger value={SiteType.DIGITAL_SITE}>
                        <Cloud className="h-4 w-4 mr-1" />
                        Digital ({sites.filter(s => s.metadata.type === SiteType.DIGITAL_SITE && s.status === SiteStatus.ACTIVE).length})
                      </TabsTrigger>
                      <TabsTrigger value={SiteType.SYSTEM}>
                        <Sparkles className="h-4 w-4 mr-1" />
                        System ({sites.filter(s => s.metadata.type === SiteType.SYSTEM && s.status === SiteStatus.ACTIVE).length})
                      </TabsTrigger>
                      <TabsTrigger value="inactive">
                        Inactive ({sites.filter(s => s.status === SiteStatus.INACTIVE).length})
                      </TabsTrigger>
                    </TabsList>
                    
                    {/* Results count */}
                    {searchQuery && (
                      <div className="text-sm text-muted-foreground mb-4">
                        Found {filteredAndSortedSites.length} site{filteredAndSortedSites.length !== 1 ? 's' : ''}
                      </div>
                    )}
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {filteredAndSortedSites.length === 0 ? (
                        <div className="col-span-2 text-center text-muted-foreground py-8">
                          <p>No sites found matching your search criteria.</p>
                        </div>
                      ) : (
                        filteredAndSortedSites.map(site => {
                        const isNone = isNoneSite(site);
                        return (
                        <Card 
                          key={site.id} 
                          className={isNone ? "cursor-not-allowed opacity-75" : "cursor-pointer hover:bg-muted/50 transition-colors"}
                          onClick={() => handleEditSite(site)}
                          title={isNone ? '"None" is a protected system site and cannot be edited' : undefined}
                        >
                          <CardHeader className="pb-3">
                            <div className="flex items-center justify-between">
                              <CardTitle className="text-base font-medium">{site.name}</CardTitle>
                              <Badge className={`text-xs ${getSiteTypeBadgeColor(site.metadata.type)}`}>
                                {site.metadata.type}
                              </Badge>
                            </div>
                          </CardHeader>
                          <CardContent className="space-y-2">
                            {site.description && (
                              <p className="text-sm text-muted-foreground line-clamp-2">{site.description}</p>
                            )}
                            <div className="flex items-center gap-2 text-xs">
                              <div className={`w-2 h-2 rounded-full ${site.status === SiteStatus.ACTIVE ? 'bg-green-500' : 'bg-gray-400'}`} />
                              <span className="text-muted-foreground">{getSiteStatusLabel(site.status || SiteStatus.ACTIVE)}</span>
                            </div>
                            {site.metadata.type === SiteType.PHYSICAL && 'settlementId' in site.metadata && (
                              <div className="text-xs text-muted-foreground">
                                <MapPin className="h-3 w-3 inline mr-1" />
                                {site.metadata.settlementId}
                              </div>
                            )}
                            <div className="text-xs text-muted-foreground font-mono">
                              {site.id}
                            </div>
                          </CardContent>
                        </Card>
                        );
                      })
                      )}
                    </div>
                  </Tabs>
                </>
              )}
            </CardContent>
          </Card>
        )}

        {/* Settlements View */}
        {activeView === 'settlements' && (
          <Card className="h-full">
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Settlements</CardTitle>
              <Button onClick={handleManageSettlements} size="sm">
                <Plus className="w-4 h-4 mr-2" />
                Add Settlement
              </Button>
            </CardHeader>
            <CardContent>
              <div className="relative mb-4">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search settlements by name, region, address..."
                  value={settlementSearch}
                  onChange={(e) => setSettlementSearch(e.target.value)}
                  className="pl-10"
                />
              </div>
              {isSettlementsLoading ? (
                <div className="text-sm text-muted-foreground">Loading settlements...</div>
              ) : filteredSettlements.length === 0 ? (
                <div className="text-center text-muted-foreground py-8">
                  <p>No settlements found.</p>
                  <Button onClick={handleManageSettlements} variant="outline" className="mt-3">
                    <Plus className="w-4 h-4 mr-2" />
                    Add Settlement
                  </Button>
                </div>
              ) : (
                <div className="grid gap-3">
                  {filteredSettlements.map((settlement) => {
                    const settlementRegion = regionById.get(settlement.regionId);
                    return (
                      <Card
                        key={settlement.id}
                        className="cursor-pointer p-4 transition-colors hover:bg-muted/40"
                        role="button"
                        tabIndex={0}
                        onClick={() => handleEditSettlement(settlement)}
                        onKeyDown={(event) => {
                          if (event.key === 'Enter' || event.key === ' ') {
                            event.preventDefault();
                            handleEditSettlement(settlement);
                          }
                        }}
                      >
                        <div className="font-medium">{settlement.name}</div>
                        <div className="text-sm text-muted-foreground">
                          {settlementRegion?.name || settlement.regionId}
                        </div>
                        <div className="text-xs text-muted-foreground mt-1">
                          {settlement.isActive ? 'Active' : 'Inactive'} · {settlement.isUnlocked === true ? 'Unlocked' : 'Locked'}
                          <span className="mx-2">·</span>
                          Region: {settlementRegion ? (settlementRegion.isUnlocked === true ? 'unlocked' : 'locked') : 'missing'}
                        </div>
                        <div className="text-[11px] text-muted-foreground mt-1 font-mono">
                          {settlement.id}
                        </div>
                      </Card>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Regions View */}
        {activeView === 'regions' && (
          <Card className="h-full">
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Regions</CardTitle>
              <Button onClick={handleManageRegions} size="sm">
                <Plus className="w-4 h-4 mr-2" />
                Add Region
              </Button>
            </CardHeader>
            <CardContent>
              <div className="relative mb-4">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search regions by name..."
                  value={regionSearch}
                  onChange={(e) => setRegionSearch(e.target.value)}
                  className="pl-10"
                />
              </div>
              {isRegionsLoading ? (
                <div className="text-sm text-muted-foreground">Loading regions...</div>
              ) : filteredRegions.length === 0 ? (
                <div className="text-center text-muted-foreground py-8">
                  <p>No regions found.</p>
                  <Button onClick={handleManageRegions} variant="outline" className="mt-3">
                    <Plus className="w-4 h-4 mr-2" />
                    Add Region
                  </Button>
                </div>
              ) : (
                <div className="grid gap-3">
                  {filteredRegions.map((region) => (
                    <Card
                      key={region.id}
                      className="cursor-pointer p-4 transition-colors hover:bg-muted/40"
                      role="button"
                      tabIndex={0}
                      onClick={() => handleEditRegion(region)}
                      onKeyDown={(event) => {
                        if (event.key === 'Enter' || event.key === ' ') {
                          event.preventDefault();
                          handleEditRegion(region);
                        }
                      }}
                    >
                      <div className="font-medium">{region.name}</div>
                      <div className="text-sm text-muted-foreground">
                        Center: {region.center?.lat?.toFixed?.(6)}, {region.center?.lng?.toFixed?.(6)}
                      </div>
                      <div className="text-sm text-muted-foreground">
                        Settlements: {region.settlementsCount} · {region.isActive ? 'Active' : 'Inactive'} · {region.isUnlocked === true ? 'Unlocked' : 'Locked'}
                      </div>
                      <div className="text-xs text-muted-foreground mt-1 font-mono">
                        {region.id}
                      </div>
                    </Card>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        )}
      </div>

      {/* Site Modal */}
      <SiteModal
        site={selectedSite}
        open={showSiteModal}
        onOpenChange={handleSiteModalOpenChange}
        onSave={handleSiteSave}
      />
      <SettlementSubmodal
        open={showSettlementModal}
        onOpenChange={setShowSettlementModal}
        settlement={selectedSettlement}
        onSave={handleSettlementSave}
        onDelete={handleDeleteSettlement}
        regions={regions}
        onCreateRegion={handleCreateRegion}
      />
      <RegionSubmodal
        open={showRegionModal}
        onOpenChange={setShowRegionModal}
        region={selectedRegion}
        onSave={handleRegionSave}
        onDelete={handleDeleteRegion}
        allRegions={regions}
      />

      <Dialog
        open={mapDeleteTarget !== null}
        onOpenChange={(open) => {
          if (!open && !mapDeleteBusy) {
            setMapDeleteTarget(null);
          }
        }}
      >
        <DialogContent zIndexLayer="SUB_MODALS" className="max-w-md">
          <DialogHeader>
            <DialogTitle>
              {mapDeleteTarget?.kind === 'settlement' ? 'Delete settlement?' : 'Delete region?'}
            </DialogTitle>
            <DialogDescription>
              {mapDeleteTarget?.kind === 'settlement' ? (
                <>
                  <span className="font-medium text-foreground">
                    &ldquo;{mapDeleteTarget.entity.name}&rdquo;
                  </span>{' '}
                  will be removed permanently. This cannot be undone.
                </>
              ) : mapDeleteTarget?.kind === 'region' ? (
                <>
                  <span className="font-medium text-foreground">
                    &ldquo;{mapDeleteTarget.entity.name}&rdquo;
                  </span>{' '}
                  will be removed permanently. This cannot be undone.
                </>
              ) : null}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              disabled={mapDeleteBusy}
              onClick={() => setMapDeleteTarget(null)}
            >
              Cancel
            </Button>
            <Button
              type="button"
              variant="destructive"
              disabled={mapDeleteBusy}
              onClick={() => void handleConfirmMapDelete()}
            >
              {mapDeleteBusy ? 'Deleting…' : 'Delete'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default function MapPage() {
  return (
    <Suspense fallback={<div className="container mx-auto px-6 py-8 text-sm text-muted-foreground">Loading map…</div>}>
      <MapPageContent />
    </Suspense>
  );
}