'use client';

import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { RefreshCw, Link as LinkIcon, ArrowRight, ArrowUpDown } from 'lucide-react';
import { useState, useEffect, useCallback } from 'react';
import { Link } from '@/types/entities';
import { EntityType } from '@/types/enums';
import { ClientAPI } from '@/lib/client-api';

interface LinksTabProps {
  onReload: () => Promise<void>;
  isReloading: boolean;
}

/** Data Center: browse every link in the link registry. These are connectors between entities, not lifecycle logs. */
export function LinksTab({ onReload, isReloading }: LinksTabProps) {
  const [links, setLinks] = useState<Link[]>([]);
  const [selectedLinkType, setSelectedLinkType] = useState<string>('all');
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [entityNames, setEntityNames] = useState<Record<string, string>>({});
  const [namesLoaded, setNamesLoaded] = useState<boolean>(false);
  const [sortOrder, setSortOrder] = useState<'newest' | 'oldest'>('newest');
  const itemsPerPage = 50;

  const loadLinks = useCallback(async () => {
    try {
      const allLinks = await ClientAPI.getAllLinks();
      setLinks(allLinks);

      if (!namesLoaded) {
        const names: Record<string, string> = {};

        const entityTypeConfigs = [
          { singular: EntityType.TASK, fetcher: () => ClientAPI.getTasks() },
          { singular: EntityType.ITEM, fetcher: () => ClientAPI.getItems() },
          { singular: EntityType.SITE, fetcher: () => ClientAPI.getSites() },
          { singular: EntityType.CHARACTER, fetcher: () => ClientAPI.getCharacters() },
          { singular: EntityType.PLAYER, fetcher: () => ClientAPI.getPlayers() },
          { singular: EntityType.SALE, fetcher: () => ClientAPI.getSales() },
          { singular: EntityType.FINANCIAL, fetcher: () => ClientAPI.getFinancialRecords() },
          { singular: EntityType.ACCOUNT, fetcher: () => ClientAPI.getAccounts() }
        ];

        for (const config of entityTypeConfigs) {
          try {
            const entities = await config.fetcher();

            entities.forEach(entity => {
              const key = `${config.singular}:${entity.id}`;

              if (config.singular === EntityType.ITEM) {
                const name = entity.name || entity.id;
                const type = 'type' in entity ? entity.type :
                  'itemType' in entity ? entity.itemType : '';
                names[key] = type ? `${name} - ${type}` : name;
              } else {
                const displayName = entity.name ||
                  ('title' in entity ? (entity.title as string) : '') ||
                  entity.id;
                names[key] = displayName;
              }
            });
          } catch (error) {
            console.error(`Error loading ${config.singular} entities:`, error);
          }
        }

        setEntityNames(names);
        setNamesLoaded(true);
      }
    } catch (error) {
      console.error('Error loading links:', error);
    }
  }, [namesLoaded]);

  const getLinkTypeColor = (linkType: string): string => {
    if (linkType.startsWith('TASK_')) return 'bg-purple-100 text-purple-800 border-purple-300';
    if (linkType.startsWith('ITEM_')) return 'bg-blue-100 text-blue-800 border-blue-300';
    if (linkType.startsWith('FINREC_')) return 'bg-green-100 text-green-800 border-green-300';
    if (linkType.startsWith('SALE_')) return 'bg-orange-100 text-orange-800 border-orange-300';
    if (linkType.startsWith('PLAYER_')) return 'bg-red-100 text-red-800 border-red-300';
    if (linkType.startsWith('CHARACTER_')) return 'bg-yellow-100 text-yellow-800 border-yellow-300';
    if (linkType.startsWith('SITE_')) return 'bg-gray-100 text-gray-800 border-gray-300';
    if (linkType.startsWith('ACCOUNT_')) return 'bg-teal-100 text-teal-800 border-teal-300';
    return 'bg-gray-100 text-gray-800 border-gray-300';
  };

  useEffect(() => {
    const initialLoad = async () => {
      try {
        await loadLinks();
      } catch (error) {
        console.error('[LinksTab] Error in initial load:', error);
        await loadLinks();
      }
    };

    initialLoad();
  }, [loadLinks]);

  const linkTypes = ['all', ...Array.from(new Set(links.map(l => l.linkType)))];

  const filteredLinks = selectedLinkType === 'all'
    ? links
    : links.filter(l => l.linkType === selectedLinkType);

  const sortedLinks = [...filteredLinks].sort((a, b) => {
    const aTime = new Date(a.createdAt).getTime();
    const bTime = new Date(b.createdAt).getTime();
    return sortOrder === 'newest' ? bTime - aTime : aTime - bTime;
  });

  const totalPages = Math.ceil(sortedLinks.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedLinks = sortedLinks.slice(startIndex, endIndex);

  useEffect(() => {
    setCurrentPage(1);
  }, [selectedLinkType]);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <LinkIcon className="h-6 w-6" />
            Links
          </h2>
          <p className="text-sm text-muted-foreground">
            {links.length} links — each link connects two entities. This list is not a timeline; use each entity&apos;s
            lifecycle log for history.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <select
            value={selectedLinkType}
            onChange={(e) => setSelectedLinkType(e.target.value)}
            className="p-1 border rounded bg-white dark:bg-gray-900 dark:text-white dark:border-gray-700"
          >
            {linkTypes.map(type => (
              <option key={type} value={type}>
                {type === 'all' ? 'All Types' : type}
              </option>
            ))}
          </select>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setSortOrder(sortOrder === 'newest' ? 'oldest' : 'newest')}
          >
            <ArrowUpDown className="h-4 w-4 mr-2" />
            {sortOrder === 'newest' ? 'Newest First' : 'Oldest First'}
          </Button>
          <Button
            onClick={loadLinks}
            disabled={isReloading}
            size="sm"
            variant="outline"
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${isReloading ? 'animate-spin' : ''}`} />
            Reload
          </Button>
          <Button
            onClick={async () => {
              try {
                const res = await ClientAPI.healLinks();
                if (res.success) {
                  alert(`Successfully healed ${res.repairedCount} missing links.`);
                  await loadLinks();
                } else {
                  alert(`Failed to heal links: ${res.error}`);
                }
              } catch (e: any) {
                alert(`Error healing links: ${e.message}`);
              }
            }}
            size="sm"
            variant="default"
          >
            Heal Orphans
          </Button>
        </div>
      </div>

      <div className="flex gap-4 items-center">

      </div>

      {filteredLinks.length === 0 ? (
        <Card>
          <CardContent className="text-center py-12">
            <LinkIcon className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p className="text-lg font-medium">No links yet</p>
            <p className="text-sm">Workflows create links when they connect entities (e.g. a sale to its financial row).</p>
          </CardContent>
        </Card>
      ) : (
        <>
          <div className="space-y-2">
            {paginatedLinks.map((link) => {
              const sourceKey = `${link.source.type}:${link.source.id}`;
              const targetKey = `${link.target.type}:${link.target.id}`;
              const sourceLabel = entityNames[sourceKey] || link.source.id;
              const targetLabel = entityNames[targetKey] || link.target.id;

              return (
                <div
                  key={link.id}
                  className="border rounded-lg p-4 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors space-y-2 min-w-0"
                >
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge className={getLinkTypeColor(link.linkType)}>{link.linkType}</Badge>
                    {link.createdAt && (
                      <span className="text-xs text-muted-foreground">
                        {new Date(link.createdAt).toLocaleString()}
                      </span>
                    )}
                  </div>
                  <div className="text-[11px] font-mono text-muted-foreground break-all">
                    <span className="font-sans text-muted-foreground mr-1">linkId</span>
                    {link.id}
                  </div>
                  <div className="flex flex-col gap-2 min-w-0 sm:flex-row sm:items-start sm:gap-3">
                    <div className="min-w-0 flex-1 space-y-0.5 rounded-md border border-border/60 bg-muted/20 p-2">
                      <div className="text-[10px] font-semibold uppercase text-blue-600 dark:text-blue-400">
                        {link.source.type}
                      </div>
                      <div className="text-xs text-muted-foreground break-words">{sourceLabel}</div>
                      <div className="text-[11px] font-mono break-all text-foreground">{link.source.id}</div>
                    </div>
                    <ArrowRight className="h-4 w-4 text-muted-foreground shrink-0 hidden sm:block mt-6" />
                    <div className="min-w-0 flex-1 space-y-0.5 rounded-md border border-border/60 bg-muted/20 p-2">
                      <div className="text-[10px] font-semibold uppercase text-green-600 dark:text-green-400">
                        {link.target.type}
                      </div>
                      <div className="text-xs text-muted-foreground break-words">{targetLabel}</div>
                      <div className="text-[11px] font-mono break-all text-foreground">{link.target.id}</div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {totalPages > 1 && (
            <div className="flex items-center justify-between mt-4">
              <div className="text-sm text-gray-600">
                Showing {startIndex + 1}-{Math.min(endIndex, filteredLinks.length)} of {filteredLinks.length} links
              </div>
              <div className="flex gap-2">
                <Button
                  onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                  disabled={currentPage === 1}
                  size="sm"
                  variant="outline"
                >
                  Previous
                </Button>
                <span className="flex items-center px-3 text-sm">
                  Page {currentPage} of {totalPages}
                </span>
                <Button
                  onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                  disabled={currentPage === totalPages}
                  size="sm"
                  variant="outline"
                >
                  Next
                </Button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
