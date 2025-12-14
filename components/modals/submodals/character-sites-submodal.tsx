'use client';

import { useEffect, useState, useCallback } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Card, CardContent } from '@/components/ui/card';
import { Site, Link } from '@/types/entities';
import { MapPin, Loader2, Plus, Trash2 } from 'lucide-react';
import { getInteractiveSubModalZIndex } from '@/lib/utils/z-index-utils';
import { ClientAPI } from '@/lib/client-api';
import { EntityType, LinkType } from '@/types/enums';
import { Badge } from '@/components/ui/badge';
import { SearchableSelect } from '@/components/ui/searchable-select';
import { createSiteOptionsWithCategories } from '@/lib/utils/site-options-utils'; // Assuming this exists or similar

interface CharacterSitesSubmodalProps {
    open: boolean;
    onOpenChange: (v: boolean) => void;
    characterId: string;
    characterName: string;
}

export default function CharacterSitesSubmodal({
    open,
    onOpenChange,
    characterId,
    characterName
}: CharacterSitesSubmodalProps) {
    const [ownedSites, setOwnedSites] = useState<Site[]>([]);
    const [loading, setLoading] = useState(true);
    const [isAdding, setIsAdding] = useState(false);
    const [allSiteOptions, setAllSiteOptions] = useState<Site[]>([]);
    const [selectedSiteId, setSelectedSiteId] = useState('');

    const loadSites = useCallback(async () => {
        try {
            setLoading(true);

            console.log('[OwnedSites] Loading sites for character:', characterId);

            // Get all links for this character
            const links = await ClientAPI.getLinksFor({ type: EntityType.CHARACTER, id: characterId });
            console.log('[OwnedSites] All links:', links.length);

            // Filter for ownership links (canonical: CHARACTER_SITE)
            // Usually Character OWNS Site
            const siteLinks = links.filter((l: Link) =>
                (l.linkType === LinkType.CHARACTER_SITE) &&
                (l.source.type === EntityType.CHARACTER && l.source.id === characterId)
            );
            console.log('[OwnedSites] CHARACTER_SITE links:', siteLinks.length, siteLinks);

            // Get site IDs
            const siteIds = new Set<string>();
            siteLinks.forEach((link: Link) => {
                if (link.target.type === EntityType.SITE) {
                    siteIds.add(link.target.id);
                }
            });
            console.log('[OwnedSites] Site IDs from links:', Array.from(siteIds));

            // Fetch all sites for options and filtering
            const allSites = await ClientAPI.getSites();
            setAllSiteOptions(allSites);
            console.log('[OwnedSites] All sites:', allSites.length);

            // Union of Linked Sites AND Sites where ownerId matches
            const mySites = allSites.filter((site: Site) => siteIds.has(site.id) || site.ownerId === characterId);
            console.log('[OwnedSites] My sites:', mySites.length, mySites.map(s => ({ id: s.id, name: s.name, ownerId: s.ownerId })));
            setOwnedSites(mySites);

        } catch (error) {
            console.error('[OwnedSites] Failed to load sites:', error);
        } finally {
            setLoading(false);
        }
    }, [characterId]);

    useEffect(() => {
        if (open) {
            loadSites();
        }
    }, [open, loadSites]);

    const handleAddSite = async () => {
        if (!selectedSiteId) return;
        try {
            setLoading(true); // Show loading during link creation

            console.log('[OwnedSites] Creating link:', {
                character: characterId,
                site: selectedSiteId,
                linkType: LinkType.CHARACTER_SITE
            });

            // 1. Create Link: Character -> Site
            const linkResult = await ClientAPI.createLink({
                source: { type: EntityType.CHARACTER, id: characterId },
                target: { type: EntityType.SITE, id: selectedSiteId },
                linkType: LinkType.CHARACTER_SITE,
            });

            console.log('[OwnedSites] Link created:', linkResult);

            // 2. Sync ownerId in Site Entity (for legacy compatibility)
            const siteToUpdate = allSiteOptions.find(s => s.id === selectedSiteId);
            if (siteToUpdate) {
                console.log('[OwnedSites] Updating site ownerId:', { siteId: selectedSiteId, ownerId: characterId });
                await ClientAPI.upsertSite({
                    ...siteToUpdate,
                    ownerId: characterId
                });
                console.log('[OwnedSites] Site updated');
            } else {
                console.error('[OwnedSites] Site not found in allSiteOptions:', selectedSiteId);
            }

            // Reset state
            setIsAdding(false);
            setSelectedSiteId('');

            // Small delay to ensure DB commits
            await new Promise(resolve => setTimeout(resolve, 500));

            console.log('[OwnedSites] Reloading sites...');
            // Reload sites to show the newly linked site
            await loadSites();
        } catch (err) {
            console.error("[OwnedSites] Failed to add site:", err);
            alert(`Failed to link site: ${err instanceof Error ? err.message : 'Unknown error'}`);
        } finally {
            setLoading(false);
        }
    };

    const handleRemoveSite = async (siteId: string) => {
        try {
            // 1. Remove Link
            const links = await ClientAPI.getLinksFor({ type: EntityType.CHARACTER, id: characterId });
            const linkToDelete = links.find(l =>
                l.linkType === LinkType.CHARACTER_SITE &&
                l.source.id === characterId &&
                l.target.id === siteId
            );
            if (linkToDelete) {
                await ClientAPI.removeLink(linkToDelete.id);
            }

            // 2. Clear ownerId if it matches current character
            const site = ownedSites.find(s => s.id === siteId);
            if (site && site.ownerId === characterId) {
                await ClientAPI.upsertSite({
                    ...site,
                    ownerId: undefined // Unset owner
                });
            }

            loadSites();
        } catch (err) {
            console.error("Failed to remove site", err);
        }
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent
                className="max-w-3xl max-h-[80vh] min-h-[500px] flex flex-col"
                style={{ zIndex: getInteractiveSubModalZIndex() }}
            >
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <MapPin className="h-5 w-5" />
                        Owned Sites: {characterName}
                    </DialogTitle>
                </DialogHeader>

                <div className="flex flex-col gap-4 flex-1 min-h-0">
                    {/* Add New Site Section */}
                    {!isAdding ? (
                        <Button variant="outline" size="sm" className="self-start" onClick={() => setIsAdding(true)}>
                            <Plus className="h-4 w-4 mr-2" /> Link New Site
                        </Button>
                    ) : (
                        <div className="flex items-center gap-2 p-3 border rounded-lg bg-muted/20">
                            <SearchableSelect
                                options={createSiteOptionsWithCategories(allSiteOptions.filter(s => !ownedSites.find(os => os.id === s.id)))}
                                value={selectedSiteId}
                                onValueChange={setSelectedSiteId}
                                placeholder="Select a site to own..."
                                className="w-[300px]"
                            />
                            <Button size="sm" onClick={handleAddSite} disabled={!selectedSiteId || loading}>
                                {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Link'}
                            </Button>
                            <Button size="sm" variant="ghost" onClick={() => { setIsAdding(false); setSelectedSiteId(''); }} disabled={loading}>Cancel</Button>
                        </div>
                    )}

                    <ScrollArea className="h-[400px]">
                        {loading ? (
                            <div className="flex items-center justify-center h-32">
                                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                            </div>
                        ) : ownedSites.length === 0 ? (
                            <div className="flex flex-col items-center justify-center h-32 text-muted-foreground">
                                <MapPin className="h-12 w-12 mb-4 opacity-20" />
                                <p>No owned sites</p>
                            </div>
                        ) : (
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                {ownedSites.map((site) => (
                                    <Card key={site.id} className="hover:bg-accent/50 transition-colors">
                                        <CardContent className="p-4">
                                            <div className="flex items-start justify-between">
                                                <div className="flex-1 min-w-0">
                                                    <div className="flex items-center gap-2 mb-2">
                                                        <h4 className="font-semibold truncate">{site.name}</h4>
                                                        <Badge variant="secondary" className="text-xs">
                                                            {site.metadata?.type || 'Unknown'}
                                                        </Badge>
                                                    </div>
                                                    {site.description && (
                                                        <p className="text-sm text-muted-foreground line-clamp-2 mb-2">
                                                            {site.description}
                                                        </p>
                                                    )}
                                                    <Button variant="ghost" size="sm" className="h-6 text-red-500 hover:text-red-700 hover:bg-red-50" onClick={() => handleRemoveSite(site.id)}>
                                                        <Trash2 className="h-3 w-3 mr-1" /> Unlink
                                                    </Button>
                                                </div>
                                            </div>
                                        </CardContent>
                                    </Card>
                                ))}
                            </div>
                        )}
                    </ScrollArea>
                </div>

                <DialogFooter>
                    <Button variant="outline" onClick={() => onOpenChange(false)}>
                        Close
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
