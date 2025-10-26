'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ArrowUpDown, RefreshCw, Link as LinkIcon, User } from 'lucide-react';
import { useState } from 'react';
import { processLogData } from '@/lib/utils/logging-utils';
import { LinksSubModal } from '@/components/modals/submodals/links-submodal';
import { CharacterRole, EntityType } from '@/types/enums';

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
  const [selectedEntityType, setSelectedEntityType] = useState<string>(EntityType.CHARACTER);

  const processedCharacterLog = processLogData(characterLog, logOrder);

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
          {processedCharacterLog.entries.length === 0 ? (
            <p className="text-muted-foreground text-center py-4">No character activity logged</p>
          ) : (
            processedCharacterLog.entries.map((entry: any, index: number) => {
              const data = entry?.data || {};
              const statusRaw: string = entry.event || 'unknown';
              const status = statusRaw.charAt(0).toUpperCase() + statusRaw.slice(1);
              
              // Use displayName from normalization, fallback to entry data
              const name: string = entry.displayName || data.name || entry.name || entry.title || 'Character Activity';
              const date: string = entry.displayDate || entry.timestamp || '';

              // Character-specific info (roles display)
              const isFounder = data.roles && Array.isArray(data.roles) && data.roles.includes(CharacterRole.FOUNDER);
              const characterInfo = [];
              
              // Only show roles for non-Founder characters (Founder is special, we know who they are)
              if (!isFounder && data.roles && Array.isArray(data.roles) && data.roles.length > 0) {
                characterInfo.push(`Roles: ${data.roles.join(', ')}`);
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
                        
                        // Smart link fetching: detect if this is a financial record effect entry
                        const entityId = data.entityId || entry.entityId;
                        let links: any[] = [];
                        let linkType = 'character';
                        
                        // Check if this is a financial record effect entry (has description starting with "Record")
                        if (data.description?.startsWith('Jungle Coins from record:') || entry.description?.startsWith('Record Jungle Coins:')) {
                            linkType = 'financial';
                            links = await ClientAPI.getLinksFor({ type: EntityType.FINANCIAL, id: entityId });
                            console.log(`[CharacterLogTab] 🔍 Detected financial record effect entry, fetching financial links for financial ${entityId}:`, {
                              totalLinks: links.length,
                              linkTypes: links.map(l => l.linkType)
                            });
                        } else {
                            linkType = 'character';
                            links = await ClientAPI.getLinksFor({ type: EntityType.CHARACTER, id: entityId });
                            console.log(`[CharacterLogTab] 🔍 Fetching character links for character ${entityId}:`, {
                              totalLinks: links.length,
                              linkTypes: links.map(l => l.linkType)
                            });
                        }
                          
                          setCharacterLinks(links);
                          setSelectedCharacterId(entityId);
                          setSelectedEntityType(linkType); // Set the correct entity type
                          setSelectedLogEntry(entry); // Pass the log entry context
                          setShowLinksModal(true);
                        } catch (error) {
                          console.error('Failed to fetch character links:', error);
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
            })
          )}
        </div>
        
        {/* Links SubModal */}
        <LinksSubModal
          open={showLinksModal}
          onOpenChange={setShowLinksModal}
          entityType={selectedEntityType}
          entityId={selectedCharacterId}
          entityName={selectedEntityType === 'financial' ? 'Financial Record' : 'Character'}
          links={characterLinks}
          logEntry={selectedLogEntry}
        />
      </CardContent>
    </Card>
  );
}

