'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ArrowUpDown, RefreshCw, Link as LinkIcon, User } from 'lucide-react';
import { useState } from 'react';
import { processLogData } from '@/lib/utils/logging-utils';
import { LinksSubModal } from '@/components/modals/submodals/links-submodal';
import { CharacterRole, EntityType } from '@/types/enums';
import { useUserPreferences } from '@/lib/hooks/use-user-preferences';
import { LogViewFilter } from '@/components/log-management/log-view-filter';
import { useLogViewFilter } from '@/lib/hooks/use-log-view-filter';
import { LogManagementActions } from '@/components/log-management/log-management-actions';

interface CharacterLogTabProps {
  characterLog: any;
  onReload: () => void;
  isReloading: boolean;
}

/**
 * CharacterLogTab - Display Character entity logs
 * 
 * Character = In-game entity with roles and abilities
 * - Roles (FOUNDER, PLAYER, ADMIN, etc.)
 * - Jungle Coins (Ambassador field from Financial entity)
 * - Contact information
 * - Relationships
 * 
 * Characters do NOT have points - those belong to Players!
 */
export function CharacterLogTab({ characterLog, onReload, isReloading }: CharacterLogTabProps) {
  const [logOrder, setLogOrder] = useState<'newest' | 'oldest'>('newest');
  const [showLinksModal, setShowLinksModal] = useState(false);
  const [selectedCharacterId, setSelectedCharacterId] = useState<string>('');
  const [characterLinks, setCharacterLinks] = useState<any[]>([]);
  const [selectedLogEntry, setSelectedLogEntry] = useState<any>(null);
  const { getPreference } = useUserPreferences();
  const { filter, setFilter, getVisibleEntries } = useLogViewFilter({ entityType: EntityType.CHARACTER });

  const processedCharacterLog = processLogData(characterLog, logOrder);
  
  // Apply view filter to entries
  const visibleEntries = getVisibleEntries(processedCharacterLog.entries || []);

  // Check if log management is enabled
  const logManagementEnabled = getPreference('log-management-enabled', false);

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <div>
          <CardTitle>Character Log</CardTitle>
          <CardDescription>
            Complete history of character lifecycle events
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
            <p className="text-muted-foreground text-center py-4">No character activity logged</p>
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
                      <User className="h-4 w-4 text-muted-foreground" />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-3 text-sm">
                        <Badge variant="outline" className="font-semibold">
                          {operation}
                        </Badge>
                        <span className="font-medium">
                          {count} character{count !== 1 ? 's' : ''} from {source}
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
              
              const statusRawNorm: string = entry.event || 'unknown';
              const status = statusRawNorm.charAt(0).toUpperCase() + statusRawNorm.slice(1);
              
              // Use displayName from normalization, fallback to entry data (standardized with other log tabs)
              const name: string = entry.displayName || entry.name || entry.title || 'Character Activity';
              const date: string = entry.displayDate || entry.timestamp || '';
              
              // Character native fields
              const isFounder = entry.roles && Array.isArray(entry.roles) && entry.roles.includes(CharacterRole.FOUNDER);
              const characterInfo = [];
              
              // ALWAYS show roles - they're the primary character identifier
              const roles = entry.roles;
              if (roles && Array.isArray(roles) && roles.length > 0) {
                characterInfo.push(`Roles: ${roles.join(', ')}`);
              }
              
              // Show native fields only when present
              if (entry.commColor) characterInfo.push(`CommColor: ${entry.commColor}`);
              if (entry.description) characterInfo.push(`Description: ${entry.description}`);
              if (entry.contactEmail) characterInfo.push(`Email: ${entry.contactEmail}`);
              if (entry.contactPhone) characterInfo.push(`Phone: ${entry.contactPhone}`);
              if (entry.isActive !== undefined) characterInfo.push(`Active: ${entry.isActive ? 'Yes' : 'No'}`);
              
              // Event-specific details (show when present)
              if (statusRaw === 'REQUESTED_TASK') {
                if (entry.taskName) characterInfo.push(`Task: ${entry.taskName}`);
                if (entry.taskType) characterInfo.push(`Type: ${entry.taskType}`);
                if (entry.station) characterInfo.push(`Station: ${entry.station}`);
              } else if (statusRaw === 'OWNS_ITEM') {
                if (entry.itemName) characterInfo.push(`Item: ${entry.itemName}`);
                if (entry.itemType) characterInfo.push(`Type: ${entry.itemType}`);
                if (entry.sourceTaskName) characterInfo.push(`From: ${entry.sourceTaskName}`);
              } else if (statusRaw === 'PURCHASED') {
                if (entry.saleName) characterInfo.push(`Sale: ${entry.saleName}`);
                if (entry.saleType) characterInfo.push(`Type: ${entry.saleType}`);
                if (entry.totalRevenue) characterInfo.push(`Revenue: $${entry.totalRevenue.toFixed(2)}`);
              }
              
              const characterInfoText = characterInfo.join(' • ');

              return (
                <div key={index} className="flex items-center gap-3 p-3 border rounded-lg hover:bg-muted/50 transition-colors">
                  {/* Icon */}
                  <div className="flex-shrink-0">
                    <User className="h-4 w-4 text-muted-foreground" />
                  </div>
                  
                  {/* Main Info Row */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-3 text-sm">
                      {/* Status Badge */}
                      <div className="inline-flex items-center rounded-full border px-2 py-1 text-xs font-semibold transition-colors bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200">
                        {status}
                      </div>
                      
                      {/* Name */}
                      <span className="font-medium text-foreground min-w-0 flex-shrink-0">
                        {name}
                      </span>
                      
                      {/* Character Info - only for non-Founder characters */}
                      {characterInfoText && (
                        <span className="text-muted-foreground min-w-0 flex-shrink-0 text-xs">
                          {characterInfoText}
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
                            
                            // Always fetch links for the character entity
                            const links = await ClientAPI.getLinksFor({ type: EntityType.CHARACTER, id: entry.entityId });
                            
                            setCharacterLinks(links);
                            setSelectedCharacterId(entry.entityId);
                            setSelectedLogEntry(entry);
                            setShowLinksModal(true);
                          } catch (error) {
                            console.error('Failed to fetch character links:', error);
                          }
                        }}
                    >
                      <LinkIcon className="h-4 w-4 text-muted-foreground hover:text-foreground" />
                    </Button>

                    {/* Log Management Actions */}
                    <LogManagementActions
                      entityType={EntityType.CHARACTER}
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
        
        {/* Links SubModal */}
        <LinksSubModal
          open={showLinksModal}
          onOpenChange={setShowLinksModal}
          entityType="character"
          entityId={selectedCharacterId}
          entityName="Character"
          links={characterLinks}
          logEntry={selectedLogEntry}
        />
      </CardContent>
    </Card>
  );
}

