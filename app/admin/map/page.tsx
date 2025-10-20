'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { MapPin, Wrench, Building2, Settings, Cloud, Sparkles } from "lucide-react";
import { ClientAPI } from "@/lib/client-api";
import { SiteModal } from "@/components/modals/site-modal";
import type { Site } from "@/types/entities";
import { SiteType } from "@/types/enums";

export default function MapPage() {
  const [activeView, setActiveView] = useState('world-map');
  const [siteFilter, setSiteFilter] = useState<'all' | SiteType>('all');
  const [sites, setSites] = useState<Site[]>([]);
  const [showSiteModal, setShowSiteModal] = useState(false);
  const [selectedSite, setSelectedSite] = useState<Site | null>(null);
  const [isHydrated, setIsHydrated] = useState(false);

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
      await ClientAPI.upsertSite(site);
      setShowSiteModal(false);
      setSelectedSite(null);
    } catch (error) {
      console.error('Failed to save site:', error);
      alert('Failed to save site');
    }
  };

  const handleManageSites = () => {
    setSelectedSite(null);
    setShowSiteModal(true);
  };

  const handleEditSite = (site: Site) => {
    setSelectedSite(site);
    setShowSiteModal(true);
  };

  const getSiteTypeColor = (type: SiteType): string => {
    switch (type) {
      case SiteType.PHYSICAL: return 'bg-blue-500';
      case SiteType.CLOUD: return 'bg-purple-500';
      case SiteType.SPECIAL: return 'bg-green-500';
      default: return 'bg-gray-500';
    }
  };

  const getSiteTypeBadgeColor = (type: SiteType): string => {
    switch (type) {
      case SiteType.PHYSICAL: return 'text-blue-700 bg-blue-100 dark:text-blue-300 dark:bg-blue-900';
      case SiteType.CLOUD: return 'text-purple-700 bg-purple-100 dark:text-purple-300 dark:bg-purple-900';
      case SiteType.SPECIAL: return 'text-green-700 bg-green-100 dark:text-green-300 dark:bg-green-900';
      default: return 'text-gray-700 bg-gray-100 dark:text-gray-300 dark:bg-gray-900';
    }
  };

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
                <Settings className="w-4 w-4 mr-2" />
                Manage Sites
              </Button>
            </CardHeader>
            <CardContent>
              {sites.length === 0 ? (
                <div className="text-center text-muted-foreground py-16">
                  <Building2 className="h-16 w-16 mx-auto mb-4 opacity-50" />
                  <p className="text-lg font-medium">No sites yet</p>
                  <p className="text-sm">Sites will be initialized on first app load</p>
                  <Button onClick={handleManageSites} className="mt-4">
                    Initialize Sites
                  </Button>
                </div>
              ) : (
                <Tabs value={siteFilter} onValueChange={(v) => setSiteFilter(v as 'all' | SiteType)} className="w-full">
                  <TabsList className="grid w-full grid-cols-4 mb-4">
                    <TabsTrigger value="all">All ({sites.length})</TabsTrigger>
                    <TabsTrigger value={SiteType.PHYSICAL}>
                      <MapPin className="h-4 w-4 mr-1" />
                      Physical ({sites.filter(s => s.metadata.type === SiteType.PHYSICAL).length})
                    </TabsTrigger>
                    <TabsTrigger value={SiteType.CLOUD}>
                      <Cloud className="h-4 w-4 mr-1" />
                      Cloud ({sites.filter(s => s.metadata.type === SiteType.CLOUD).length})
                    </TabsTrigger>
                    <TabsTrigger value={SiteType.SPECIAL}>
                      <Sparkles className="h-4 w-4 mr-1" />
                      System ({sites.filter(s => s.metadata.type === SiteType.SPECIAL).length})
                    </TabsTrigger>
                  </TabsList>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {sites
                      .filter(site => siteFilter === 'all' || site.metadata.type === siteFilter)
                      .map(site => (
                        <Card 
                          key={site.id} 
                          className="cursor-pointer hover:bg-muted/50 transition-colors" 
                          onClick={() => handleEditSite(site)}
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
                              <div className={`w-2 h-2 rounded-full ${site.isActive ? 'bg-green-500' : 'bg-gray-400'}`} />
                              <span className="text-muted-foreground">{site.isActive ? 'Active' : 'Inactive'}</span>
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
                      ))}
                  </div>
                </Tabs>
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