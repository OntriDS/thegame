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

interface FinancialLogEntry {
  id?: string;
  entityId?: string;
  entityType?: 'task' | 'financial' | 'item' | 'character' | 'sale' | 'site';
  status?: string;
  type?: string;
  description?: string;
  message?: string;
  displayDate?: string;
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
  const [activeSubTab, setActiveSubTab] = useState<string>('all');
  const [logOrder, setLogOrder] = useState<'newest' | 'oldest'>('newest');
  const [showLinksModal, setShowLinksModal] = useState(false);
  const [selectedFinancialId, setSelectedFinancialId] = useState<string>('');
  const [financialLinks, setFinancialLinks] = useState<any[]>([]);
  const [selectedLogEntry, setSelectedLogEntry] = useState<any>(null);
  const [selectedEntityType, setSelectedEntityType] = useState<string>(EntityType.FINANCIAL);

  // Process financials log data
  const processedFinancialsLog = processLogData(financialsLog, logOrder);

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
    const data = entry?.data || {};
    const isNotPaid = Boolean(entry.isNotPaid ?? data.isNotPaid);
    const isNotCharged = Boolean(entry.isNotCharged ?? data.isNotCharged);
    
    // Check entry fields FIRST, then fall back to data fields
    const rawCost = Number(entry.cost ?? data.cost ?? 0);
    const rawRevenue = Number(entry.revenue ?? data.revenue ?? 0);
    
    const cost = isNotPaid ? 0 : rawCost;
    const revenue = isNotCharged ? 0 : rawRevenue;
    const profit = revenue - cost;
    // Calculate margin as profit relative to revenue (standard net margin calculation)
    const margin = revenue > 0 ? (profit / revenue) * 100 : 0;

    return { cost, revenue, profit, margin };
  };

const getAmountColor = (amount: number) => (amount >= 0 ? 'text-green-600' : 'text-red-600');

  const filteredEntries = useMemo(() => {
    const entries = processedFinancialsLog.entries as FinancialLogEntry[];
    const mapped = entries.map(entry => ({ entry, amounts: computeAmounts(entry) }));

    if (activeSubTab === 'tasks') {
      return mapped.filter(({ entry }) => entry.entityType === EntityType.TASK);
    }
    if (activeSubTab === 'records') {
      return mapped.filter(({ entry }) => entry.entityType === EntityType.FINANCIAL);
    }
    return mapped;
  }, [processedFinancialsLog.entries, activeSubTab]);

  // Shared render function for all tabs
  const renderFinancialEntry = ({ entry, amounts }: { entry: FinancialLogEntry, amounts: ReturnType<typeof computeAmounts> }, index: number) => {
    const data = entry?.data || {};
    
    // Extract financial fields properly
    const name = entry.name || entry.taskName || entry.recordName || data.name || data.taskName || data.recordName || entry.description || entry.message || 'Unnamed';
    const financialType = data.type || entry.type || '—';
    const station = formatStation(entry.station || data.station);
    const category = entry.category || data.category || '—';
    const date = entry.displayDate || entry.timestamp || '';
    
    // Extract financial amounts
    const { cost, revenue, profit, margin } = amounts;
    
    // Calculate display values
    const taskProfit = revenue - cost;
    const taskMargin = revenue > 0 ? ((taskProfit / revenue) * 100).toFixed(0) : '0';
    
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
            
            {/* Cost */}
            {cost > 0 && (
              <span className={`font-medium ${FINANCIAL_COLORS.negative} min-w-0 flex-shrink-0`}>
                Cost: ${cost.toLocaleString()}
              </span>
            )}
            
            {/* Revenue */}
            {revenue > 0 && (
              <span className={`font-medium ${FINANCIAL_COLORS.positive} min-w-0 flex-shrink-0`}>
                Rev: ${revenue.toLocaleString()}
              </span>
            )}
            
            {/* Profit */}
            {taskProfit !== 0 && (
              <span className={`font-medium ${getFinancialColor(taskProfit)} min-w-0 flex-shrink-0`}>
                {taskProfit > 0 ? 'Profit' : 'Loss'}: ${taskProfit.toLocaleString()}
              </span>
            )}
            
            {/* Margin */}
            {taskMargin !== '0' && (
              <span className={`font-medium ${getFinancialColor(Number(taskMargin))} min-w-0 flex-shrink-0`}>
                {taskMargin}%
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
                
                const entityId = data.entityId || entry.entityId;
                let links: any[] = [];
                let linkType = 'financial';
                
                if (data.financialDescription === 'Sale revenue' || data.type === 'sale_financial') {
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
          
          {/* Date */}
          <span className="text-xs text-muted-foreground whitespace-nowrap">
            {date}
          </span>
        </div>
      </div>
    );
  };

  return (
    <>
    <Tabs value={activeSubTab} onValueChange={setActiveSubTab} className="space-y-4">
      <TabsList className="grid w-full grid-cols-3">
        <TabsTrigger value="all">All</TabsTrigger>
        <TabsTrigger value="tasks">Tasks</TabsTrigger>
        <TabsTrigger value="records">Records</TabsTrigger>
      </TabsList>

      <TabsContent value="all" className="space-y-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <div>
              <CardTitle>All Financial Records</CardTitle>
              <CardDescription>
                Complete financial transaction history
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
              {filteredEntries.length === 0 ? (
                <div className="text-center py-8">
                  <p className="text-muted-foreground mb-2">
                    {activeSubTab === 'tasks' 
                      ? 'No task-related financial records found' 
                      : activeSubTab === 'records'
                      ? 'No standalone financial records found'
                      : 'No financial records found'
                    }
                  </p>
                  {activeSubTab === 'records' && (
                    <p className="text-sm text-muted-foreground">
                      Create standalone financial records using the Record Modal in the Finances section
                    </p>
                  )}
                </div>
              ) : (
                filteredEntries.map((entryData, index) => renderFinancialEntry(entryData, index))
              )}
            </div>
          </CardContent>
        </Card>
      </TabsContent>

      <TabsContent value="tasks" className="space-y-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <div>
              <CardTitle>Task Financial Records</CardTitle>
              <CardDescription>
                Financial records from completed tasks
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
              {filteredEntries.length === 0 ? (
                <div className="text-center py-8">
                  <p className="text-muted-foreground mb-2">
                    No task-related financial records found
                  </p>
                </div>
              ) : (
                filteredEntries.map((entryData, index) => renderFinancialEntry(entryData, index))
              )}
            </div>
          </CardContent>
        </Card>
      </TabsContent>

      <TabsContent value="records" className="space-y-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <div>
              <CardTitle>Standalone Financial Records</CardTitle>
              <CardDescription>
                Financial records created directly (not from tasks)
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
              {filteredEntries.length === 0 ? (
                <div className="text-center py-8">
                  <p className="text-muted-foreground mb-2">
                    No standalone financial records found
                  </p>
                  <p className="text-sm text-muted-foreground">
                    Create standalone financial records using the Record Modal in the Finances section
                  </p>
                </div>
              ) : (
                filteredEntries.map((entryData, index) => renderFinancialEntry(entryData, index))
              )}
            </div>
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
