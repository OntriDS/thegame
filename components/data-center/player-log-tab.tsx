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
  const [selectedEntityType, setSelectedEntityType] = useState<string>(EntityType.PLAYER);
  const [sourceNameCache, setSourceNameCache] = useState<Record<string, string>>({});

  // Process player log data using normalized approach
  const processedPlayerLog = processLogData(playerLog, logOrder);
  const sortedEntries = processedPlayerLog.entries || [];

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
      <CardContent className="space-y-2">
        {sortedEntries.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            <User className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>No player log entries yet</p>
            <p className="text-sm mt-2">Player progression will be tracked here</p>
          </div>
        ) : (
          <div className="space-y-2">
            {sortedEntries.map((entry: any, index: number) => {
              const data = entry.data || {};
              const playerId = data.entityId || PLAYER_ONE_ID;
              
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

                    {/* Source Information */}
                    {(entry.sourceId || entry.data?.sourceId) && (
                      <span className="text-sm text-muted-foreground truncate">
                        from {entry.sourceType || entry.data?.sourceType}: {
                          sourceNameCache[entry.sourceId || entry.data?.sourceId] || 
                          (entry.sourceId || entry.data?.sourceId).substring(0, 8) + '...'
                        }
                      </span>
                    )}

                    {/* Player name (for non-points events) */}
                    {!entry.points && !entry.data?.points && (
                      <span className="text-sm font-medium truncate">
                        {entry.displayName || 'Player activity'}
                      </span>
                    )}
                    
                    {/* Points Display - DRY using helper */}
                    {(entry.points || data.points) && (
                      <div className="flex items-center gap-2">
                        {getPointsMetadata().map((pointType) => {
                          const points = entry.points || data.points;
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
                        
                        // Smart link fetching: detect if this is a financial record effect entry
                        const data = entry?.data || {};
                        let links: any[] = [];
                        let linkType = 'player';
                        let entityId = PLAYER_ONE_ID; // Default to main player
                        
                        // Check if this is a financial record effect entry (has description starting with "Record")
                        if (data.description?.startsWith('Points from record:') || entry.description?.startsWith('Record points:')) {
                          linkType = 'financial';
                          entityId = data.entityId || entry.entityId; // Use the financial record ID
                          const response = await fetch(`/api/links?entityType=financial&entityId=${entityId}`);
                          links = await response.json();
                          console.log(`[PlayerLogTab] 🔍 Detected financial record effect entry, fetching financial links for financial ${entityId}:`, {
                            totalLinks: links.length,
                            linkTypes: links.map(l => l.linkType)
                          });
                        } else {
                          // Default behavior: always fetch links for the main player
                          linkType = 'player';
                          entityId = PLAYER_ONE_ID;
                          const response = await fetch(`/api/links?entityType=player&entityId=${entityId}`);
                          links = await response.json();
                          console.log(`[PlayerLogTab] 🔍 Fetched links for player ${entityId}:`, {
                            totalLinks: links.length,
                            linkTypes: links.map(l => l.linkType),
                            taskPlayerLinks: links.filter(l => l.linkType === 'TASK_PLAYER'),
                            entryDescription: entry.description,
                            note: 'Always fetching for main player, not task entity'
                          });
                        }
                        
                        setPlayerLinks(links);
                        setSelectedPlayerId(entityId);
                        setSelectedEntityType(linkType); // Set the correct entity type
                        setSelectedLogEntry(entry); // Pass the log entry context
                        setShowLinksModal(true);
                      } catch (error) {
                        console.error('Failed to fetch player links:', error);
                      }
                    }}
                    className="ml-2 shrink-0"
                  >
                    <LinkIcon className="h-4 w-4" />
                  </Button>
                </div>
              );
            })}
          </div>
        )}
        
        {/* Links SubModal */}
        <LinksSubModal
          open={showLinksModal}
          onOpenChange={setShowLinksModal}
          entityType={selectedEntityType}
          entityId={selectedPlayerId}
          entityName={selectedEntityType === 'financial' ? 'Financial Record' : 'Player'}
          links={playerLinks}
          logEntry={selectedLogEntry}
        />
      </CardContent>
    </Card>
  );
}
