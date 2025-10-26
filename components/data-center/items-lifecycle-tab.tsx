'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ArrowUpDown, RefreshCw, Link } from 'lucide-react';
import { LinksSubModal } from '@/components/modals/submodals/links-submodal';
import { useState } from 'react';
import { processLogData } from '@/lib/utils/logging-utils';
import { EntityType, LogEventType } from '@/types/enums';
import { LOG_DISPLAY_ICONS, FINANCIAL_ABBREVIATIONS } from '@/lib/constants/icon-maps';
import { ItemStatus, ItemType } from '@/types/enums';
import { ITEM_STATUS_COLORS } from '@/lib/constants/color-constants';
import { useThemeColors } from '@/lib/hooks/use-theme-colors';
import { ITEM_TYPE_ICONS } from '@/lib/constants/icon-maps';

interface ItemsLifecycleTabProps {
  itemsLog: any;
  onReload: () => void;
  isReloading: boolean;
}

export function ItemsLifecycleTab({ itemsLog, onReload, isReloading }: ItemsLifecycleTabProps) {
  const { isDarkMode } = useThemeColors();
  const [activeSubTab, setActiveSubTab] = useState<string>('lifecycle-log');
  const [logOrder, setLogOrder] = useState<'newest' | 'oldest'>('newest');
  const [showLinksModal, setShowLinksModal] = useState(false);
  const [selectedItemId, setSelectedItemId] = useState<string>('');
  const [itemLinks, setItemLinks] = useState<any[]>([]);
  const [selectedLogEntry, setSelectedLogEntry] = useState<any>(null);

  // Process items log data
  const processedItemsLog = processLogData(itemsLog, logOrder);

  const getItemStatusBadgeColor = (status: string) => {
    const itemStatus = Object.values(ItemStatus).find(is => is === status);
    if (itemStatus && ITEM_STATUS_COLORS[itemStatus]) {
      const colorClasses = isDarkMode ? ITEM_STATUS_COLORS[itemStatus].dark : ITEM_STATUS_COLORS[itemStatus].light;
      return colorClasses;
    }
    
    const normalizedStatus = status.toLowerCase();
    const statusMap: Record<string, ItemStatus> = {
      'created': ItemStatus.CREATED,
      'for_sale': ItemStatus.FOR_SALE,
      'sold': ItemStatus.SOLD,
      'to order': ItemStatus.TO_ORDER,
      'to do': ItemStatus.TO_DO,
      'gifted': ItemStatus.GIFTED,
      'reserved': ItemStatus.RESERVED,
      'obsolete': ItemStatus.OBSOLETE,
      'damaged': ItemStatus.DAMAGED,
      'idle': ItemStatus.IDLE,
      'collected': ItemStatus.COLLECTED,
      'consigned': ItemStatus.CONSIGNED,
    };
    
    const mappedStatus = statusMap[normalizedStatus];
    if (mappedStatus && ITEM_STATUS_COLORS[mappedStatus]) {
      const colorClasses = isDarkMode ? ITEM_STATUS_COLORS[mappedStatus].dark : ITEM_STATUS_COLORS[mappedStatus].light;
      return colorClasses;
    }
    
    const fallbackClasses = isDarkMode ? ITEM_STATUS_COLORS[ItemStatus.IDLE].dark : ITEM_STATUS_COLORS[ItemStatus.IDLE].light;
    return fallbackClasses;
  };

  const getItemTypeIcon = (itemType: string | undefined) => {
    const key = (itemType || 'default').toLowerCase();
    const Icon = ITEM_TYPE_ICONS[key] || ITEM_TYPE_ICONS.default;
    return <Icon className="h-4 w-4 text-muted-foreground" />;
  };

  return (
    <Tabs value={activeSubTab} onValueChange={setActiveSubTab} className="space-y-4">
      <TabsList className="grid w-full grid-cols-2">
        <TabsTrigger value="lifecycle-log">Lifecycle Log</TabsTrigger>
        <TabsTrigger value="item-analysis">Item Analysis</TabsTrigger>
      </TabsList>

      <TabsContent value="lifecycle-log" className="space-y-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <div>
              <CardTitle>Items Lifecycle Log</CardTitle>
              <CardDescription>
                Complete history of item lifecycle events
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
              {processedItemsLog.entries.length === 0 ? (
                <p className="text-muted-foreground text-center py-4">No item lifecycle events found</p>
              ) : (
                processedItemsLog.entries.map((entry: any, index: number) => {
                  const data = entry?.data || {};
                  
                  // Extract status with proper normalization
                  const statusRaw: string = entry.event || entry.action || entry.type || entry.status || 'unknown';
                  let status = statusRaw;
                  let statusDisplayName = statusRaw;
                  
                  // Normalize status display name
                  if (statusRaw.toLowerCase() === LogEventType.CREATED.toLowerCase()) {
                    statusDisplayName = 'Created';
                  } else if (statusRaw.toLowerCase() === LogEventType.UPDATED.toLowerCase()) {
                    statusDisplayName = 'Updated';
                  } else if (statusRaw.toLowerCase() === LogEventType.COLLECTED.toLowerCase()) {
                    statusDisplayName = 'Collected';
                  }
                  
                  // Extract item fields
                  const name = data.name || entry.name || entry.itemName || 'Unnamed Item';
                  const itemType = data.type || entry.type || data.itemType || entry.itemType || '—';
                  const station = data.station || entry.station || '—';
                  const category = data.category || entry.category || '—';
                  const quantity = data.quantity || entry.quantity;
                  const unitCost = data.unitCost || data.cost || 0;
                  const price = data.price || 0;
                  const date = entry.displayDate || entry.timestamp || '';
                  
                  // Handle bulk operations
                  if (statusRaw === 'BULK_IMPORT' || statusRaw === 'BULK_EXPORT') {
                    const count = data.count || 0;
                    const source = data.source || 'backup folder';
                    const importMode = data.importMode;
                    
                    return (
                      <div key={index} className="flex items-center gap-3 p-3 border rounded-lg hover:bg-muted/50 transition-colors">
                        <div className="flex-shrink-0">
                          {getItemTypeIcon(itemType)}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-3 text-sm">
                            <div className={`inline-flex items-center rounded-full border px-2 py-1 text-xs font-semibold transition-colors ${getItemStatusBadgeColor(status)}`}>
                              {statusRaw === 'BULK_IMPORT' ? 'Bulk Import' : 'Bulk Export'}
                            </div>
                            <span className="font-medium text-foreground">
                              {statusRaw === 'BULK_IMPORT' 
                                ? `${count} items imported from ${source} (${importMode || 'merge'} mode)`
                                : `${count} items exported to backup folder`}
                            </span>
                          </div>
                        </div>
                        <span className="text-xs text-muted-foreground whitespace-nowrap">
                          {date}
                        </span>
                      </div>
                    );
                  }
                  
                  // Regular item entry - match tasks log structure
                  return (
                    <div key={index} className="flex items-center gap-3 p-3 border rounded-lg hover:bg-muted/50 transition-colors">
                      {/* Icon */}
                      <div className="flex-shrink-0">
                        {getItemTypeIcon(itemType)}
                      </div>
                      
                      {/* Main Info Row */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-3 text-sm">
                          {/* Status Badge */}
                          <div className={`inline-flex items-center rounded-full border px-2 py-1 text-xs font-semibold transition-colors ${getItemStatusBadgeColor(status)}`}>
                            {statusDisplayName}
                          </div>
                          
                          {/* Name */}
                          <span className="font-medium text-foreground min-w-0 flex-shrink-0">
                            {name}
                          </span>
                          
                          {/* Type */}
                          {itemType !== '—' && (
                            <span className="text-muted-foreground min-w-0 flex-shrink-0">
                              {itemType}
                            </span>
                          )}
                          
                          {/* Station */}
                          {station !== '—' && (
                            <span className="text-muted-foreground min-w-0 flex-shrink-0">
                              {station}
                            </span>
                          )}
                          
                          {/* Category */}
                          {category !== '—' && (
                            <span className="text-muted-foreground min-w-0 flex-shrink-0">
                              {category}
                            </span>
                          )}
                          
                          {/* Quantity */}
                          {quantity !== undefined && quantity > 0 && (
                            <span className="text-muted-foreground min-w-0 flex-shrink-0">
                              Q: {quantity}
                            </span>
                          )}
                          
                          {/* Unit Cost */}
                          {unitCost > 0 && (
                            <span className="text-muted-foreground min-w-0 flex-shrink-0">
                              Cost: ${unitCost}
                            </span>
                          )}
                          
                          {/* Price */}
                          {price > 0 && (
                            <span className="text-muted-foreground min-w-0 flex-shrink-0">
                              ${price}
                            </span>
                          )}
                        </div>
                      </div>
                      
                      {/* Right Side: Links Icon + Date */}
                      <div className="flex items-center gap-2 flex-shrink-0">
                        {/* Links Icon */}
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-6 w-6 p-0"
                          onClick={async () => {
                            try {
                              const { ClientAPI } = await import('@/lib/client-api');
                              const links = await ClientAPI.getLinksFor({ type: EntityType.ITEM, id: data.entityId || entry.entityId });
                              setItemLinks(links);
                              setSelectedItemId(data.entityId || entry.entityId);
                              setSelectedLogEntry(entry);
                              setShowLinksModal(true);
                            } catch (error) {
                              console.error('Failed to fetch links:', error);
                            }
                          }}
                        >
                          <Link className="h-4 w-4 text-muted-foreground hover:text-foreground" />
                        </Button>
                        
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
      </TabsContent>

      {/* Placeholder for item analysis */}
      <TabsContent value="item-analysis" className="space-y-4">
        <Card>
          <CardHeader>
            <CardTitle>Item Analysis</CardTitle>
            <CardDescription>
              Detailed item statistics and analytics
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground text-center py-8">
              Item analysis coming soon...
            </p>
          </CardContent>
        </Card>
      </TabsContent>

      {/* Links Modal */}
      <LinksSubModal
        open={showLinksModal}
        onOpenChange={setShowLinksModal}
        entityType="item"
        entityId={selectedItemId}
        entityName="Item"
        links={itemLinks}
        logEntry={selectedLogEntry}
      />
    </Tabs>
  );
}
