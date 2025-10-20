'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { RefreshCw, ShoppingCart, DollarSign, Calendar, Link as LinkIcon, ArrowUpDown, Package } from 'lucide-react';
import { formatDisplayDate } from '@/lib/utils/date-utils';
import { LinksSubModal } from '@/components/modals/submodals/links-submodal';
import { useState, useMemo } from 'react';
import { processLogData } from '@/lib/utils/logging-utils';
import { SaleType, SaleStatus } from '@/types/enums';
import { FINANCIAL_ENTRY_ICONS, FINANCIAL_ABBREVIATIONS } from '@/lib/constants/icon-maps';

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
  const [logOrder, setLogOrder] = useState<'newest' | 'oldest'>('newest');
  const [showLinksModal, setShowLinksModal] = useState(false);
  const [selectedSaleId, setSelectedSaleId] = useState<string>('');
  const [saleLinks, setSaleLinks] = useState<any[]>([]);
  const [selectedLogEntry, setSelectedLogEntry] = useState<any>(null);

  // Process sales log data using the same pattern as other logs
  const processedSalesLog = useMemo(() => processLogData(salesLog, logOrder), [salesLog, logOrder]);
  const entries = processedSalesLog?.entries || [];

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

  return (
    <>
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
        <div className="space-y-1">
          <CardTitle className="flex items-center gap-2">
            <ShoppingCart className="h-5 w-5" />
            Sales Log
          </CardTitle>
          <CardDescription>
            Transaction records - Sales activities and revenue tracking
          </CardDescription>
        </div>
        <div className="flex items-center gap-2">
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
          {entries.length === 0 ? (
            <p className="text-muted-foreground text-center py-4">No sales log entries found</p>
          ) : (
            entries.map((entry: any, index: number) => {
              // Extract data from the rich logging structure
              const data = entry.data || {};
              const status: string = entry.status || data.saleStatus || data.status || 'Unknown';
              const name: string = data.saleName || data.name || entry.message || '—';
              const type: string = data.saleType || data.type || '—';
              const station: string = formatStation(data.station || entry.station);
              const category: string = formatCategory(data.category || entry.category);
              const date: string = entry.displayDate || entry.timestamp || '';
              const siteName: string = data.siteName || data.site || '';
              const customerName: string = data.customerName || data.customer || '';

              // Financial information - extract from totals or direct values
              const subtotal = data.totals?.subtotal || data.subtotal || 0;
              const discountTotal = data.totals?.discountTotal || data.discountTotal || 0;
              const taxTotal = data.totals?.taxTotal || data.taxTotal || 0;
              const revenue = data.totals?.totalRevenue || data.revenue || data.totalRevenue || 0;
              const cost = data.totals?.totalCost || data.cost || 0;
              const profit = revenue - cost;

              // Helper function to get color for financial values
              const getFinancialColor = (value: number) => {
                if (value < 0) return 'text-red-600 dark:text-red-400';
                if (value > 0) return 'text-green-600 dark:text-green-400';
                return 'text-muted-foreground';
              };

              // Financial info for first row with colors
              const financialInfo = (
                <>
                  <span className={getFinancialColor(revenue)}>R: ${revenue}</span>
                  {cost > 0 && (
                    <>
                      {' • '}
                      <span className={getFinancialColor(-cost)}>C: ${cost}</span>
                    </>
                  )}
                  {profit !== 0 && (
                    <>
                      {' • '}
                      <span className={getFinancialColor(profit)}>P: ${profit}</span>
                    </>
                  )}
                </>
              );

              // Relevant info based on sale content
              let relevantInfo = '';
              if (data.lines && data.lines.length > 0) {
                if (data.lines.length === 1) {
                  const line = data.lines[0];
                  if (line.kind === 'item') {
                    relevantInfo = line.itemName || line.description || 'Item';
                  } else if (line.kind === 'service') {
                    relevantInfo = line.description || 'Service';
                  }
                } else {
                  relevantInfo = `${data.lines.length} items`;
                }
              } else if (type !== '—') {
                relevantInfo = type;
              }

              // Second row info - station, category, and relevant info
              const secondRowParts = [];
              if (station !== '—' && category !== '—') {
                secondRowParts.push(`${station} • ${category}`);
              } else if (station !== '—') {
                secondRowParts.push(station);
              } else if (category !== '—') {
                secondRowParts.push(category);
              }
              if (relevantInfo) {
                secondRowParts.push(relevantInfo);
              }
              
              const secondRowInfo = secondRowParts.join(' • ');

              return (
                <div key={index} className="flex items-center gap-3 p-3 border rounded-lg hover:bg-muted/50 transition-colors">
                  {/* Icon */}
                  <div className="flex-shrink-0">
                    {getSaleTypeIcon(type)}
                  </div>
                  
                  {/* Main Info Row - ONE ROW like tasks */}
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
                      
                      {/* Financial Info */}
                      <span className="text-muted-foreground min-w-0 flex-shrink-0">
                        {financialInfo}
                      </span>
                      
                      {/* Relevant Info */}
                      {relevantInfo && (
                        <span className="text-muted-foreground min-w-0 flex-shrink-0">
                          {relevantInfo}
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
                          const links = await ClientAPI.getLinksFor({ type: 'sale', id: data.entityId });
                          setSaleLinks(links);
                          setSelectedSaleId(data.entityId);
                          setSelectedLogEntry(entry); // Pass the log entry context
                          setShowLinksModal(true);
                        } catch (error) {
                          console.error('Failed to fetch links:', error);
                        }
                      }}
                    >
                      <LinkIcon className="h-4 w-4" />
                    </Button>
                    
                    {/* Date */}
                    <div className="text-xs text-muted-foreground">
                      {date}
                    </div>
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
      entityType="sale"
      entityId={selectedSaleId}
      entityName="Sale"
      links={saleLinks}
      logEntry={selectedLogEntry}
    />
    </>
  );
}