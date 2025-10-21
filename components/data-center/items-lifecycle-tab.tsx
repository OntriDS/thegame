'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ArrowUpDown, RefreshCw, Link } from 'lucide-react';
import { LinksSubModal } from '@/components/modals/submodals/links-submodal';
import { useState } from 'react';
import { processLogData } from '@/lib/utils/logging-utils';
import { EntityType } from '@/types/enums';
import { LOG_DISPLAY_ICONS, FINANCIAL_ABBREVIATIONS } from '@/lib/constants/icon-maps';
import { ItemStatus } from '@/types/enums';
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

  // Ensure Tailwind recognizes all possible classes by listing them here:
  // bg-orange-100 text-orange-800 bg-orange-900 text-orange-200 (CREATED)
  // bg-blue-100 text-blue-800 bg-blue-900 text-blue-200 (FOR_SALE, TO_ORDER, TO_DO)
  // bg-green-100 text-green-800 bg-green-900 text-green-200 (SOLD)
  // bg-purple-100 text-purple-800 bg-purple-900 text-purple-200 (RESERVED)
  // bg-gray-100 text-gray-800 bg-gray-800 text-gray-200 (GIFTED, IDLE)
  // bg-yellow-100 text-yellow-800 bg-yellow-900 text-yellow-200 (COLLECTED)
  // bg-red-100 text-red-800 bg-red-900 text-red-200 (OBSOLETE, DAMAGED)
   
  const getItemStatusBadgeColor = (status: string) => {
    // First check if it's already an ItemStatus enum value
    const itemStatus = Object.values(ItemStatus).find(is => is === status);
    if (itemStatus && ITEM_STATUS_COLORS[itemStatus]) {
      const colorClasses = isDarkMode ? ITEM_STATUS_COLORS[itemStatus].dark : ITEM_STATUS_COLORS[itemStatus].light;
      console.log('🎨 Item status badge color:', { status, itemStatus, colorClasses, isDarkMode });
      return colorClasses;
    }
    
    // Map lowercase/string statuses to ItemStatus enum values
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
    };
    
    const mappedStatus = statusMap[normalizedStatus];
    if (mappedStatus && ITEM_STATUS_COLORS[mappedStatus]) {
      const colorClasses = isDarkMode ? ITEM_STATUS_COLORS[mappedStatus].dark : ITEM_STATUS_COLORS[mappedStatus].light;
      console.log('🎨 Item status badge mapped color:', { status, normalizedStatus, mappedStatus, colorClasses, isDarkMode });
      return colorClasses;
    }
    
    // Default fallback
    const fallbackClasses = isDarkMode ? ITEM_STATUS_COLORS[ItemStatus.IDLE].dark : ITEM_STATUS_COLORS[ItemStatus.IDLE].light;
    console.log('🎨 Item status badge fallback color:', { status, fallbackClasses, isDarkMode });
    return fallbackClasses;
  };

  const getItemTypeIcon = (itemType: string | undefined) => {
    const key = (itemType || 'default').toLowerCase();
    const Icon = ITEM_TYPE_ICONS[key] || ITEM_TYPE_ICONS.default;
    return <Icon className="h-4 w-4 text-muted-foreground" />;
  };

  const getActionLabel = (entry: any) => {
    const data = entry?.data || {};
    
    // TODO: Implement proper Links System lookup
    // This should:
    // 1. Look up ITEM_TASK link to find which task created this item
    // 2. Look up TASK_CHARACTER link to find which character completed that task
    // 3. Show: "created by: CharacterName (FOUNDER, PLAYER) via Task 'TaskName'"
    
    // For now, fallback to existing logic
    if (data.characterId && data.characterName) {
      return `created by: ${data.characterName} (${data.characterRoles?.join(', ') || 'Character'})`;
    }
    
    // Check for task information
    const originTask = data.taskName || entry?.taskName;
    if (originTask) {
      return `created by: Task "${originTask}"`;
    }
    
    // Check for record information
    const originRecord = data.recordName || entry?.recordName;
    if (originRecord) {
      return `created by: Record "${originRecord}"`;
    }
    
    // Fallback to source
    const source = data.source || entry?.source;
    if (source === 'item-modal') {
      return 'created by: item modal';
    }
    if (source) {
      return `created by: ${source}`;
    }
    
    return '';
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
                  const statusRaw: string = entry.event || entry.action || entry.type || 'unknown';
                  const status = statusRaw.charAt(0).toUpperCase() + statusRaw.slice(1);
                  
                  // Handle bulk seeded entries specially
                  let itemName: string = '—';
                  let itemType: string = '—';
                  
                  if (status === 'BULK_IMPORT' || status === 'BULK_EXPORT' || status === 'Bulk_seeded' || status === 'Bulk Seed') {
                    // For bulk operation entries, show the count and source
                    const count = data.count || 0;
                    const source = data.source || 'backup folder';
                    const importMode = data.importMode;
                    
                    if (status === 'BULK_IMPORT') {
                      itemName = `${count} items imported`;
                      itemType = `from ${source} (${importMode || 'merge'} mode)`;
                    } else if (status === 'BULK_EXPORT') {
                      itemName = `${count} items exported`;
                      itemType = `to backup folder`;
                    } else {
                      // Legacy bulk seeded
                      itemName = `${count} items`;
                      itemType = `from ${source}`;
                    }
                  } else {
                    // For regular entries, use normal logic
                    itemName = data.itemName || data.name || entry.itemName || entry.message || '—';
                    itemType = data.itemType || entry.itemType || '—';
                  }
                  const subType: string = data.subItemType || entry.subItemType || '—';
                  const quantity: number | string | undefined = data.quantity ?? entry.quantity;
                  const date: string = entry.displayDate || entry.timestamp || '';
                  const createdByLabel = getActionLabel(entry);
                  const taskName = data.taskName || entry.taskName;

                  // Quantity info for first row (if available)
                  let quantityInfo = '';
                  if (quantity !== undefined && quantity !== 0) {
                    quantityInfo = `• ${FINANCIAL_ABBREVIATIONS.QUANTITY}: ${quantity}`;
                  }
                  
                  // Second row info - same format as tasks log
                  const secondRowParts = [];
                  if (data.station && data.category) {
                    secondRowParts.push(`${data.station} • ${data.category}`);
                  } else if (data.station) {
                    secondRowParts.push(data.station);
                  } else if (data.category) {
                    secondRowParts.push(data.category);
                  }
                  if (itemType !== '—') {
                    secondRowParts.push(itemType);
                  }
                  
                  const secondRowInfo = secondRowParts.join(' • ');

                  // Extract all the data we need for the new compact display
                  const station = data.station || '—';
                  const category = data.category || '—';
                  const subtype = data.subItemType || '—';
                  const unitCost = data.unitCost || data.cost || 0;
                  const price = data.price || 0;
                  
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
                            {status}
                          </div>
                          
                          {/* Name */}
                          <span className="font-medium text-foreground min-w-0 flex-shrink-0">
                            {itemName}
                          </span>
                          
                          {/* Station */}
                          <span className="text-muted-foreground min-w-0 flex-shrink-0">
                            {station}
                          </span>
                          
                          {/* Category */}
                          <span className="text-muted-foreground min-w-0 flex-shrink-0">
                            {category}
                          </span>
                          
                          {/* Type */}
                          <span className="text-muted-foreground min-w-0 flex-shrink-0">
                            {itemType}
                          </span>
                          
                          {/* Subtype (only if not default) */}
                          {subtype !== '—' && (
                            <span className="text-muted-foreground min-w-0 flex-shrink-0">
                              {subtype}
                            </span>
                          )}
                          
                          {/* Quantity */}
                          {quantity !== undefined && quantity !== 0 && (
                            <span className="text-muted-foreground min-w-0 flex-shrink-0">
                              Q: {quantity}
                            </span>
                          )}
                          
                          {/* Unit Cost */}
                          {unitCost > 0 && (
                            <span className="text-muted-foreground min-w-0 flex-shrink-0">
                              U. Cost: ${unitCost}
                            </span>
                          )}
                          
                          {/* Price */}
                          {price > 0 && (
                            <span className="text-muted-foreground min-w-0 flex-shrink-0">
                              Price: ${price}
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
                              const links = await ClientAPI.getLinksFor({ type: EntityType.ITEM, id: data.entityId });
                              setItemLinks(links);
                              setSelectedItemId(data.entityId);
                              setSelectedLogEntry(entry); // Pass the log entry context
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
        
        {/* Links SubModal */}
        <LinksSubModal
          open={showLinksModal}
          onOpenChange={setShowLinksModal}
          entityType="item"
          entityId={selectedItemId}
          entityName="Item"
          links={itemLinks}
          logEntry={selectedLogEntry}
        />
      </TabsContent>

      <TabsContent value="item-analysis" className="space-y-4">
        <Card>
          <CardHeader>
            <CardTitle>Item Analysis</CardTitle>
            <CardDescription>
              Overview of item performance and statistics
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="text-center">
                <p className="text-2xl font-bold text-blue-600">
                  {(processedItemsLog.counts as any)['created'] || 0}
                </p>
                <p className="text-sm text-muted-foreground">Items Created</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold text-green-600">
                  {(processedItemsLog.counts as any)['sold'] || 0}
                </p>
                <p className="text-sm text-muted-foreground">Items Sold</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold text-orange-600">
                  {(processedItemsLog.counts as any)['moved'] || 0}
                </p>
                <p className="text-sm text-muted-foreground">Items Moved</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold text-purple-600">
                  {(processedItemsLog.counts as any)['updated'] || 0}
                </p>
                <p className="text-sm text-muted-foreground">Items Updated</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </TabsContent>
    </Tabs>
  );
}
