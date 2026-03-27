'use client';

import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { EntityType } from '@/types/enums';
import { useEffect, useState } from 'react';
import { ClientAPI } from '@/lib/client-api';
import { formatDisplayDate } from '@/lib/utils/date-utils';

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

  const resolveLogTitle = () => {
    if (!logEntry) return '';
    if (logEntry.description) return String(logEntry.description);
    const event = String(logEntry.event || '').toLowerCase();
    const name = logEntry.name || logEntry.entityName || logEntry.entityId || entityName || 'entity';
    if (event) return `${event.toUpperCase()}: ${name}`;
    return String(name);
  };

  /** One row per link id — ITEM_SITE matched both legacy “buckets” and appeared twice. */
  function dedupeLinksById(list: any[]): any[] {
    const seen = new Set<string>();
    return list.filter((link) => {
      const id = link?.id;
      if (typeof id !== 'string' || !id) return true;
      if (seen.has(id)) return false;
      seen.add(id);
      return true;
    });
  }

  // Get relevant links based on log entry context
  const getRelevantLinks = () => {
    if (!logEntry) {
      return dedupeLinksById(links);
    }

    const description = logEntry.description || '';
    const event = String(logEntry.event || '').toLowerCase();
    const eventLabel = String(description || event).toLowerCase();
    const timestamp = logEntry.timestamp || logEntry.soldAt || logEntry.collectedAt;
    const sourceId = (logEntry as any).sourceId as string | undefined;

    // For player logs, we want to show:
    // 1. What created this link (source entity)
    // 2. What this link connects to (target entity)
    // 3. The relationship type (PLAYER_WHAT or WHAT_PLAYER)
    
    // Group links by relationship type and show the most relevant ones
    const linkGroups = {
      // Activity-based links (dynamic relationships from actions/events)
      activity: links
        .filter(link => 
          link.linkType.includes('TASK') || 
          link.linkType.includes('FINREC') || 
          link.linkType.includes('SALE') ||
          link.linkType.includes('ITEM')
        )
        // If the log entry has a sourceId (e.g., WIN_POINTS from task/record/sale),
        // prioritize showing only the links that match that specific source
        .filter(link => {
          if (!sourceId) return true;
          return link.source?.id === sourceId || link.target?.id === sourceId;
        }),
      // Structural links (static organizational relationships)
      structural: links.filter(link => 
        link.linkType.includes('ACCOUNT') || 
        link.linkType.includes('CHARACTER') ||
        link.linkType.includes('SITE')
      )
    };

    // Optional narrowing for item SOLD/COLLECTED events:
    // keep links whose effective timestamp is near the lifecycle event.
    if (entityType === EntityType.ITEM && timestamp && (eventLabel.includes('sold') || eventLabel.includes('collected'))) {
      const eventTime = new Date(timestamp).getTime();
      const maxDeltaMs = 36 * 60 * 60 * 1000; // 36h tolerance for timezone and backfills

      const getLinkTimestamp = (link: any): number | null => {
        const candidate =
          link?.metadata?.soldAt ||
          link?.metadata?.movedAt ||
          link?.metadata?.createdAt ||
          link?.createdAt;
        if (!candidate) return null;
        const ms = new Date(candidate).getTime();
        return Number.isFinite(ms) ? ms : null;
      };

      const narrowed = linkGroups.activity.filter(link => {
        if (link.linkType !== 'SALE_ITEM' && link.linkType !== 'FINREC_ITEM') return true;
        const ms = getLinkTimestamp(link);
        if (ms === null) return true;
        return Math.abs(ms - eventTime) <= maxDeltaMs;
      });

      if (narrowed.length > 0) {
        linkGroups.activity = narrowed;
      }
    }

    let merged: any[];
    if (eventLabel.includes('created')) {
      merged = [...linkGroups.structural, ...linkGroups.activity];
    } else if (eventLabel.includes('updated') || eventLabel.includes('points') || eventLabel.includes('completed') || eventLabel.includes('done')) {
      merged = [...linkGroups.activity, ...linkGroups.structural];
    } else {
      merged = [...linkGroups.activity, ...linkGroups.structural];
    }
    return dedupeLinksById(merged);
  };

  const relevantLinks = getRelevantLinks();

  // Debug logging removed

  // Load entity names when modal opens
  useEffect(() => {
    if (!open || links.length === 0) return;

    const loadEntityNames = async () => {
      const names: Record<string, string> = {};
      
      // Define entity type mappings using EntityType enum as source of truth
      // ✅ FIXED: Using ClientAPI instead of direct datastore import (HTTP pattern)
      const entityTypeConfigs = [
        { singular: EntityType.TASK, fetcher: () => ClientAPI.getTasks() },
        { singular: EntityType.ITEM, fetcher: () => ClientAPI.getItems() },
        { singular: EntityType.SITE, fetcher: () => ClientAPI.getSites() },
        { singular: EntityType.CHARACTER, fetcher: () => ClientAPI.getCharacters() },
        { singular: EntityType.PLAYER, fetcher: () => ClientAPI.getPlayers() },
        { singular: EntityType.SALE, fetcher: () => ClientAPI.getSales() },
        { singular: EntityType.FINANCIAL, fetcher: () => ClientAPI.getFinancialRecords() }
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
      <DialogContent zIndexLayer={'SUB_MODALS'} className="max-w-6xl max-h-[90vh]">
        <DialogHeader>
          <DialogTitle className="text-xl flex items-center gap-2">
            <span>Entity Relationships</span>
            <span className="text-sm text-muted-foreground font-normal">
              ({relevantLinks.length} links)
            </span>
          </DialogTitle>
          <DialogDescription>
            {logEntry
              ? `Links related to: ${resolveLogTitle()} — current state only; timeline is in entity logs.`
              : 'Current relationships in the database (not a timeline — use entity logs for history).'}
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-4 max-h-[60vh] overflow-y-auto">
          {relevantLinks.length > 0 ? (
            <div className="space-y-4">
              <div>
                <h4 className="text-sm font-medium text-muted-foreground mb-2">Connections</h4>
                <div className="space-y-2">
                  {relevantLinks.map((link) => (
                    <LinkCard key={link.id} link={link} getDisplayName={getDisplayName} />
                  ))}
                </div>
              </div>
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
            {formatDisplayDate(link.createdAt)}
          </span>
        )}
      </div>
    </div>
  );
}
