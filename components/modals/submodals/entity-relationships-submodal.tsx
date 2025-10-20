'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Link as LinkIcon, ArrowRight, Network, Trash2 } from 'lucide-react';
import { Link } from '@/types/entities';
import { EntityType, LinkType } from '@/types/enums';
import { getLinksFor, removeLink } from '@/links/link-registry';
import { getZIndexClass } from '@/lib/utils/z-index-utils';
import { ClientAPI } from '@/lib/client-api';

interface EntityRelationshipsModalProps {
  entity: { type: EntityType; id: string; name?: string };
  open: boolean;
  onClose: () => void;
}

export default function EntityRelationshipsModal({
  entity,
  open,
  onClose
}: EntityRelationshipsModalProps) {
  const [links, setLinks] = useState<Link[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('all');
  const [entityNames, setEntityNames] = useState<Record<string, string>>({});

  const loadLinks = useCallback(async () => {
    try {
      setLoading(true);
      const entityLinks = await getLinksFor(entity);
      setLinks(entityLinks);
      
      // Fetch entity names for all linked entities
      const names: Record<string, string> = {};
      for (const link of entityLinks) {
        const sourceKey = `${link.source.type}:${link.source.id}`;
        const targetKey = `${link.target.type}:${link.target.id}`;
        
        if (!names[sourceKey]) {
          names[sourceKey] = await getEntityDisplayName(link.source.type, link.source.id);
        }
        if (!names[targetKey]) {
          names[targetKey] = await getEntityDisplayName(link.target.type, link.target.id);
        }
      }
      setEntityNames(names);
    } catch (error) {
      console.error('Failed to load links:', error);
    } finally {
      setLoading(false);
    }
  }, [entity]);

  useEffect(() => {
    if (open && entity) {
      loadLinks();
    }
  }, [open, entity, loadLinks]);

  const groupLinksByType = () => {
    const groups: { [key: string]: Link[] } = {
      tasks: [],
      items: [],
      financials: [],
      sales: [],
      characters: [],
      players: [],
      sites: []
    };

    links.forEach(link => {
      // Determine which entity type this link connects to
      const otherEntityType = link.source.id === entity.id ? link.target.type : link.source.type;
      if (groups[otherEntityType + 's']) {
        groups[otherEntityType + 's'].push(link);
      } else if (groups[otherEntityType]) {
        groups[otherEntityType].push(link);
      }
    });

    return groups;
  };

  const handleDeleteLink = async (linkId: string) => {
    if (confirm('Remove this relationship link?')) {
      try {
        await removeLink(linkId);
        await loadLinks();
      } catch (error) {
        console.error('Failed to delete link:', error);
      }
    }
  };


  const getEntityDisplayName = async (entityType: EntityType, entityId: string): Promise<string> => {
    try {
      // Try to fetch actual entity name from DataStore
      let entity: any = null;
      
      switch (entityType) {
        case 'task':
          entity = await ClientAPI.getTaskById(entityId);
          break;
        case 'item':
          entity = await ClientAPI.getItemById(entityId);
          break;
        case 'financial':
          entity = await ClientAPI.getFinancialRecordById(entityId);
          break;
        case 'sale':
          entity = await ClientAPI.getSaleById(entityId);
          break;
        case 'character':
          entity = await ClientAPI.getCharacterById(entityId);
          break;
        case 'player':
          entity = await ClientAPI.getPlayerById(entityId);
          break;
        case 'site':
          entity = await ClientAPI.getSiteById(entityId);
          break;
      }
      
      if (entity && entity.name) {
        return entity.name;
      }
    } catch (error) {
      console.warn(`Failed to fetch ${entityType} name for ${entityId}:`, error);
    }
    
    // Fallback to formatted ID
    const shortId = entityId.slice(0, 8);
    return `${entityType.charAt(0).toUpperCase() + entityType.slice(1)} ${shortId}`;
  };

  const groupedLinks = groupLinksByType();
  const totalLinks = links.length;

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className={`max-w-4xl max-h-[80vh] ${getZIndexClass('SUB_MODALS')}`}>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Network className="w-5 h-5" />
            Relationships for {entity.name || `${entity.type}:${entity.id.slice(0, 8)}`}
          </DialogTitle>
        </DialogHeader>

        {loading ? (
          <div className="flex items-center justify-center py-8">
            <div className="text-muted-foreground">Loading relationships...</div>
          </div>
        ) : totalLinks === 0 ? (
          <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
            <Network className="w-12 h-12 mb-4 opacity-20" />
            <p>No relationships found</p>
            <p className="text-sm">Links will appear here when entities are connected</p>
          </div>
        ) : (
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="grid grid-cols-8 w-full">
              <TabsTrigger value="all">All ({totalLinks})</TabsTrigger>
              <TabsTrigger value="tasks">Tasks ({groupedLinks.tasks.length})</TabsTrigger>
              <TabsTrigger value="items">Items ({groupedLinks.items.length})</TabsTrigger>
              <TabsTrigger value="financials">Financial ({groupedLinks.financials.length})</TabsTrigger>
              <TabsTrigger value="sales">Sales ({groupedLinks.sales.length})</TabsTrigger>
              <TabsTrigger value="characters">Characters ({groupedLinks.characters.length})</TabsTrigger>
              <TabsTrigger value="players">Players ({groupedLinks.players.length})</TabsTrigger>
              <TabsTrigger value="sites">Sites ({groupedLinks.sites.length})</TabsTrigger>
            </TabsList>

            <ScrollArea className="h-[400px] mt-4">
              <TabsContent value="all" className="space-y-2">
                {links.map(link => (
                  <LinkCard 
                    key={link.id} 
                    link={link} 
                    currentEntity={entity}
                    entityNames={entityNames}
                    onDelete={handleDeleteLink}
                  />
                ))}
              </TabsContent>

              {Object.entries(groupedLinks).map(([type, typeLinks]) => (
                <TabsContent key={type} value={type} className="space-y-2">
                  {typeLinks.length === 0 ? (
                    <div className="text-center text-muted-foreground py-8">
                      No {type} relationships
                    </div>
                  ) : (
                    typeLinks.map(link => (
                      <LinkCard 
                        key={link.id} 
                        link={link} 
                        currentEntity={entity}
                        entityNames={entityNames}
                        onDelete={handleDeleteLink}
                      />
                    ))
                  )}
                </TabsContent>
              ))}
            </ScrollArea>
          </Tabs>
        )}

        <div className="flex justify-end gap-2 mt-4">
          <Button variant="outline" onClick={onClose}>Close</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function LinkCard({ 
  link, 
  currentEntity,
  entityNames,
  onDelete 
}: { 
  link: Link; 
  currentEntity: { type: EntityType; id: string };
  entityNames: Record<string, string>;
  onDelete: (linkId: string) => void;
}) {
  const isSource = link.source.id === currentEntity.id;
  const otherEntity = isSource ? link.target : link.source;
  const direction = isSource ? '→' : '←';

  const getEntityDisplayName = (entityType: EntityType, entityId: string): string => {
    const key = `${entityType}:${entityId}`;
    return entityNames[key] || `${entityType.charAt(0).toUpperCase() + entityType.slice(1)} ${entityId.slice(0, 8)}`;
  };

  return (
    <Card className="hover:bg-accent/10 transition-colors">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <LinkIcon className="w-4 h-4 text-muted-foreground" />
            <Badge variant="secondary" className="font-mono text-xs">
              {link.linkType}
            </Badge>
            {isSource ? (
              <Badge variant="outline" className="text-xs">Outgoing →</Badge>
            ) : (
              <Badge variant="outline" className="text-xs">← Incoming</Badge>
            )}
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onDelete(link.id)}
            className="h-8 w-8 p-0 text-destructive hover:text-destructive"
          >
            <Trash2 className="w-4 h-4" />
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <div className="flex items-center gap-4">
          <div className="flex-1">
            <div className="text-sm font-medium">
              {currentEntity.type.toUpperCase()}
            </div>
            <div className="text-xs text-muted-foreground truncate">
              {getEntityDisplayName(currentEntity.type, currentEntity.id)}
            </div>
          </div>
          
          <ArrowRight className="w-4 h-4 text-muted-foreground flex-shrink-0" />
          
          <div className="flex-1">
            <div className="text-sm font-medium">
              {otherEntity.type.toUpperCase()}
            </div>
            <div className="text-xs text-muted-foreground truncate">
              {getEntityDisplayName(otherEntity.type, otherEntity.id)}
            </div>
          </div>
        </div>

        {link.metadata && Object.keys(link.metadata).length > 0 && (
          <div className="mt-3 pt-3 border-t">
            <div className="text-xs text-muted-foreground font-medium mb-1">Metadata:</div>
            <div className="text-xs font-mono bg-muted/50 p-2 rounded">
              {JSON.stringify(link.metadata, null, 2)}
            </div>
          </div>
        )}

        <div className="mt-2 text-xs text-muted-foreground">
          Created: {new Date(link.createdAt).toLocaleString()}
        </div>
      </CardContent>
    </Card>
  );
}

