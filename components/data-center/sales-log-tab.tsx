'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { RefreshCw, ShoppingCart, DollarSign, Calendar, Link as LinkIcon, ArrowUpDown, Package } from 'lucide-react';
import { formatDisplayDate } from '@/lib/utils/date-utils';
import { EntityType } from '@/types/enums';
import { LinksSubModal } from '@/components/modals/submodals/links-submodal';
import { useState } from 'react';
import { processLogData } from '@/lib/utils/logging-utils';
import { SaleType, SaleStatus } from '@/types/enums';
import { FINANCIAL_ENTRY_ICONS, FINANCIAL_ABBREVIATIONS } from '@/lib/constants/icon-maps';
import { useUserPreferences } from '@/lib/hooks/use-user-preferences';
import { LogViewFilter } from '@/components/log-management/log-view-filter';
import { useLogViewFilter } from '@/lib/hooks/use-log-view-filter';
import { LogManagementActions } from '@/components/log-management/log-management-actions';

interface SalesLogTabProps {
  salesLog: any;
  onReload: () => void;
  isReloading: boolean;
}

/**
 * SalesLogTab - Display Sale entity logs
 * 
 * Sale = Transaction Records
 * - Sale Date, Type, Status
 * - Lines (items/services sold)
 * - Totals (subtotal, discount, tax, revenue)
 * - Payment information
 * - Customer/counterparty information
 * 
 * This tab shows the audit trail of all sales activities
 */
export function SalesLogTab({ salesLog, onReload, isReloading }: SalesLogTabProps) {
  const [activeSubTab, setActiveSubTab] = useState<string>('lifecycle-log');
  const [logOrder, setLogOrder] = useState<'newest' | 'oldest'>('newest');
  const [showLinksModal, setShowLinksModal] = useState(false);
  const [selectedSaleId, setSelectedSaleId] = useState<string>('');
  const [saleLinks, setSaleLinks] = useState<any[]>([]);
  const [selectedLogEntry, setSelectedLogEntry] = useState<any>(null);
  const { getPreference } = useUserPreferences();
  const { filter, setFilter, getVisibleEntries } = useLogViewFilter({ entityType: EntityType.SALE });

  // Process sales log data
  const processedSalesLog = processLogData(salesLog, logOrder);
  const entries = processedSalesLog?.entries || [];
  
  // Apply view filter to entries
  const visibleEntries = getVisibleEntries(entries);

  // Helper functions
  const getSaleTypeIcon = (saleType: string | undefined) => {
    const normalized = (saleType || '').toUpperCase() as SaleType;
    // Use different icons for different sale types
    switch (normalized) {
      case SaleType.DIRECT: return <DollarSign className="h-4 w-4 text-muted-foreground" />;
      case SaleType.FERIA: return <Calendar className="h-4 w-4 text-muted-foreground" />;
      case SaleType.BUNDLE_SALE: return <ShoppingCart className="h-4 w-4 text-muted-foreground" />;
      case SaleType.CONSIGNMENT: return <Package className="h-4 w-4 text-muted-foreground" />;
      case SaleType.ONLINE: return <DollarSign className="h-4 w-4 text-muted-foreground" />;
      case SaleType.NFT: return <DollarSign className="h-4 w-4 text-muted-foreground" />;
      default: return <ShoppingCart className="h-4 w-4 text-muted-foreground" />;
    }
  };

  const getSaleStatusBadgeColor = (status: string) => {
    const normalized = status.toLowerCase();
    switch (normalized) {
      case 'pending':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200 dark:bg-yellow-900 dark:text-yellow-200 dark:border-yellow-700';
      case 'charged':
        return 'bg-green-100 text-green-800 border-green-200 dark:bg-green-900 dark:text-green-200 dark:border-green-700';
      case 'cancelled':
        return 'bg-red-100 text-red-800 border-red-200 dark:bg-red-900 dark:text-red-200 dark:border-red-700';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200 dark:bg-gray-900 dark:text-gray-200 dark:border-gray-700';
    }
  };

  const formatStation = (value: string | undefined) => {
    if (!value || typeof value !== 'string' || value === '—') return '—';
    const lower = value.toLowerCase();
    return lower.charAt(0).toUpperCase() + lower.slice(1);
  };

  const formatCategory = (value: string | undefined) => {
    if (!value || typeof value !== 'string' || value === '—') return '—';
    const lower = value.toLowerCase();
    return lower.charAt(0).toUpperCase() + lower.slice(1);
  };

  // Check if log management is enabled
  const logManagementEnabled = getPreference('log-management-enabled', false);

  return (
    <>
    <Tabs value={activeSubTab} onValueChange={setActiveSubTab} className="space-y-4">
      <TabsList className="grid w-full grid-cols-2">
        <TabsTrigger value="lifecycle-log">Lifecycle Log</TabsTrigger>
        <TabsTrigger value="sales-analysis">Sales Analysis</TabsTrigger>
      </TabsList>

      <TabsContent value="lifecycle-log" className="space-y-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
            <div className="space-y-1">
              <CardTitle className="flex items-center gap-2">
                <ShoppingCart className="h-5 w-5" />
                Sales Lifecycle Log
              </CardTitle>
          <CardDescription>
            Transaction records - Sales activities and revenue tracking
          </CardDescription>
        </div>
        <div className="flex items-center gap-2">
          {logManagementEnabled && <LogViewFilter value={filter} onChange={setFilter} />}
          <Button 
            variant="outline" 
            size="sm" 
            onClick={() => setLogOrder(logOrder === 'newest' ? 'oldest' : 'newest')}
            className="flex items-center gap-2"
          >
            <ArrowUpDown className="h-4 w-4" />
            {logOrder === 'newest' ? 'Oldest First' : 'Newest First'}
          </Button>
          <Button 
            variant="outline" 
            size="sm" 
            onClick={onReload}
            disabled={isReloading}
            className="flex items-center gap-2"
          >
            <RefreshCw className={`h-4 w-4 ${isReloading ? 'animate-spin' : ''}`} />
            Reload
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          {visibleEntries.length === 0 ? (
            <p className="text-muted-foreground text-center py-4">No sales log entries found</p>
          ) : (
            visibleEntries.map((entry: any, index: number) => {
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
                    <div className="flex-shrink-0">
                      {getSaleTypeIcon('DIRECT')}
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-3 text-sm">
                        <Badge variant="outline" className="font-semibold">
                          {operation}
                        </Badge>
                        <span className="font-medium">
                          {count} sale{count !== 1 ? 's' : ''} from {source}
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
              
              // Extract data from the rich logging structure
              const status: string = entry.status || 'Unknown';
              // Use displayName from normalization, fallback to entry data
              const name: string = entry.displayName || entry.name || entry.saleName || entry.message || '—';
              const type: string = entry.type || entry.saleType || '—';
              const station: string = formatStation(entry.station);
              const category: string = formatCategory(entry.category);
              const date: string = entry.displayDate || entry.timestamp || '';
              const siteName: string = entry.siteName || entry.site || '';
              const customerName: string = entry.customerName || entry.customer || '';

              // Financial information - extract from totals or direct values
              const subtotal = entry.totals?.subtotal || entry.subtotal || 0;
              const discountTotal = entry.totals?.discountTotal || entry.discountTotal || 0;
              const taxTotal = entry.totals?.taxTotal || entry.taxTotal || 0;
              const revenue = entry.totals?.totalRevenue || entry.revenue || entry.totalRevenue || 0;
              const cost = entry.totals?.totalCost || entry.cost || 0;
              const profit = revenue - cost;

              // Helper function to get color for financial values
              const getFinancialColor = (value: number) => {
                if (value < 0) return 'text-red-600 dark:text-red-400';
                if (value > 0) return 'text-green-600 dark:text-green-400';
                return 'text-muted-foreground';
              };

              return (
                <div key={index} className="flex items-center gap-3 p-3 border rounded-lg hover:bg-muted/50 transition-colors">
                  {/* Icon */}
                  <div className="flex-shrink-0">
                    {getSaleTypeIcon(type)}
                  </div>
                  
                  {/* Main Info Row - Matches Tasks/Items/Financials pattern */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-3 text-sm">
                      {/* Status Badge */}
                      <div className={`inline-flex items-center rounded-full border px-2 py-1 text-xs font-semibold transition-colors ${getSaleStatusBadgeColor(status)}`}>
                        {status}
                      </div>
                      
                      {/* Name */}
                      <span className="font-medium text-foreground min-w-0 flex-shrink-0">
                        {name}
                      </span>
                      
                      {/* Type */}
                      {type !== '—' && (
                        <span className="text-muted-foreground min-w-0 flex-shrink-0">
                          {type}
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
                      
                      {/* Revenue */}
                      {revenue > 0 && (
                        <span className="font-medium text-green-600 dark:text-green-400 min-w-0 flex-shrink-0">
                          Rev: ${revenue.toLocaleString()}
                        </span>
                      )}
                      
                      {/* Cost */}
                      {cost > 0 && (
                        <span className="font-medium text-red-600 dark:text-red-400 min-w-0 flex-shrink-0">
                          Cost: ${cost.toLocaleString()}
                        </span>
                      )}
                      
                      {/* Profit */}
                      {profit !== 0 && (
                        <span className={`font-medium ${getFinancialColor(profit)} min-w-0 flex-shrink-0`}>
                          {profit > 0 ? 'Profit' : 'Loss'}: ${profit.toLocaleString()}
                        </span>
                      )}
                      
                      {/* Margin */}
                      {revenue > 0 && profit !== 0 && (
                        <span className={`font-medium ${getFinancialColor(((profit / revenue) * 100))} min-w-0 flex-shrink-0`}>
                          {((profit / revenue) * 100).toFixed(0)}%
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
                          const links = await ClientAPI.getLinksFor({ type: EntityType.SALE, id: entry.entityId });
                          setSaleLinks(links);
                          setSelectedSaleId(entry.entityId);
                          setSelectedLogEntry(entry);
                          setShowLinksModal(true);
                        } catch (error) {
                          console.error('Failed to fetch links:', error);
                        }
                      }}
                    >
                      <LinkIcon className="h-4 w-4 text-muted-foreground hover:text-foreground" />
                    </Button>

                    {/* Log Management Actions */}
                    <LogManagementActions
                      entityType={EntityType.SALE}
                      entry={entry}
                      onReload={onReload}
                      logManagementEnabled={logManagementEnabled}
                    />
                    
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

      <TabsContent value="sales-analysis" className="space-y-4">
        <Card>
          <CardHeader>
            <CardTitle>Sales Analysis</CardTitle>
            <CardDescription>
              Detailed sales statistics and analytics
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground text-center py-8">
              Sales analysis coming soon...
            </p>
          </CardContent>
        </Card>
      </TabsContent>
    </Tabs>
    
    {/* Links SubModal */}
    <LinksSubModal
      open={showLinksModal}
      onOpenChange={setShowLinksModal}
      entityType="sale"
      entityId={selectedSaleId}
      entityName="Sale"
      links={saleLinks}
      logEntry={selectedLogEntry}
    />
    </>
  );
}