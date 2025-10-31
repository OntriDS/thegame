'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ArrowUpDown, RefreshCw, Link, MapPin, Cloud, Home, Sparkles } from 'lucide-react';
import { useState } from 'react';
import { processLogData } from '@/lib/utils/logging-utils';
import { SiteStatus, SiteType } from '@/types/enums';
import { SITE_STATUS_COLORS } from '@/lib/constants/color-constants';
import { useThemeColors } from '@/lib/hooks/use-theme-colors';

interface SitesLogTabProps {
  sitesLog: any;
  onReload: () => void;
  isReloading: boolean;
}

export function SitesLogTab({ sitesLog, onReload, isReloading }: SitesLogTabProps) {
  const { isDarkMode } = useThemeColors();
  const [logOrder, setLogOrder] = useState<'newest' | 'oldest'>('newest');

  // Process sites log data
  const processedSitesLog = processLogData(sitesLog, logOrder);

  const getSiteStatusBadgeColor = (status: string) => {
    const siteStatus = Object.values(SiteStatus).find(ss => ss === status);
    if (siteStatus && SITE_STATUS_COLORS[siteStatus]) {
      const colorClasses = isDarkMode ? SITE_STATUS_COLORS[siteStatus].dark : SITE_STATUS_COLORS[siteStatus].light;
      return colorClasses;
    }
    
    // Default fallback
    const fallbackClasses = isDarkMode ? SITE_STATUS_COLORS[SiteStatus.INACTIVE].dark : SITE_STATUS_COLORS[SiteStatus.INACTIVE].light;
    return fallbackClasses;
  };

  const getSiteTypeIcon = (siteType: string) => {
    switch (siteType) {
      case SiteType.PHYSICAL:
        return <MapPin className="h-4 w-4 text-muted-foreground" />;
      case SiteType.DIGITAL:
        return <Cloud className="h-4 w-4 text-muted-foreground" />;
      case SiteType.SYSTEM:
        return <Sparkles className="h-4 w-4 text-muted-foreground" />;
      default:
        return <Home className="h-4 w-4 text-muted-foreground" />;
    }
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <div>
          <CardTitle>Sites Lifecycle Log</CardTitle>
          <CardDescription>
            Complete history of site lifecycle events
          </CardDescription>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setLogOrder(logOrder === 'newest' ? 'oldest' : 'newest')}
          >
            <ArrowUpDown className="h-4 w-4 mr-2" />
            {logOrder === 'newest' ? 'Oldest First' : 'Newest First'}
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={onReload}
            disabled={isReloading}
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${isReloading ? 'animate-spin' : ''}`} />
            Reload
          </Button>
        </div>
      </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {processedSitesLog.entries.length === 0 ? (
                  <p className="text-muted-foreground text-center py-4">No site lifecycle events found</p>
                ) : (
                  processedSitesLog.entries.map((entry: any, index: number) => {
                    // Handle BULK_IMPORT and BULK_EXPORT entries
                    const eventRaw = entry.event || entry.status || '';
                    const statusRaw = String(eventRaw).toUpperCase();
                    
                    if (statusRaw === 'BULK_IMPORT' || statusRaw === 'BULK_EXPORT') {
                      const operation = statusRaw === 'BULK_IMPORT' ? 'Bulk Import' : 'Bulk Export';
                      const count = entry.count || 0;
                      const source = entry.source || 'unknown';
                      const mode = entry.importMode || entry.exportFormat || '';
                      const date = entry.displayDate || entry.timestamp || '';
                      
                      return (
                        <div key={index} className="flex items-center gap-3 p-3 border rounded-lg bg-muted/30">
                          <div className="flex-1">
                            <div className="flex items-center gap-3 text-sm">
                              <Badge variant="outline" className="font-semibold">
                                {operation}
                              </Badge>
                              <span className="font-medium">
                                {count} site{count !== 1 ? 's' : ''} from {source}
                                {mode && ` (${mode})`}
                              </span>
                            </div>
                          </div>
                          <div className="flex-shrink-0">
                            <span className="text-xs text-muted-foreground whitespace-nowrap">
                              {date}
                            </span>
                          </div>
                        </div>
                      );
                    }
                    
                    // Handle ACTIVATED/DEACTIVATED events (status changes)
                    const eventType = entry.event || '';
                    const isActivated = eventType === 'ACTIVATED';
                    const isDeactivated = eventType === 'DEACTIVATED';
                    const isCreated = eventType === 'CREATED';
                    
                    // Determine status for display - use entry status or infer from event type
                    let status = entry.status || SiteStatus.ACTIVE;
                    if (isActivated) {
                      status = SiteStatus.ACTIVE;
                    } else if (isDeactivated) {
                      status = SiteStatus.INACTIVE;
                    } else if (isCreated && !entry.status) {
                      // New sites default to Active
                      status = SiteStatus.ACTIVE;
                    }
                    // Use displayName from normalization, fallback to entry data
                    const siteName = entry.displayName || entry.name || 'Site';
                    const siteType = entry.type || SiteType.PHYSICAL;
                    const businessType = entry.businessType || '—';
                    const settlement = entry.settlementId || '—';
                    const digitalType = entry.digitalType || '—';
                    const purpose = entry.systemType || '—';
                    const date = entry.displayDate || entry.timestamp || '';

                    return (
                      <div key={index} className="flex items-center gap-3 p-3 border rounded-lg hover:bg-muted/50 transition-colors">
                        {/* Icon */}
                        <div className="flex-shrink-0">
                          {getSiteTypeIcon(siteType)}
                        </div>
                        
                        {/* Main Info Row */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-3 text-sm">
                            {/* Status Badge */}
                            <div className={`inline-flex items-center rounded-full border px-2 py-1 text-xs font-semibold transition-colors ${getSiteStatusBadgeColor(status)}`}>
                              {status}
                            </div>
                            
                            {/* Name */}
                            <span className="font-medium text-foreground min-w-0 flex-shrink-0">
                              {siteName}
                            </span>
                            
                            {/* Type-specific data */}
                            {siteType === SiteType.PHYSICAL && (
                              <>
                                {settlement !== '—' && (
                                  <span className="text-muted-foreground min-w-0 flex-shrink-0">
                                    {settlement}
                                  </span>
                                )}
                                {businessType !== '—' && (
                                  <span className="text-muted-foreground min-w-0 flex-shrink-0">
                                    {businessType}
                                  </span>
                                )}
                              </>
                            )}
                            
                            {siteType === SiteType.DIGITAL && digitalType !== '—' && (
                              <span className="text-muted-foreground min-w-0 flex-shrink-0">
                                {digitalType}
                              </span>
                            )}
                            
                            {siteType === SiteType.SYSTEM && purpose !== '—' && (
                              <span className="text-muted-foreground min-w-0 flex-shrink-0">
                                {purpose}
                              </span>
                            )}
                            
                          </div>
                        </div>
                        
                        {/* Right Side: Date */}
                        <div className="flex items-center gap-2 flex-shrink-0">
                          {/* Date */}
                          <span className="text-xs text-muted-foreground whitespace-nowrap">
                            {date}
                          </span>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </CardContent>
          </Card>
  );
}
