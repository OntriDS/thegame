'use client';

import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { getZIndexClass } from '@/lib/utils/z-index-utils';
import { EntityType } from '@/types/enums';
import { useEffect, useState } from 'react';
import { ClientAPI } from '@/lib/client-api';

interface LinksSubModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  entityType: string;
  entityId: string;
  entityName: string;
  links: any[];
  logEntry?: any; // Optional log entry context for filtering
}

export function LinksSubModal({ 
  open, 
  onOpenChange, 
  entityType, 
  entityId, 
  entityName, 
  links,
  logEntry
}: LinksSubModalProps) {
  const [entityNames, setEntityNames] = useState<Record<string, string>>({});
  
  // Debug logging
  console.log('[LinksSubModal] 🔍 Props received:', {
    open,
    entityType,
    entityId,
    entityName,
    linksCount: links?.length || 0,
    links: links
  });

  // Get relevant links based on log entry context
  const getRelevantLinks = () => {
    if (!logEntry) {
      // If no log entry context, show all links
      return links;
    }

    const description = logEntry.description || '';
    const timestamp = logEntry.timestamp;

    // For player logs, we want to show:
    // 1. What created this link (source entity)
    // 2. What this link connects to (target entity)
    // 3. The relationship type (PLAYER_WHAT or WHAT_PLAYER)
    
    // Group links by relationship type and show the most relevant ones
    const linkGroups = {
      // Activity-based links (dynamic relationships from actions/events)
      activity: links.filter(link => 
        link.linkType.includes('TASK') || 
        link.linkType.includes('FINREC') || 
        link.linkType.includes('SALE') ||
        link.linkType.includes('ITEM')
      ),
      // Structural links (static organizational relationships)
      structural: links.filter(link => 
        link.linkType.includes('ACCOUNT') || 
        link.linkType.includes('CHARACTER') ||
        link.linkType.includes('SITE')
      )
    };

    // For different log types, prioritize different link groups
    if (description.includes('created')) {
      // For creation events, show structural links first (how entity is organized)
      return [...linkGroups.structural, ...linkGroups.activity];
    } else if (description.includes('updated') || description.includes('points') || description.includes('completed') || description.includes('done')) {
      // For update/completion events, show activity links first (what caused the change)
      return [...linkGroups.activity, ...linkGroups.structural];
    } else {
      // Default: show activity links first (most relevant for debugging)
      return [...linkGroups.activity, ...linkGroups.structural];
    }
  };

  const relevantLinks = getRelevantLinks();

  // Debug logging
  console.log(`[LinksSubModal] 🔍 Link filtering debug:`, {
    entityType,
    totalLinks: links.length,
    allLinkTypes: links.map(l => l.linkType),
    relevantLinks: relevantLinks.length,
    relevantLinkTypes: relevantLinks.map(l => l.linkType),
    logEntryDescription: logEntry?.description,
    activityLinks: relevantLinks.filter(link => 
      link.linkType.includes('TASK') || 
      link.linkType.includes('FINREC') || 
      link.linkType.includes('SALE') ||
      link.linkType.includes('ITEM')
    ).map(l => l.linkType),
    structuralLinks: relevantLinks.filter(link => 
      link.linkType.includes('ACCOUNT') || 
      link.linkType.includes('CHARACTER') ||
      link.linkType.includes('SITE')
    ).map(l => l.linkType)
  });

  // Load entity names when modal opens
  useEffect(() => {
    if (!open || links.length === 0) return;

    const loadEntityNames = async () => {
      const names: Record<string, string> = {};
      
      // Define entity type mappings using EntityType enum as source of truth
      const entityTypeConfigs = [
        { singular: EntityType.TASK, fetcher: () => import('@/data-store/datastore').then(m => m.getAllTasks()) },
        { singular: EntityType.ITEM, fetcher: () => import('@/data-store/datastore').then(m => m.getAllItems()) },
        { singular: EntityType.SITE, fetcher: () => import('@/data-store/datastore').then(m => m.getAllSites()) },
        { singular: EntityType.CHARACTER, fetcher: () => import('@/data-store/datastore').then(m => m.getAllCharacters()) },
        { singular: EntityType.PLAYER, fetcher: () => import('@/data-store/datastore').then(m => m.getAllPlayers()) },
        { singular: EntityType.SALE, fetcher: () => import('@/data-store/datastore').then(m => m.getAllSales()) },
        { singular: EntityType.FINANCIAL, fetcher: () => import('@/data-store/datastore').then(m => m.getAllFinancials()) }
      ];

      for (const config of entityTypeConfigs) {
        try {
          const entities = await config.fetcher();
          
          entities.forEach((entity: any) => {
            // Use EntityType enum value (singular) as key - maintains consistency!
            const key = `${config.singular}:${entity.id}`;
            
            // Special handling for items - show name and type
            if (config.singular === EntityType.ITEM) {
              const name = entity.name || entity.id;
              const type = entity.type || entity.itemType || '';
              names[key] = type ? `${name} - ${type}` : name;
            } else {
              // For other entities, just use name/title
              names[key] = entity.name || entity.title || entity.id;
            }
          });
        } catch (error) {
          console.error(`Error loading ${config.singular} entities:`, error);
        }
      }
      
      setEntityNames(names);
    };

    loadEntityNames();
  }, [open, links]);

  // Helper function to format crypto-style ID (first 4 + last 4)
  const formatCryptoId = (id: string) => {
    if (id.length <= 8) return id;
    return `${id.substring(0, 4)}...${id.substring(id.length - 4)}`;
  };

  // Helper function to get activity links description based on entity type
  const getActivityLinksDescription = (entityType: string) => {
    switch (entityType) {
      case 'player':
        return '(What affected this player)';
      case 'character':
        return '(What affected this character)';
      case 'task':
        return '(What this task connected to)';
      case 'item':
        return '(What this item connected to)';
      case 'financial':
        return '(What this financial record connected to)';
      case 'sale':
        return '(What this sale connected to)';
      case 'site':
        return '(What this site connected to)';
      default:
        return '(Related activities)';
    }
  };

  // Helper function to get structural links description based on entity type
  const getStructuralLinksDescription = (entityType: string) => {
    switch (entityType) {
      case 'player':
        return '(How player is organized)';
      case 'character':
        return '(How character is organized)';
      case 'task':
        return '(Task organization)';
      case 'item':
        return '(Item organization)';
      case 'financial':
        return '(Financial record organization)';
      case 'sale':
        return '(Sale organization)';
      case 'site':
        return '(Site organization)';
      default:
        return '(Entity organization)';
    }
  };

  // Helper function to get display name for entity
  const getDisplayName = (type: string, id: string, fallbackName?: string) => {
    const key = `${type}:${id}`;
    const name = entityNames[key] || fallbackName || id;
    
    // Format: "Name (category, id)" or "Name - Type (id)"
    if (type === EntityType.TASK) {
      return `${name} (${formatCryptoId(id)})`;
    } else if (type === EntityType.ITEM) {
      return `${name} (${formatCryptoId(id)})`;
    } else {
      return `${name} (${formatCryptoId(id)})`;
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className={`max-w-6xl max-h-[90vh] ${getZIndexClass('MODALS')}`}>
        <DialogHeader>
          <DialogTitle className="text-xl flex items-center gap-2">
            <span>Entity Relationships</span>
            <span className="text-sm text-muted-foreground font-normal">
              ({relevantLinks.length} links)
            </span>
          </DialogTitle>
          <DialogDescription>
            {logEntry ? `Links related to: ${logEntry.description}` : 'All entity relationships'}
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-4 max-h-[60vh] overflow-y-auto">
          {relevantLinks.length > 0 ? (
            <div className="space-y-4">
              {/* Group links by type for better organization */}
              {(() => {
                const activityLinks = relevantLinks.filter(link => 
                  link.linkType.includes('TASK') || 
                  link.linkType.includes('FINREC') || 
                  link.linkType.includes('SALE') ||
                  link.linkType.includes('ITEM')
                );
                const structuralLinks = relevantLinks.filter(link => 
                  link.linkType.includes('ACCOUNT') || 
                  link.linkType.includes('CHARACTER')
                );

                return (
                  <div className="space-y-4">
                    {/* Activity Links Section */}
                    {activityLinks.length > 0 && (
                      <div>
                        <h4 className="text-sm font-medium text-muted-foreground mb-2">
                          Activity Links {getActivityLinksDescription(entityType)}
                        </h4>
                        <div className="space-y-2">
                          {activityLinks.map((link, index) => (
                            <LinkCard key={`${link.id}-${index}`} link={link} getDisplayName={getDisplayName} />
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Structural Links Section */}
                    {structuralLinks.length > 0 && (
                      <div>
                        <h4 className="text-sm font-medium text-muted-foreground mb-2">
                          Structural Links {getStructuralLinksDescription(entityType)}
                        </h4>
                        <div className="space-y-2">
                          {structuralLinks.map((link, index) => (
                            <LinkCard key={`${link.id}-${index}`} link={link} getDisplayName={getDisplayName} />
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })()}
            </div>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              <p className="text-sm">
                {logEntry ? 'No relevant links for this event' : 'No Links found'}
              </p>
              <p className="text-xs mt-1">
                {logEntry 
                  ? 'This event may not have created specific entity relationships'
                  : `Links are created automatically when you save this ${entityType}`
                }
              </p>
            </div>
          )}
        </div>
        
        <DialogFooter>
          <Button onClick={() => onOpenChange(false)} className="h-8 text-xs">
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// LinkCard component for displaying individual links
function LinkCard({ link, getDisplayName }: { link: any; getDisplayName: (type: string, id: string, fallbackName?: string) => string }) {
  const isPlayerSource = link.source.type === 'player';
  const isPlayerTarget = link.target.type === 'player';
  
  // Determine the relationship direction and type
  const getRelationshipInfo = () => {
    if (isPlayerSource && isPlayerTarget) {
      return { direction: 'bidirectional', type: 'player-to-player' };
    } else if (isPlayerSource) {
      return { direction: 'outgoing', type: `player-to-${link.target.type}` };
    } else if (isPlayerTarget) {
      return { direction: 'incoming', type: `${link.source.type}-to-player` };
    } else {
      return { direction: 'external', type: `${link.source.type}-to-${link.target.type}` };
    }
  };

  const relationship = getRelationshipInfo();

  return (
    <div className="border rounded-lg p-3 bg-gray-50 dark:bg-gray-800 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3 flex-1 min-w-0">
          {/* Link Type Badge */}
          <span className="text-xs font-mono bg-primary/10 text-primary px-2 py-1 rounded shrink-0">
            {link.linkType}
          </span>
          
          {/* Relationship Direction */}
          <span className="text-sm text-muted-foreground shrink-0">
            {relationship.direction === 'outgoing' ? '→' : 
             relationship.direction === 'incoming' ? '←' : '↔'}
          </span>
          
          {/* Source Entity */}
          <div className="text-xs min-w-0 flex-1">
            <span className="font-semibold text-blue-600 dark:text-blue-400">
              {link.source.type.toUpperCase()}:
            </span>
            <span className="text-muted-foreground ml-1 truncate">
              {getDisplayName(link.source.type, link.source.id)}
            </span>
          </div>
          
          {/* Target Entity */}
          <div className="text-xs min-w-0 flex-1">
            <span className="font-semibold text-green-600 dark:text-green-400">
              {link.target.type.toUpperCase()}:
            </span>
            <span className="text-muted-foreground ml-1 truncate">
              {getDisplayName(link.target.type, link.target.id)}
            </span>
          </div>
        </div>
        
        <Button
          variant="outline"
          size="sm"
          onClick={() => {
            console.log('Navigate to', link.target.type, link.target.id);
            // TODO: Implement navigation to related entity
          }}
          className="h-6 text-xs shrink-0 ml-2"
        >
          View
        </Button>
      </div>
      
      {/* Relationship Type - Compact Footer */}
      <div className="mt-2 text-xs text-muted-foreground flex items-center justify-between">
        <span className="truncate">
          <span className="font-medium">Relationship:</span> {relationship.type}
        </span>
        {link.createdAt && (
          <span className="text-xs text-muted-foreground shrink-0 ml-2">
            {new Date(link.createdAt).toLocaleDateString()}
          </span>
        )}
      </div>
    </div>
  );
}
