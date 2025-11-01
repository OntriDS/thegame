'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ArrowUpDown, RefreshCw, TrendingUp, TrendingDown, Link as LinkIcon } from 'lucide-react';
import { useMemo, useState } from 'react';
import { processLogData } from '@/lib/utils/logging-utils';
import { FINANCIAL_ENTRY_ICONS, LOG_DISPLAY_ICONS, FINANCIAL_ABBREVIATIONS } from '@/lib/constants/icon-maps';
import { FINANCIAL_COLORS } from '@/lib/constants/color-constants';
import { LinksSubModal } from '@/components/modals/submodals/links-submodal';
import { EntityType } from '@/types/enums';
import { useUserPreferences } from '@/lib/hooks/use-user-preferences';
import { LogViewFilter } from '@/components/logs/log-view-filter';
import { useLogViewFilter } from '@/lib/hooks/use-log-view-filter';
import { LogManagementActions } from '@/components/logs/log-management-actions';

interface FinancialLogEntry {
  id?: string;
  entityId?: string;
  entityType?: 'task' | 'financial' | 'item' | 'character' | 'sale' | 'site';
  status?: string;
  type?: string;
  description?: string;
  message?: string;
  displayDate?: string;
  displayName?: string;  // From processLogData normalization
  timestamp?: string;
  data?: any;
  station?: string;
  category?: string;
  name?: string;
  taskName?: string;
  recordName?: string;
  cost?: number;
  revenue?: number;
  isNotPaid?: boolean;
  isNotCharged?: boolean;
}

interface FinancialsTabProps {
  financialsLog: any;
  onReload: () => void;
  isReloading: boolean;
}

export function FinancialsTab({ financialsLog, onReload, isReloading }: FinancialsTabProps) {
  const [activeSubTab, setActiveSubTab] = useState<string>('lifecycle-log');
  const [logOrder, setLogOrder] = useState<'newest' | 'oldest'>('newest');
  const [showLinksModal, setShowLinksModal] = useState(false);
  const [selectedFinancialId, setSelectedFinancialId] = useState<string>('');
  const [financialLinks, setFinancialLinks] = useState<any[]>([]);
  const [selectedLogEntry, setSelectedLogEntry] = useState<any>(null);
  const [selectedEntityType, setSelectedEntityType] = useState<string>(EntityType.FINANCIAL);
  const { getPreference } = useUserPreferences();
  const { filter, setFilter, getVisibleEntries } = useLogViewFilter({ entityType: EntityType.FINANCIAL });

  // Process financials log data
  const processedFinancialsLog = processLogData(financialsLog, logOrder);
  
  // Apply view filter to entries
  const visibleEntries = getVisibleEntries(processedFinancialsLog.entries || []);

  const formatStation = (station: string | undefined) => {
    if (!station) return '—';
    const lower = station.toLowerCase();
    return lower.charAt(0).toUpperCase() + lower.slice(1);
  };

  const getFinancialIcon = (entry: FinancialLogEntry) => {
    const Icon = FINANCIAL_ENTRY_ICONS[entry.entityType || 'task'] || FINANCIAL_ENTRY_ICONS.task;
    return <Icon className="h-4 w-4 text-muted-foreground" />;
  };

  const computeAmounts = (entry: FinancialLogEntry) => {
    
    const isNotPaid = Boolean(entry.isNotPaid);
    const isNotCharged = Boolean(entry.isNotCharged);
    
    // Check entry level first, then data level
    const rawCost = Number(entry.cost ?? 0);
    const rawRevenue = Number(entry.revenue ?? 0);
    
    const cost = isNotPaid ? 0 : rawCost;
    const revenue = isNotCharged ? 0 : rawRevenue;
    const profit = revenue - cost;
    const margin = revenue > 0 ? (profit / revenue) * 100 : 0;

    return { cost, revenue, profit, margin };
  };

  // Shared render function
  const renderFinancialEntry = ({ entry, amounts }: { entry: any, amounts: ReturnType<typeof computeAmounts> }, index: number) => {
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
            {getFinancialIcon(entry)}
          </div>
          <div className="flex-1">
            <div className="flex items-center gap-3 text-sm">
              <Badge variant="outline" className="font-semibold">
                {operation}
              </Badge>
              <span className="font-medium">
                {count} record{count !== 1 ? 's' : ''} from {source}
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
    
    // Extract financial fields properly - use displayName from normalization
    const name = entry.displayName || entry.name || entry.taskName || entry.recordName || entry.description || entry.message || 'Unnamed';
    const financialType = entry.type || '—';
    const station = formatStation(entry.station);
    const category = entry.category || '—';
    const date = entry.displayDate || entry.timestamp || '';
    
    // Extract financial amounts
    const { cost, revenue, profit, margin } = amounts;
    
    // Calculate display values
    const displayProfit = revenue - cost;
    const displayMargin = revenue > 0 ? ((displayProfit / revenue) * 100).toFixed(0) : '0';
    
    // Helper function to get color for financial values
    const getFinancialColor = (value: number) => {
      if (value < 0) return FINANCIAL_COLORS.negative;
      if (value > 0) return FINANCIAL_COLORS.positive;
      return FINANCIAL_COLORS.neutral;
    };

    return (
      <div key={index} className="flex items-center gap-3 p-3 border rounded-lg hover:bg-muted/50 transition-colors">
        {/* Icon */}
        <div className="flex-shrink-0">
          {getFinancialIcon(entry)}
        </div>
        
        {/* Main Info Row */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-3 text-sm">
            {/* Name */}
            <span className="font-medium text-foreground min-w-0 flex-shrink-0">
              {name}
            </span>
            
            {/* Type */}
            {financialType !== '—' && (
              <span className="text-muted-foreground min-w-0 flex-shrink-0">
                {financialType}
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
            
            {/* Cost - ALWAYS show if there's any cost data */}
            {cost !== 0 && (
              <span className={`font-medium ${FINANCIAL_COLORS.negative} min-w-0 flex-shrink-0`}>
                Cost: ${cost.toLocaleString()}
              </span>
            )}
            
            {/* Revenue - ALWAYS show if there's any revenue data */}
            {revenue !== 0 && (
              <span className={`font-medium ${FINANCIAL_COLORS.positive} min-w-0 flex-shrink-0`}>
                Rev: ${revenue.toLocaleString()}
              </span>
            )}
            
            {/* Profit */}
            {displayProfit !== 0 && (
              <span className={`font-medium ${getFinancialColor(displayProfit)} min-w-0 flex-shrink-0`}>
                {displayProfit > 0 ? 'Profit' : 'Loss'}: ${displayProfit.toLocaleString()}
              </span>
            )}
            
            {/* Margin */}
            {displayMargin !== '0' && (
              <span className={`font-medium ${getFinancialColor(Number(displayMargin))} min-w-0 flex-shrink-0`}>
                {displayMargin}%
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
                
                const entityId = entry.entityId;
                let links: any[] = [];
                let linkType = 'financial';
                
                if (entry.financialDescription === 'Sale revenue' || entry.type === 'sale_financial') {
                  linkType = 'sale';
                  links = await ClientAPI.getLinksFor({ type: EntityType.SALE, id: entityId });
                } else {
                  linkType = 'financial';
                  links = await ClientAPI.getLinksFor({ type: EntityType.FINANCIAL, id: entityId });
                }
                
                setFinancialLinks(links);
                setSelectedFinancialId(entityId);
                setSelectedEntityType(linkType);
                setSelectedLogEntry(entry);
                setShowLinksModal(true);
              } catch (error) {
                console.error('Failed to fetch financial links:', error);
              }
            }}
          >
            <LinkIcon className="h-4 w-4 text-muted-foreground hover:text-foreground" />
          </Button>
          
          {/* Log Management Actions */}
          <LogManagementActions
            entityType={EntityType.FINANCIAL}
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
  };

  // Check if log management is enabled
  const logManagementEnabled = getPreference('log-management-enabled', false);

  // Get all entries with filtering
  const allEntries = useMemo(() => {
    return visibleEntries.map((entry: any) => ({ entry, amounts: computeAmounts(entry) }));
  }, [visibleEntries]);

  return (
    <>
    <Tabs value={activeSubTab} onValueChange={setActiveSubTab} className="space-y-4">
      <TabsList className="grid w-full grid-cols-2">
        <TabsTrigger value="lifecycle-log">Lifecycle Log</TabsTrigger>
        <TabsTrigger value="financial-analysis">Financial Analysis</TabsTrigger>
      </TabsList>

      <TabsContent value="lifecycle-log" className="space-y-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <div>
              <CardTitle>Financial Lifecycle Log</CardTitle>
              <CardDescription>
                Complete financial transaction history
              </CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <LogViewFilter value={filter} onChange={setFilter} />
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
              {visibleEntries.length === 0 ? (
                <div className="text-center py-8">
                  <p className="text-muted-foreground mb-2">
                    No financial records found
                  </p>
                </div>
              ) : (
                visibleEntries.map((entryData, index) => renderFinancialEntry(entryData, index))
              )}
            </div>
          </CardContent>
        </Card>
      </TabsContent>

      <TabsContent value="financial-analysis" className="space-y-4">
        <Card>
          <CardHeader>
            <CardTitle>Financial Analysis</CardTitle>
            <CardDescription>
              Detailed financial statistics and analytics
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground text-center py-8">
              Financial analysis coming soon...
            </p>
          </CardContent>
        </Card>
      </TabsContent>
    </Tabs>

    {/* Links Modal */}
    <LinksSubModal
      open={showLinksModal}
      onOpenChange={setShowLinksModal}
      entityType={selectedEntityType}
      entityId={selectedFinancialId}
      entityName={selectedEntityType === 'sale' ? 'Sale' : 'Financial Record'}
      links={financialLinks}
      logEntry={selectedLogEntry}
    />
    </>
  );
}
