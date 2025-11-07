'use client';

import { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { MapPin, Wrench, Building2, Settings, Cloud, Sparkles, Plus, Search, ArrowUpDown } from "lucide-react";
import { ClientAPI } from "@/lib/client-api";
import { SiteModal } from "@/components/modals/site-modal";
import type { Site } from "@/types/entities";
import { SiteType, SiteStatus } from "@/types/enums";

export default function MapPage() {
  const [activeView, setActiveView] = useState('world-map');
  const [siteFilter, setSiteFilter] = useState<'all' | SiteType | 'inactive'>('all');
  const [sites, setSites] = useState<Site[]>([]);
  const [showSiteModal, setShowSiteModal] = useState(false);
  const [selectedSite, setSelectedSite] = useState<Site | null>(null);
  const [isHydrated, setIsHydrated] = useState(false);
  
  // Search and sort state
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<'name' | 'type' | 'status' | 'createdAt'>('name');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');

  // Load sites
  useEffect(() => {
    setIsHydrated(true);
    
    const loadSites = async () => {
      try {
        const sitesData = await ClientAPI.getSites();
        setSites(sitesData || []);
      } catch (error) {
        console.error('Failed to load sites:', error);
      }
    };
    
    loadSites();

    // Listen for site updates
    const handleSiteUpdate = () => {
      loadSites();
    };

    window.addEventListener('sitesUpdated', handleSiteUpdate);
    return () => {
      window.removeEventListener('sitesUpdated', handleSiteUpdate);
    };
  }, []);

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

  const getSiteTypeColor = (type: SiteType): string => {
    switch (type) {
      case SiteType.PHYSICAL: return 'bg-blue-500';
      case SiteType.DIGITAL: return 'bg-purple-500';
      case SiteType.SYSTEM: return 'bg-green-500';
      default: return 'bg-gray-500';
    }
  };

  const getSiteTypeBadgeColor = (type: SiteType): string => {
    switch (type) {
      case SiteType.PHYSICAL: return 'text-blue-700 bg-blue-100 dark:text-blue-300 dark:bg-blue-900';
      case SiteType.DIGITAL: return 'text-purple-700 bg-purple-100 dark:text-purple-300 dark:bg-purple-900';
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
          comparison = (a.status || 'Active').localeCompare(b.status || 'Active');
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
      {/* Sidebar Menu */}
      <div className="w-64 space-y-2">
        <Card className="h-full">
          <CardHeader className="pb-4">
            <CardTitle className="text-lg">Map Sections</CardTitle>
          </CardHeader>
          <CardContent className="space-y-1">
            <Button
              variant={activeView === 'world-map' ? 'default' : 'ghost'}
              className="w-full justify-start"
              onClick={() => setActiveView('world-map')}
            >
              <MapPin className="h-4 w-4 mr-2" />
              World Map
            </Button>
            
            <Button
              variant={activeView === 'world-tools' ? 'default' : 'ghost'}
              className="w-full justify-start"
              onClick={() => setActiveView('world-tools')}
            >
              <Wrench className="h-4 w-4 mr-2" />
              World Tools
            </Button>
            
            <Button
              variant={activeView === 'sites' ? 'default' : 'ghost'}
              className="w-full justify-start"
              onClick={() => setActiveView('sites')}
            >
              <Building2 className="h-4 w-4 mr-2" />
              Sites
              <Badge variant="outline" className="ml-auto">
                {sites.length}
              </Badge>
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 overflow-auto">
        {/* World Map View */}
        {activeView === 'world-map' && (
          <Card className="h-full">
            <CardHeader>
              <CardTitle>World Map</CardTitle>
            </CardHeader>
            <CardContent className="flex items-center justify-center h-[calc(100%-5rem)]">
              <div className="text-center space-y-4">
                <div className="w-full max-w-2xl h-96 bg-muted rounded-lg border-2 border-dashed border-muted-foreground/25 flex items-center justify-center">
                  <div className="text-muted-foreground text-sm">
                    Google Maps Placeholder
                  </div>
                </div>
                <p className="text-sm text-muted-foreground">
                  Interactive map coming soon...
                </p>
              </div>
            </CardContent>
          </Card>
        )}

        {/* World Tools View */}
        {activeView === 'world-tools' && (
          <Card className="h-full">
            <CardHeader>
              <CardTitle>World Tools</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-center py-16 text-muted-foreground">
                <Wrench className="h-16 w-16 mx-auto mb-4 opacity-50" />
                <p className="text-lg font-medium">World Tools</p>
                <p className="text-sm">Location filters, zoom controls, and map layers</p>
                <p className="text-xs mt-4">Coming in V0.2</p>
              </div>
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
              {sites.length === 0 ? (
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
                      <TabsTrigger value={SiteType.DIGITAL}>
                        <Cloud className="h-4 w-4 mr-1" />
                        Digital ({sites.filter(s => s.metadata.type === SiteType.DIGITAL && s.status === SiteStatus.ACTIVE).length})
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
                              <div className={`w-2 h-2 rounded-full ${site.status === 'Active' ? 'bg-green-500' : 'bg-gray-400'}`} />
                              <span className="text-muted-foreground">{site.status || 'Active'}</span>
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
      </div>

      {/* Site Modal */}
      <SiteModal
        site={selectedSite}
        open={showSiteModal}
        onOpenChange={setShowSiteModal}
        onSave={handleSiteSave}
      />
    </div>
  );
} 