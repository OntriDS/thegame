'use client';

import { useEffect, useState, useCallback } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Card, CardContent } from '@/components/ui/card';
import { Business, Link } from '@/types/entities';
import { Building2, Loader2, Plus, Trash2, Link as LinkIcon } from 'lucide-react';
import { getInteractiveSubModalZIndex } from '@/lib/utils/z-index-utils';
import { ClientAPI } from '@/lib/client-api';
import { EntityType, LinkType } from '@/types/enums';
import { Badge } from '@/components/ui/badge';
import { SearchableSelect } from '@/components/ui/searchable-select';
import { BusinessSubmodal } from './business-submodal';
import { createBusinessOptionsWithCategories } from '@/lib/utils';

interface CharacterLegalEntitiesSubmodalProps {
    open: boolean;
    onOpenChange: (v: boolean) => void;
    characterId: string;
    characterName: string;
}

export default function CharacterLegalEntitiesSubmodal({
    open,
    onOpenChange,
    characterId,
    characterName
}: CharacterLegalEntitiesSubmodalProps) {
    const [linkedEntities, setLinkedEntities] = useState<Business[]>([]);
    const [loading, setLoading] = useState(true);
    const [isLinking, setIsLinking] = useState(false); // Mode to link existing
    const [editingEntity, setEditingEntity] = useState<Business | undefined>(undefined);
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);

    const [allEntityOptions, setAllEntityOptions] = useState<Business[]>([]);
    const [selectedEntityId, setSelectedEntityId] = useState('');

    const loadEntities = useCallback(async () => {
        try {
            setLoading(true);

            // Get all links for this character
            const links = await ClientAPI.getLinksFor({ type: EntityType.CHARACTER, id: characterId });

            // Filter for legal entity links
            const entityLinks = links.filter((l: Link) =>
                (l.linkType === LinkType.CHARACTER_BUSINESS) &&
                (l.source.type === EntityType.CHARACTER && l.source.id === characterId)
            );

            // Get entity IDs from Links
            const entityIds = new Set<string>();
            entityLinks.forEach((link: Link) => {
                if (link.target.type === EntityType.BUSINESS) {
                    entityIds.add(link.target.id);
                }
            });

            // Fetch all entities for options and filtering
            const allEntities = await ClientAPI.getBusinesses();
            setAllEntityOptions(allEntities);

            // Union of Linked Entities AND Entities where linkedCharacterId matches
            const myEntities = allEntities.filter((ent: Business) =>
                entityIds.has(ent.id) || ent.linkedCharacterId === characterId
            );
            setLinkedEntities(myEntities);

        } catch (error) {
            console.error('Failed to load legal entities:', error);
        } finally {
            setLoading(false);
        }
    }, [characterId]);

    useEffect(() => {
        if (open) {
            loadEntities();
            setIsLinking(false);
            setSelectedEntityId('');
            setEditingEntity(undefined);
        }
    }, [open, loadEntities]);

    const handleLinkEntity = async () => {
        if (!selectedEntityId) return;
        try {
            // 1. Create Link: Character -> Legal Entity
            await ClientAPI.createLink({
                source: { type: EntityType.CHARACTER, id: characterId },
                target: { type: EntityType.BUSINESS, id: selectedEntityId },
                linkType: LinkType.CHARACTER_BUSINESS,
            });

            // 2. Sync linkedCharacterId (Primary Rep) in Entity
            const entityToUpdate = allEntityOptions.find(e => e.id === selectedEntityId);
            if (entityToUpdate && !entityToUpdate.linkedCharacterId) {
                // Only overwrite if it doesn't have a rep? Or overwrite always?
                // User said "A person could own multiple...".
                // I'll overwrite, assuming "I am taking ownership/representation".
                await ClientAPI.upsertBusiness({
                    ...entityToUpdate,
                    linkedCharacterId: characterId
                });
            }

            setIsLinking(false);
            setSelectedEntityId('');
            loadEntities();
        } catch (err) {
            console.error("Failed to link entity", err);
        }
    };

    const handleUnlinkEntity = async (entityId: string) => {
        try {
            // 1. Remove Link(s)
            const links = await ClientAPI.getLinksFor({ type: EntityType.CHARACTER, id: characterId });
            const linksToDelete = links.filter(l =>
                l.linkType === LinkType.CHARACTER_BUSINESS &&
                l.source.id === characterId &&
                l.target.id === entityId
            );

            for (const link of linksToDelete) {
                await ClientAPI.removeLink(link.id);
            }

            // 2. Clear linkedCharacterId if it matches current character
            const entity = linkedEntities.find(e => e.id === entityId);
            if (entity && entity.linkedCharacterId === characterId) {
                await ClientAPI.upsertBusiness({
                    ...entity,
                    linkedCharacterId: null // or undefined, check type
                });
            }

            loadEntities();
        } catch (err) {
            console.error("Failed to unlink entity", err);
        }
    };

    const handleSaveSuccess = async (entity: Business) => {
        try {
            await ClientAPI.upsertBusiness(entity);
            setIsEditModalOpen(false);
            setEditingEntity(undefined);
            loadEntities();
        } catch (error) {
            console.error("Failed to save entity", error);
        }
    };

    const handleEditClick = (entity: Business) => {
        setEditingEntity(entity);
        setIsEditModalOpen(true);
    };

    const handleCreateClick = () => {
        setEditingEntity(undefined);
        setIsEditModalOpen(true);
    };

    // Helper for Select options
    const getAvailableOptions = () => {
        // Exclude already linked
        const linkedIds = new Set(linkedEntities.map(e => e.id));
        const available = allEntityOptions.filter(e => !linkedIds.has(e.id));
        return createBusinessOptionsWithCategories(available);
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent
                className="max-w-3xl max-h-[80vh] flex flex-col"
                style={{ zIndex: getInteractiveSubModalZIndex() }}
            >
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <Building2 className="h-5 w-5" />
                        Businesses: {characterName}
                    </DialogTitle>
                </DialogHeader>

                <div className="flex-1 flex flex-col gap-4 overflow-hidden mt-2">
                    {/* Action Bar */}
                    <div className="flex flex-wrap gap-2">
                        {!isLinking ? (
                            <>
                                <Button variant="outline" size="sm" onClick={() => setIsLinking(true)}>
                                    <LinkIcon className="h-4 w-4 mr-2" /> Link Existing
                                </Button>
                                <Button variant="default" size="sm" onClick={handleCreateClick}>
                                    <Plus className="h-4 w-4 mr-2" /> New Business
                                </Button>
                            </>
                        ) : (
                            <div className="flex items-center gap-2 p-2 border rounded-lg bg-muted/20 w-full animate-in fade-in slide-in-from-top-1">
                                <SearchableSelect
                                    key={`business-select-${allEntityOptions.length}`}
                                    options={getAvailableOptions()}
                                    value={selectedEntityId}
                                    onValueChange={setSelectedEntityId}
                                    placeholder="Select entity to link..."
                                    autoGroupByCategory={true}
                                    className="w-[300px]"
                                />
                                <Button size="sm" onClick={handleLinkEntity} disabled={!selectedEntityId}>Link</Button>
                                <Button size="sm" variant="ghost" onClick={() => setIsLinking(false)}>Cancel</Button>
                            </div>
                        )}
                    </div>

                    <ScrollArea className="flex-1 min-h-[300px]">
                        {loading ? (
                            <div className="flex items-center justify-center h-32">
                                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                            </div>
                        ) : linkedEntities.length === 0 ? (
                            <div className="flex flex-col items-center justify-center h-48 text-muted-foreground border-2 border-dashed border-muted rounded-lg bg-slate-50 dark:bg-slate-900/20">
                                <Building2 className="h-12 w-12 mb-4 opacity-20" />
                                <p>No Businesses linked</p>
                                <p className="text-sm mt-1">Link an existing entity or create a new one.</p>
                            </div>
                        ) : (
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pb-2">
                                {linkedEntities.map((entity) => (
                                    <Card key={entity.id} className="hover:bg-accent/50 transition-colors group">
                                        <CardContent className="p-4">
                                            <div className="flex items-start justify-between">
                                                <div className="flex-1 min-w-0">
                                                    <div className="flex items-center gap-2 mb-2">
                                                        <div className="p-2 bg-indigo-100 dark:bg-indigo-900/30 rounded-md">
                                                            <Building2 className="h-4 w-4 text-indigo-700 dark:text-indigo-400" />
                                                        </div>
                                                        <div className="min-w-0">
                                                            <h4 className="font-semibold truncate">{entity.name}</h4>
                                                            <Badge variant="outline" className="text-[10px] h-5">
                                                                {entity.type}
                                                            </Badge>
                                                        </div>
                                                    </div>
                                                    {entity.taxId && (
                                                        <p className="text-xs text-muted-foreground mb-1">
                                                            Tax ID: {entity.taxId}
                                                        </p>
                                                    )}
                                                    <div className="flex items-center gap-2 mt-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                                        <Button
                                                            variant="outline"
                                                            size="sm"
                                                            className="h-7 text-xs"
                                                            onClick={() => handleEditClick(entity)}
                                                        >
                                                            Edit
                                                        </Button>
                                                        <Button
                                                            variant="ghost"
                                                            size="sm"
                                                            className="h-7 text-xs text-red-500 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-900/20"
                                                            onClick={() => handleUnlinkEntity(entity.id)}
                                                        >
                                                            <Trash2 className="h-3 w-3 mr-1" /> Unlink
                                                        </Button>
                                                    </div>
                                                </div>
                                            </div>
                                        </CardContent>
                                    </Card>
                                ))}
                            </div>
                        )}
                    </ScrollArea>
                </div>

                <DialogFooter className="mt-4">
                    <Button variant="outline" onClick={() => onOpenChange(false)}>
                        Close
                    </Button>
                </DialogFooter>
            </DialogContent>

            {/* Create/Edit Entity Submodal */}
            <BusinessSubmodal
                open={isEditModalOpen}
                onClose={() => setIsEditModalOpen(false)}
                onSave={handleSaveSuccess}
                initialData={editingEntity}
                defaultLinkedCharacterId={characterId}
            />
        </Dialog>
    );
}

