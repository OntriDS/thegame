'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ArrowUpDown, RefreshCw, CheckSquare, Link } from 'lucide-react';
import { LinksSubModal } from '@/components/modals/submodals/links-submodal';
import { useState, useEffect } from 'react';
import { TaskStatus, TaskType, EntityType, LogEventType } from '@/types/enums';
import { TASK_STATUS_COLORS } from '@/lib/constants/color-constants';
import { calculateTaskProfitPercentage } from '@/lib/utils/business-utils';
import { useThemeColors } from '@/lib/hooks/use-theme-colors';
import { processLogData } from '@/lib/utils/logging-utils';
import { TASK_TYPE_ICONS, LOG_DISPLAY_ICONS, FINANCIAL_ABBREVIATIONS } from '@/lib/constants/icon-maps';

interface TasksLifecycleTabProps {
  tasksLog: any;
  onReload: () => void;
  isReloading: boolean;
}

export function TasksLifecycleTab({ tasksLog, onReload, isReloading }: TasksLifecycleTabProps) {
  const { textColor, isDarkMode } = useThemeColors();
  const [activeSubTab, setActiveSubTab] = useState<string>('lifecycle-log');
  const [logOrder, setLogOrder] = useState<'newest' | 'oldest'>('newest');
  const [showLinksModal, setShowLinksModal] = useState(false);
  const [selectedTaskId, setSelectedTaskId] = useState<string>('');
  const [taskLinks, setTaskLinks] = useState<any[]>([]);
  const [selectedLogEntry, setSelectedLogEntry] = useState<any>(null);
  const [sourceNameCache, setSourceNameCache] = useState<Record<string, string>>({});

  // Process tasks log data
  const processedTasksLog = processLogData(tasksLog, logOrder);

  // Fetch source names for entries that need them
  useEffect(() => {
    const fetchSourceNames = async () => {
      const entries = processedTasksLog.entries || [];
      const sourceIds = new Set<string>();
      
      // Collect all sourceIds that need lookup
      entries.forEach((entry: any) => {
        const data = entry?.data || {};
        const sourceId = data.sourceSaleId || entry.sourceSaleId;
        if (sourceId && !sourceNameCache[sourceId]) {
          sourceIds.add(sourceId);
        }
      });
      
      if (sourceIds.size === 0) return;
      
      try {
        const { ClientAPI } = await import('@/lib/client-api');
        const newCache: Record<string, string> = { ...sourceNameCache };
        
        const entriesWithSaleSources = entries.filter((entry: any) => {
          const sourceId = entry?.data?.sourceSaleId || entry?.sourceSaleId;
          return sourceId && !newCache[sourceId];
        });
        
        if (entriesWithSaleSources.length > 0) {
          const sales = await ClientAPI.getSales();
          entriesWithSaleSources.forEach((entry: any) => {
            const sourceId = entry?.data?.sourceSaleId || entry?.sourceSaleId;
            if (sourceId) {
              const sale = sales.find((s: any) => s.id === sourceId);
              if (sale) {
                const truncatedName = sale.name.length > 30 
                  ? sale.name.substring(0, 27) + '...' 
                  : sale.name;
                newCache[sourceId] = truncatedName;
              }
            }
          });
        }
        
        setSourceNameCache(newCache);
      } catch (error) {
        console.error('Failed to fetch source names:', error);
      }
    };
    
    fetchSourceNames();
  }, [processedTasksLog.entries, sourceNameCache]);

  // Ensure Tailwind recognizes all possible classes by listing them here:
  // bg-orange-100 text-orange-800 bg-orange-900 text-orange-200 (CREATED)
  // bg-gray-100 text-gray-800 bg-gray-800 text-gray-200 (ON_HOLD, NONE)
  // bg-blue-100 text-blue-800 bg-blue-900 text-blue-200 (IN_PROGRESS)
  // bg-purple-100 text-purple-800 bg-purple-900 text-purple-200 (FINISHING)
  // bg-green-100 text-green-800 bg-green-900 text-green-200 (DONE)
  // bg-yellow-100 text-yellow-800 bg-yellow-900 text-yellow-200 (COLLECTED)
  // bg-red-100 text-red-800 bg-red-900 text-red-200 (FAILED)

  const getStatusBadgeColor = (status: string) => {
    // First check if it's already a TaskStatus enum value
    const taskStatus = Object.values(TaskStatus).find(ts => ts === status);
    
    if (taskStatus && TASK_STATUS_COLORS[taskStatus]) {
      const color = isDarkMode ? TASK_STATUS_COLORS[taskStatus].dark : TASK_STATUS_COLORS[taskStatus].light;
      return color;
    }
    
    // Map lowercase/string statuses to TaskStatus enum values
    const normalizedStatus = status.toLowerCase();
    
    const statusMap: Record<string, TaskStatus> = {
      'created': TaskStatus.CREATED,
      'on_hold': TaskStatus.ON_HOLD,
      'on hold': TaskStatus.ON_HOLD,
      'in_progress': TaskStatus.IN_PROGRESS,
      'in progress': TaskStatus.IN_PROGRESS,
      'finishing': TaskStatus.FINISHING,
      'done': TaskStatus.DONE,
      'collected': TaskStatus.COLLECTED,
      'failed': TaskStatus.FAILED,
      'renamed': TaskStatus.CREATED, // Use created color for renamed
      'updated': TaskStatus.IN_PROGRESS, // Use in progress color for updated
    };
    
    const mappedStatus = statusMap[normalizedStatus];
    
    if (mappedStatus && TASK_STATUS_COLORS[mappedStatus]) {
      const color = isDarkMode ? TASK_STATUS_COLORS[mappedStatus].dark : TASK_STATUS_COLORS[mappedStatus].light;
      return color;
    }
    
    // Default fallback
    const fallbackColor = isDarkMode ? TASK_STATUS_COLORS[TaskStatus.NONE].dark : TASK_STATUS_COLORS[TaskStatus.NONE].light;
    return fallbackColor;
  };

  const getTaskTypeIcon = (taskType: string | undefined) => {
    const normalized = (taskType || '').toUpperCase() as TaskType;
    const Icon = TASK_TYPE_ICONS[normalized] || CheckSquare;
    return <Icon className="h-4 w-4 text-muted-foreground" />;
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

  const formatPriority = (value: string | undefined) => {
    if (!value || typeof value !== 'string' || value === '—') return '—';
    const lower = value.toLowerCase();
    return lower.charAt(0).toUpperCase() + lower.slice(1);
  };

  return (
    <Tabs value={activeSubTab} onValueChange={setActiveSubTab} className="space-y-4">
      <TabsList className="grid w-full grid-cols-2">
        <TabsTrigger value="lifecycle-log">Lifecycle Log</TabsTrigger>
        <TabsTrigger value="task-analysis">Task Analysis</TabsTrigger>
      </TabsList>

      <TabsContent value="lifecycle-log" className="space-y-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <div>
              <CardTitle>Tasks Lifecycle Log</CardTitle>
              <CardDescription>
                Complete history of task lifecycle events
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
              {processedTasksLog.entries.length === 0 ? (
                <p className="text-muted-foreground text-center py-4">No task lifecycle events found</p>
              ) : (
                processedTasksLog.entries.map((entry: any, index: number) => {
                  // Extract data from the rich logging structure
                  const data = entry.data || {};
                  const status: string = entry.event || data.taskStatus || 'Unknown';
                  const name: string = entry.name || entry.taskName || data.taskName || data.name || entry.message || '—';
                  const description: string = data.description || entry.description || '';
                  const type: string = entry.taskType || data.taskType || '—';
                  const station: string = formatStation(entry.station || data.station);
                  const priority: string = formatPriority(entry.priority || data.priority);
                  const sourceSaleId = data.sourceSaleId || entry.sourceSaleId;
                  const truncatedSourceName = sourceSaleId ? sourceNameCache[sourceSaleId] || '' : '';
                  
                  // Debug logging for Done entries
                  if (status.toLowerCase() === 'done') {
                    console.log('🔍 Done entry debug:', {
                      entry,
                      data,
                      status,
                      station: data.station || entry.station,
                      type: data.taskType || entry.taskType,
                      formattedStation: station,
                      formattedType: type,
                      secondRowParts: [station, type].filter(p => p !== '—'),
                      secondRowInfo: [station, type].filter(p => p !== '—').join(' • ')
                    });
                  }
                  const progress: number = data.progress || 0;
                  const cost: number = data.cost || 0;
                  const revenue: number = data.revenue || 0;
                  const date: string = entry.displayDate || entry.timestamp || '';

                  // Handle special cases for different log types
                  let statusBadge = status;
                  let renameInfo = '';
                  
                  if (status === 'renamed' && data.oldValue && data.newValue) {
                    statusBadge = 'Renamed';
                    renameInfo = `Changed from: "${data.oldValue}"`;
                  } else if (status === LogEventType.UPDATED && data.field && data.oldValue !== undefined && data.newValue !== undefined) {
                    statusBadge = 'Updated';
                    renameInfo = `${data.field}: "${data.oldValue}" → "${data.newValue}"`;
                  } else if (status === LogEventType.CREATED) {
                    statusBadge = 'Created';
                  } else if (status.toLowerCase() === LogEventType.DONE.toLowerCase()) {
                    statusBadge = 'Done';
                  } else if (status === LogEventType.COLLECTED) {
                    statusBadge = 'Collected';
                  } else if (status === LogEventType.STATUS_CHANGED) {
                    statusBadge = data.newStatus || 'Status Changed';
                    renameInfo = data.oldStatus ? `Changed from: "${data.oldStatus}"` : '';
                  } else if (status === 'BULK_IMPORT') {
                    statusBadge = 'Bulk Import';
                    const count = data.count || 0;
                    const source = data.source || 'backup folder';
                    const importMode = data.importMode;
                    renameInfo = `${count} tasks from ${source} (${importMode || 'merge'} mode)`;
                  } else if (status === 'BULK_EXPORT') {
                    statusBadge = 'Bulk Export';
                    const count = data.count || 0;
                    renameInfo = `${count} tasks to backup folder`;
                  }
                  
                  // No financial info in tasks log - that's in financials log
                  
                  // Second row info
                  const secondRowParts = [];
                  if (station !== '—') {
                    secondRowParts.push(station);
                  }
                  if (type !== '—') {
                    secondRowParts.push(type);
                  }
                  
                  const secondRowInfo = secondRowParts.join(' • ');

                  return (
                    <div key={index} className="flex items-center gap-3 p-3 border rounded-lg hover:bg-muted/50 transition-colors">
                      {/* Icon */}
                      <div className="flex-shrink-0">
                        {getTaskTypeIcon(type)}
                      </div>
                      
                      {/* Main Info Row */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-3 text-sm">
                          {/* Status Badge */}
                          <div className={`inline-flex items-center rounded-full border px-2 py-1 text-xs font-semibold transition-colors ${getStatusBadgeColor(status)}`}>
                            {statusBadge}
                          </div>
                          
                          {/* Name */}
                          <span className="font-medium text-foreground min-w-0 flex-shrink-0">
                            {name}
                          </span>
                          
                          {/* Type */}
                          <span className="text-muted-foreground min-w-0 flex-shrink-0">
                            {type}
                          </span>
                          
                          {/* Station */}
                          <span className="text-muted-foreground min-w-0 flex-shrink-0">
                            {station}
                          </span>
                          
                          {/* Priority */}
                          {priority !== '—' && (
                            <span className="text-muted-foreground min-w-0 flex-shrink-0">
                              {priority}
                            </span>
                          )}
                          
                          {/* Rename Info (if any) */}
                          {renameInfo && (
                            <span className="text-xs text-muted-foreground min-w-0 flex-shrink-0">
                              {renameInfo}
                            </span>
                          )}
                          
                          {/* Source */}
                          {truncatedSourceName && (
                            <span className="text-xs text-muted-foreground min-w-0 flex-shrink-0">
                              source: {truncatedSourceName}
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
                              const links = await ClientAPI.getLinksFor({ type: EntityType.TASK, id: data.entityId });
                              setTaskLinks(links);
                              setSelectedTaskId(data.entityId);
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
          entityType="task"
          entityId={selectedTaskId}
          entityName="Task"
          links={taskLinks}
          logEntry={selectedLogEntry}
        />
      </TabsContent>

      <TabsContent value="task-analysis" className="space-y-4">
        <Card>
          <CardHeader>
            <CardTitle>Task Analysis</CardTitle>
            <CardDescription>
              Overview of task performance and statistics
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="text-center">
                <p className="text-2xl font-bold text-green-600">
                  {(processedTasksLog.counts as any)['done'] || 0}
                </p>
                <p className="text-sm text-muted-foreground">Completed Tasks</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold text-blue-600">
                  {(processedTasksLog.counts as any)['created'] || 0}
                </p>
                <p className="text-sm text-muted-foreground">Created Tasks</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold text-orange-600">
                  {((processedTasksLog.counts as any)['not started'] || 0) + 
                   ((processedTasksLog.counts as any)['in progress'] || 0) + 
                   ((processedTasksLog.counts as any)['finishing'] || 0)}
                </p>
                <p className="text-sm text-muted-foreground">Active Tasks</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold text-purple-600">
                  {(processedTasksLog.counts as any)['collected'] || 0}
                </p>
                <p className="text-sm text-muted-foreground">Collected Tasks</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </TabsContent>
    </Tabs>
  );
}

