'use client';

import { useEffect, useState, useCallback } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent } from '@/components/ui/card';
import { Item, Site, Link } from '@/types/entities';
import { Package, MapPin, Loader2 } from 'lucide-react';
import { getInteractiveSubModalZIndex } from '@/lib/utils/z-index-utils';
import { ClientAPI } from '@/lib/client-api';
import { EntityType, LinkType } from '@/types/enums';
import { Badge } from '@/components/ui/badge';

interface CharacterInventorySubmodalProps {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  characterId: string;
  characterName: string;
}

export default function CharacterInventorySubmodal({
  open,
  onOpenChange,
  characterId,
  characterName
}: CharacterInventorySubmodalProps) {
  const [ownedItems, setOwnedItems] = useState<Item[]>([]);
  const [ownedSites, setOwnedSites] = useState<Site[]>([]);
  const [loading, setLoading] = useState(true);

  const loadInventory = useCallback(async () => {
    try {
      setLoading(true);

      // Get all links for this character
      const links = await ClientAPI.getLinksFor({ type: EntityType.CHARACTER, id: characterId });

      // Filter for ownership links (both canonical and reverse)
      const itemLinks = links.filter((l: Link) =>
        (l.linkType === LinkType.ITEM_CHARACTER || l.linkType === LinkType.CHARACTER_ITEM) &&
        (l.source.type === EntityType.CHARACTER && l.source.id === characterId ||
          l.target.type === EntityType.CHARACTER && l.target.id === characterId)
      );

      const siteLinks = links.filter((l: Link) =>
        (l.linkType === LinkType.SITE_CHARACTER || l.linkType === LinkType.CHARACTER_SITE) &&
        (l.source.type === EntityType.CHARACTER && l.source.id === characterId ||
          l.target.type === EntityType.CHARACTER && l.target.id === characterId)
      );

      // Get item IDs from links
      const itemIds = new Set<string>();
      itemLinks.forEach((link: Link) => {
        if (link.source.type === EntityType.ITEM) {
          itemIds.add(link.source.id);
        } else if (link.target.type === EntityType.ITEM) {
          itemIds.add(link.target.id);
        }
      });

      // Get site IDs from links
      const siteIds = new Set<string>();
      siteLinks.forEach((link: Link) => {
        if (link.source.type === EntityType.SITE) {
          siteIds.add(link.source.id);
        } else if (link.target.type === EntityType.SITE) {
          siteIds.add(link.target.id);
        }
      });

      // Fetch items and sites
      const allItems = await ClientAPI.getItems();
      const allSites = await ClientAPI.getSites();

      const items = allItems.filter((item: Item) => itemIds.has(item.id));
      const sites = allSites.filter((site: Site) => siteIds.has(site.id));

      setOwnedItems(items);
      setOwnedSites(sites);
    } catch (error) {
      console.error('Failed to load inventory:', error);
    } finally {
      setLoading(false);
    }
  }, [characterId]);

  useEffect(() => {
    if (open) {
      loadInventory();
    }
  }, [open, loadInventory]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="max-w-4xl max-h-[80vh]"
        style={{ zIndex: getInteractiveSubModalZIndex() }}
      >
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Package className="h-5 w-5" />
            Inventory: {characterName}
          </DialogTitle>
        </DialogHeader>

        <Tabs defaultValue="items" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="items">
              <Package className="h-4 w-4 mr-2" />
              Owned Items ({ownedItems.length})
            </TabsTrigger>
            <TabsTrigger value="sites">
              <MapPin className="h-4 w-4 mr-2" />
              Owned Sites ({ownedSites.length})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="items" className="mt-4">
            <ScrollArea className="h-[500px]">
              {loading ? (
                <div className="flex items-center justify-center h-32">
                  <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                </div>
              ) : ownedItems.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-32 text-muted-foreground">
                  <Package className="h-12 w-12 mb-4 opacity-20" />
                  <p>No owned items</p>
                  <p className="text-sm">Items owned by this character will appear here</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {ownedItems.map((item) => (
                    <Card key={item.id} className="hover:bg-accent/50 transition-colors">
                      <CardContent className="p-4">
                        <div className="flex items-start justify-between">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-2">
                              <h4 className="font-semibold truncate">{item.name}</h4>
                              <Badge variant="secondary" className="text-xs">
                                {item.type}
                              </Badge>
                            </div>
                            {item.description && (
                              <p className="text-sm text-muted-foreground line-clamp-2 mb-2">
                                {item.description}
                              </p>
                            )}
                            <div className="flex items-center gap-4 text-xs text-muted-foreground">
                              {item.status && (
                                <span>Status: {item.status}</span>
                              )}
                              {item.price > 0 && (
                                <span>Price: ${item.price.toLocaleString()}</span>
                              )}
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </ScrollArea>
          </TabsContent>

        </Tabs>

        <div className="flex justify-end gap-2 mt-4">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Close
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

