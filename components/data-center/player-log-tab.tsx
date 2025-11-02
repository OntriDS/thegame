'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { RefreshCw, Gamepad, ArrowUpDown, Link as LinkIcon, User } from 'lucide-react';
import { LinksSubModal } from '@/components/modals/submodals/links-submodal';
import { useState, useEffect } from 'react';
import { formatDisplayDate } from '@/lib/utils/date-utils';
import { EntityType, LogEventType } from '@/types/enums';
import { getPointsMetadata } from '@/lib/utils/points-utils';
import { ClientAPI } from '@/lib/client-api';
import { cn } from '@/lib/utils';
import { processLogData } from '@/lib/utils/logging-utils';
import { PLAYER_ONE_ID } from '@/types/enums';
import { useUserPreferences } from '@/lib/hooks/use-user-preferences';
import { LogViewFilter } from '@/components/log-management/log-view-filter';
import { useLogViewFilter } from '@/lib/hooks/use-log-view-filter';
import { LogManagementActions } from '@/components/log-management/log-management-actions';

interface PlayerLogTabProps {
  playerLog: any;
  onReload: () => void;
  isReloading: boolean;
}

/**
 * PlayerLogTab - Display Player entity logs
 * 
 * Player = Real Person with Authentication & Progression
 * - Points (HP, FP, RP, XP) - Real progression tracking
 * - Level & Total XP
 * - Achievements
 * - Character Management
 * 
 * This tab shows the audit trail of player progression and achievements
 */
export function PlayerLogTab({ playerLog, onReload, isReloading }: PlayerLogTabProps) {
  const [logOrder, setLogOrder] = useState<'newest' | 'oldest'>('newest');
  const [showLinksModal, setShowLinksModal] = useState(false);
  const [selectedPlayerId, setSelectedPlayerId] = useState<string>('');
  const [playerLinks, setPlayerLinks] = useState<any[]>([]);
  const [selectedLogEntry, setSelectedLogEntry] = useState<any>(null);
  const [sourceNameCache, setSourceNameCache] = useState<Record<string, string>>({});
  const { getPreference } = useUserPreferences();
  const { filter, setFilter, getVisibleEntries } = useLogViewFilter({ entityType: EntityType.PLAYER });

  // Process player log data using normalized approach
  const processedPlayerLog = processLogData(playerLog, logOrder);
  const sortedEntries = processedPlayerLog.entries || [];
  
  // Apply view filter to entries
  const visibleEntries = getVisibleEntries(sortedEntries);

  // Fetch source names for entries that need them
  useEffect(() => {
    const fetchSourceNames = async () => {
      const entries = processedPlayerLog.entries || [];
      
      try {
        const newCache: Record<string, string> = { ...sourceNameCache };
        
        // Fetch tasks
        const entriesWithTaskSources = entries.filter((entry: any) => {
          const sourceType = entry.sourceType || entry.data?.sourceType;
          return sourceType === 'task';
        });
        
        if (entriesWithTaskSources.length > 0) {
          const tasks = await ClientAPI.getTasks();
          entriesWithTaskSources.forEach((entry: any) => {
            const sourceId = entry.sourceId || entry.data?.sourceId;
            if (sourceId && !newCache[sourceId]) {
              const task = tasks.find((t: any) => t.id === sourceId);
              if (task) {
                newCache[sourceId] = task.name.length > 30 
                  ? task.name.substring(0, 27) + '...' 
                  : task.name;
              }
            }
          });
        }
        
        // Fetch financial records
        const entriesWithFinancialSources = entries.filter((entry: any) => {
          const sourceType = entry.sourceType || entry.data?.sourceType;
          return sourceType === 'financial';
        });
        
        if (entriesWithFinancialSources.length > 0) {
          const records = await ClientAPI.getFinancialRecords();
          entriesWithFinancialSources.forEach((entry: any) => {
            const sourceId = entry.sourceId || entry.data?.sourceId;
            if (sourceId && !newCache[sourceId]) {
              const record = records.find((r: any) => r.id === sourceId);
              if (record) {
                newCache[sourceId] = record.name.length > 30 
                  ? record.name.substring(0, 27) + '...' 
                  : record.name;
              }
            }
          });
        }
        
        if (Object.keys(newCache).length > Object.keys(sourceNameCache).length) {
          setSourceNameCache(newCache);
        }
      } catch (error) {
        console.error('Failed to fetch source names:', error);
      }
    };
    
    fetchSourceNames();
  }, [processedPlayerLog.entries]);

  // Helper function to determine action label based on entry type
  const getActionLabel = (entry: any): string => {
    const event = entry.event;
    
    // Check actual event type from enum
    switch (event) {
      case LogEventType.WIN_POINTS:
        return 'Win Points';
      case LogEventType.POINTS_CHANGED:
        return 'Points Changed';
      case LogEventType.LEVEL_UP:
        return 'Level Up';
      case LogEventType.LOST_POINTS:
        return 'Lost Points';
      case LogEventType.CREATED:
        return 'Created';
      case LogEventType.UPDATED:
        return 'Updated';
      default:
        return entry.event || 'Player Activity';
    }
  };

  // Check if log management is enabled
  const logManagementEnabled = getPreference('log-management-enabled', false);

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <div>
          <CardTitle className="flex items-center gap-2">
            <Gamepad className="h-5 w-5" />
            Player Log
          </CardTitle>
          <CardDescription>
            Real person progression tracking - Points, Level, and Achievements
          </CardDescription>
        </div>
        <div className="flex items-center gap-2">
          {logManagementEnabled && <LogViewFilter value={filter} onChange={setFilter} />}
          <Button
            variant="outline"
            size="sm"
            onClick={() => setLogOrder(logOrder === 'newest' ? 'oldest' : 'newest')}
          >
            <ArrowUpDown className="h-4 w-4 mr-2" />
            {logOrder === 'oldest' ? 'Oldest First' : 'Newest First'}
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
      <CardContent className="space-y-2">
        {visibleEntries.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            <User className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>No player log entries yet</p>
            <p className="text-sm mt-2">Player progression will be tracked here</p>
          </div>
        ) : (
          <div className="space-y-2">
            {visibleEntries.map((entry: any, index: number) => {
              // Handle BULK_IMPORT and BULK_EXPORT entries
              const eventRaw = entry.event || entry.status || '';
              const statusRaw = String(eventRaw).toUpperCase();
              
              if (statusRaw === 'BULK_IMPORT' || statusRaw === 'BULK_EXPORT') {
                const operation = statusRaw === 'BULK_IMPORT' ? 'Bulk Import' : 'Bulk Export';
                const count = entry.count || 0;
                const source = entry.source || 'unknown';
                const mode = entry.importMode || entry.exportFormat || '';
                const date = entry.timestamp ? formatDisplayDate(new Date(entry.timestamp)) : 'No date';
                
                return (
                  <div key={entry.id || index} className="flex items-center justify-between p-3 border rounded-lg bg-muted/30">
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                      <Badge variant="outline" className="capitalize shrink-0">
                        {operation}
                      </Badge>
                      <span className="text-sm font-medium">
                        {count} player{count !== 1 ? 's' : ''} from {source}
                        {mode && ` (${mode})`}
                      </span>
                      <span className="text-xs text-muted-foreground ml-auto shrink-0">
                        {date}
                      </span>
                    </div>
                  </div>
                );
              }
              
              const playerId = entry.entityId || PLAYER_ONE_ID;
              
              return (
                <div 
                  key={entry.id || index} 
                  className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted/50 transition-colors"
                >
                  {/* Single row with all info */}
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    {/* Action Label Badge */}
                    <Badge variant="outline" className="capitalize shrink-0">
                      {getActionLabel(entry)}
                    </Badge>
                    
                    {/* Points Display - DRY using helper */}
                    {(entry.points) && (
                      <div className="flex items-center gap-2">
                        {getPointsMetadata().map((pointType) => {
                          const points = entry.points;
                          const pointValue = points[pointType.key.toLowerCase() as keyof typeof points] || 0;
                          const colorClasses = {
                            'XP': 'border-orange-600 text-orange-600',
                            'RP': 'border-purple-600 text-purple-600', 
                            'FP': 'border-red-600 text-red-600',
                            'HP': 'border-green-600 text-green-600'
                          };
                          
                          return (
                            <div key={pointType.key} className={cn(
                              "px-2 py-1 rounded border text-xs font-medium",
                              pointValue > 0 ? colorClasses[pointType.key as keyof typeof colorClasses] : "border-muted text-muted-foreground"
                            )}>
                              {pointType.label}: {pointValue}
                            </div>
                          );
                        })}
                      </div>
                    )}

                    {/* Player name (for non-points events) */}
                      {!entry.points && (
                      <span className="text-sm font-medium truncate">
                        {entry.displayName || 'Player activity'}
                      </span>
                    )}

                      {/* Source Information */}
                        {(entry.sourceId) && (
                        <span className="text-xs text-muted-foreground min-w-0 flex-shrink-0">
                        source: {
                          sourceNameCache[entry.sourceId] || 
                          entry.sourceId.substring(0, 8) + '...'
                        }
                      </span>
                    )}
                    
                    <span className="text-xs text-muted-foreground ml-auto shrink-0">
                      {entry.timestamp ? formatDisplayDate(new Date(entry.timestamp)) : 'No date'}
                    </span>
                  </div>
                  
                  {/* Links button */}
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={async () => {
                      try {
                        const { ClientAPI } = await import('@/lib/client-api');
                        
                        // Always fetch links for the main player
                        const response = await fetch(`/api/links?entityType=player&entityId=${PLAYER_ONE_ID}`);
                        const links = await response.json();
                        
                        setPlayerLinks(links);
                        setSelectedPlayerId(PLAYER_ONE_ID);
                        setSelectedLogEntry(entry);
                        setShowLinksModal(true);
                      } catch (error) {
                        console.error('Failed to fetch player links:', error);
                      }
                    }}
                    className="ml-2 shrink-0"
                  >
                    <LinkIcon className="h-4 w-4" />
                  </Button>

                  {/* Log Management Actions */}
                  <LogManagementActions
                    entityType={EntityType.PLAYER}
                    entry={entry}
                    onReload={onReload}
                    logManagementEnabled={logManagementEnabled}
                  />
                </div>
              );
            })}
          </div>
        )}
        
        {/* Links SubModal */}
        <LinksSubModal
          open={showLinksModal}
          onOpenChange={setShowLinksModal}
          entityType="player"
          entityId={selectedPlayerId}
          entityName="Player"
          links={playerLinks}
          logEntry={selectedLogEntry}
        />
      </CardContent>
    </Card>
  );
}
