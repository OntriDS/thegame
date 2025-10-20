'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { RefreshCw, Link as LinkIcon, ArrowRight, ArrowUpDown } from 'lucide-react';
import { useState, useEffect, useCallback } from 'react';
// Links will be handled through API routes
import { Link } from '@/types/entities';
import { LinkType, EntityType } from '@/types/enums';
import { ClientAPI } from '@/lib/client-api';

interface LinksTabProps {
  onReload: () => Promise<void>;
  isReloading: boolean;
}

export function LinksTab({ onReload, isReloading }: LinksTabProps) {
  const [links, setLinks] = useState<Link[]>([]);
  const [selectedLinkType, setSelectedLinkType] = useState<string>('all');
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [entityNames, setEntityNames] = useState<Record<string, string>>({});
  const [namesLoaded, setNamesLoaded] = useState<boolean>(false);
  const [sortOrder, setSortOrder] = useState<'newest' | 'oldest'>('newest');
  const itemsPerPage = 50;

  // Load all links and entity names
  const loadLinks = useCallback(async () => {
    try {
      console.log('[LinksTab] 🔍 Loading links...');
      const response = await fetch('/api/links');
      const allLinks = await response.json();
      console.log('[LinksTab] 📊 Retrieved links:', allLinks.length, allLinks);
      setLinks(allLinks);
      
      // Only load entity names once
      if (!namesLoaded) {
        // Load entity names for better display
        const names: Record<string, string> = {};
        
        // Define entity type mappings using EntityType enum as source of truth
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
        setNamesLoaded(true);
      }
    } catch (error) {
      console.error('Error loading links:', error);
    }
  }, [namesLoaded]);

  // Get badge color based on link type - Visual system based on source entity
  const getLinkTypeColor = (linkType: string): string => {
    // Color system: Each entity type has its color
    if (linkType.startsWith('TASK_')) return 'bg-purple-100 text-purple-800 border-purple-300';
    if (linkType.startsWith('ITEM_')) return 'bg-blue-100 text-blue-800 border-blue-300';
    if (linkType.startsWith('FINREC_')) return 'bg-green-100 text-green-800 border-green-300';
    if (linkType.startsWith('SALE_')) return 'bg-orange-100 text-orange-800 border-orange-300';
    if (linkType.startsWith('PLAYER_')) return 'bg-red-100 text-red-800 border-red-300';
    if (linkType.startsWith('CHARACTER_')) return 'bg-yellow-100 text-yellow-800 border-yellow-300';
    if (linkType.startsWith('SITE_')) return 'bg-gray-100 text-gray-800 border-gray-300';
    if (linkType.startsWith('ACCOUNT_')) return 'bg-teal-100 text-teal-800 border-teal-300';
    return 'bg-gray-100 text-gray-800 border-gray-300'; // default
  };

  useEffect(() => {
    // Initial load with cache refresh
    const initialLoad = async () => {
      try {
        // Load links directly from KV
        await loadLinks();
      } catch (error) {
        console.error('[LinksTab] Error in initial load:', error);
        // Fallback to regular load
        await loadLinks();
      }
    };
    
    initialLoad();
    
    // Set up interval to refresh links every 2 seconds (for real-time debugging)
    const interval = setInterval(loadLinks, 2000);
    
    return () => clearInterval(interval);
  }, [loadLinks]);

  // Get unique link types from current links
  const linkTypes = ['all', ...Array.from(new Set(links.map(l => l.linkType)))];

  // Filter links by selected type
  const filteredLinks = selectedLinkType === 'all' 
    ? links 
    : links.filter(l => l.linkType === selectedLinkType);

  // Sort links by timestamp
  const sortedLinks = [...filteredLinks].sort((a, b) => {
    const aTime = new Date(a.createdAt).getTime();
    const bTime = new Date(b.createdAt).getTime();
    return sortOrder === 'newest' ? bTime - aTime : aTime - bTime;
  });

  // Pagination
  const totalPages = Math.ceil(sortedLinks.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedLinks = sortedLinks.slice(startIndex, endIndex);

  // Reset to page 1 when filter changes
  useEffect(() => {
    setCurrentPage(1);
  }, [selectedLinkType]);

  return (
    <div className="space-y-4">
      {/* Simple Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <LinkIcon className="h-6 w-6" />
            Links
          </h2>
          <p className="text-gray-600">{links.length} total links</p>
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
        </div>
      </div>

      {/* Simple Filter */}
      <div className="flex gap-4 items-center">

      </div>

      {/* Links List - Simple and Clean */}
      {filteredLinks.length === 0 ? (
        <Card>
          <CardContent className="text-center py-12">
            <LinkIcon className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p className="text-lg font-medium">No Links Yet</p>
            <p className="text-sm">Links will appear here as entities create relationships</p>
          </CardContent>
        </Card>
      ) : (
        <>
          <div className="space-y-2">
            {paginatedLinks.map((link) => (
            <div
              key={link.id}
              className="border rounded-lg p-4 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
            >
              <div className="flex items-center justify-between">
                {/* Link Type Badge */}
                <Badge className={getLinkTypeColor(link.linkType)}>
                  {link.linkType}
                </Badge>
                
                {/* Source → Target */}
                <div className="flex items-center gap-2 flex-1 mx-4">
                  <div className="text-sm bg-gray-100 dark:bg-gray-700 px-2 py-1 rounded">
                    {link.source.type === 'account' 
                      ? `account: ${link.metadata?.name || entityNames[`${link.source.type}:${link.source.id}`] || 'created'}`
                      : `${link.source.type}: ${entityNames[`${link.source.type}:${link.source.id}`] || link.source.id}`
                    }
                  </div>
                  <ArrowRight className="h-4 w-4 text-gray-400" />
                  <div className="text-sm bg-gray-100 dark:bg-gray-700 px-2 py-1 rounded">
                    {link.target.type}: {entityNames[`${link.target.type}:${link.target.id}`] || link.target.id}
                  </div>
                </div>

                {/* Metadata - Smart Formatting */}
                {link.metadata && Object.keys(link.metadata).length > 0 && (
                  <div className="text-xs text-gray-500">
                    {(() => {
                      // Format metadata smartly based on link type
                      switch (link.linkType) {
                        case 'TASK_PLAYER' as any:
                        case 'FINREC_PLAYER' as any:
                        case 'SALE_PLAYER' as any:
                          // Show points breakdown
                          const points = link.metadata.points;
                          if (points) {
                            return (
                              <span>
                                {points.hp ? `HP:${points.hp} ` : ''}
                                {points.fp ? `FP:${points.fp} ` : ''}
                                {points.rp ? `RP:${points.rp} ` : ''}
                                {points.xp ? `XP:${points.xp}` : ''}
                              </span>
                            );
                          }
                          break;
                        
                        case 'TASK_FINREC':
                        case 'FINREC_TASK':
                          // Show cost/revenue and payment status
                          return (
                            <span>
                              {link.metadata.cost > 0 && `-$${link.metadata.cost} `}
                              {link.metadata.revenue > 0 && `+$${link.metadata.revenue} `}
                              {link.metadata.isNotPaid && '⏳ Not Paid '}
                              {link.metadata.isNotCharged && '⏳ Not Charged'}
                            </span>
                          );
                        
                        case 'TASK_ITEM':
                        case 'FINREC_ITEM':
                          // Show item type and quantity
                          return (
                            <span>
                              {link.metadata.type || link.metadata.itemType} 
                              {link.metadata.quantity && ` (${link.metadata.quantity}x)`}
                            </span>
                          );
                        
                        case 'ITEM_TASK':
                        case 'ITEM_FINREC':
                          // Show source info
                          return <span>Source: {link.metadata.createdBy || link.metadata.sourceType || 'task/financial'}</span>;
                        
                        case 'TASK_SITE':
                        case 'FINREC_SITE':
                        case 'SALE_SITE':
                          // Site links - show if it's target
                          return link.metadata.isTarget ? <span>Target Site</span> : <span>Work Site</span>;
                        
                        case 'ITEM_SITE':
                          // Show quantity at site
                          return <span>Quantity: {link.metadata.quantity || 0}</span>;
                        
                        case 'ACCOUNT_CHARACTER':
                        case 'ACCOUNT_PLAYER':
                          // Show account contact info (name, email, phone)
                          const accountMeta = link.metadata || {};
                          return (
                            <span>
                              {accountMeta.name || 'No name'}
                              {accountMeta.email && ` • ${accountMeta.email}`}
                              {accountMeta.phone && ` • ${accountMeta.phone}`}
                            </span>
                          );
                        
                        case 'CHARACTER_ACCOUNT':
                        case 'PLAYER_ACCOUNT':
                          // Show linked to account
                          return <span>Linked to Account</span>;
                        
                        default:
                          // Fallback: show all metadata
                          return Object.entries(link.metadata).map(([key, value]) => (
                            <span key={key} className="mr-2">
                              {key}: {typeof value === 'object' ? JSON.stringify(value) : String(value)}
                            </span>
                          ));
                      }
                    })()}
                  </div>
                )}
              </div>
            </div>
            ))}
          </div>

          {/* Pagination */}
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