'use client';

import { useEffect, useState, useCallback } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Character, Link } from '@/types/entities';
import { Search, User, X, Plus, Crown } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { ClientAPI } from '@/lib/client-api';
import { EntityType, LinkType } from '@/types/enums';

interface OwnerModalProps {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  entityType: EntityType;
  entityId: string;
  entityName: string;
  linkType: LinkType.SITE_CHARACTER | LinkType.ITEM_CHARACTER;
  currentPrimaryOwnerId?: string | null;
  onPrimaryOwnerChanged?: (characterId: string | null, characterName?: string) => void;
  onAdditionalOwnersChanged?: () => void;
}

export default function OwnerSubmodal({
  open,
  onOpenChange,
  entityType,
  entityId,
  entityName,
  linkType,
  currentPrimaryOwnerId,
  onPrimaryOwnerChanged,
  onAdditionalOwnersChanged
}: OwnerModalProps) {
  const [characters, setCharacters] = useState<Character[]>([]);
  const [currentAdditionalOwners, setCurrentAdditionalOwners] = useState<Character[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState<'primary' | 'additional'>('primary');

  const loadData = useCallback(async () => {
    try {
      setLoading(true);

      // Load all characters
      const allCharacters = await ClientAPI.getCharacters();
      const activeCharacters = allCharacters.filter((c: Character) => c.isActive);
      setCharacters(activeCharacters);

      // Load current additional owners from links
      const links = await ClientAPI.getLinksFor({ type: entityType, id: entityId });
      const ownerLinks = links.filter((l: Link) => l.linkType === linkType);

      // Get character IDs from links (check both source and target)
      const ownerIds = new Set<string>();
      ownerLinks.forEach((link: Link) => {
        if (link.source.type === entityType && link.source.id === entityId) {
          ownerIds.add(link.target.id);
        } else if (link.target.type === entityType && link.target.id === entityId) {
          ownerIds.add(link.source.id);
        }
      });

      // Fetch character details for owners (exclude primary owner)
      const additionalOwners = activeCharacters.filter((c: Character) =>
        ownerIds.has(c.id) && c.id !== currentPrimaryOwnerId
      );
      setCurrentAdditionalOwners(additionalOwners);
    } catch (error) {
      console.error('Failed to load data:', error);
    } finally {
      setLoading(false);
    }
  }, [entityType, entityId, currentPrimaryOwnerId, linkType]);

  // Load data when modal opens
  useEffect(() => {
    if (open) {
      loadData();
    }
  }, [open, loadData]);

  // Filter characters based on search term
  const currentOwnerIds = new Set([
    ...(currentPrimaryOwnerId ? [currentPrimaryOwnerId] : []),
    ...currentAdditionalOwners.map(c => c.id)
  ]);

  const filteredCharacters = characters.filter((c: Character) => {
    const matchesSearch = c.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.contactEmail?.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesSearch;
  });

  // For primary owner tab - filter out current additional owners
  const primaryOwnerFilteredCharacters = filteredCharacters.filter(c =>
    !currentAdditionalOwners.some(owner => owner.id === c.id)
  );

  // For additional owners tab - filter out current primary owner
  const additionalOwnerFilteredCharacters = filteredCharacters.filter(c =>
    c.id !== currentPrimaryOwnerId && !currentAdditionalOwners.some(owner => owner.id === c.id)
  );

  const handlePrimaryOwnerSelect = () => {
    if (onPrimaryOwnerChanged) {
      const selectedCharacter = characters.find(c => c.id === selectedId);
      onPrimaryOwnerChanged(selectedId, selectedCharacter?.name);
    }
    onOpenChange(false);
  };

  const handlePrimaryOwnerRemove = () => {
    if (onPrimaryOwnerChanged) {
      onPrimaryOwnerChanged(null, undefined);
    }
    onOpenChange(false);
  };

  const handleAddAdditionalOwner = async () => {
    if (!selectedId || currentOwnerIds.has(selectedId)) return;

    try {
      setSaving(true);

      // Create link based on canonical direction
      const link = {
        id: crypto.randomUUID(),
        linkType: linkType,
        source: { type: entityType, id: entityId },
        target: { type: EntityType.CHARACTER, id: selectedId },
        createdAt: new Date().toISOString()
      };

      await ClientAPI.createLink(link);

      // Reload data
      await loadData();
      setSelectedId(null);
      setSearchTerm('');

      if (onAdditionalOwnersChanged) {
        onAdditionalOwnersChanged();
      }
    } catch (error) {
      console.error('Failed to add owner:', error);
      alert('Failed to add owner. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const handleRemoveAdditionalOwner = async (characterId: string) => {
    try {
      setSaving(true);

      // Find the link to remove
      const links = await ClientAPI.getLinksFor({ type: entityType, id: entityId });
      const ownerLink = links.find((l: Link) => {
        if (l.linkType !== linkType) return false;
        // Check both directions (canonical and reverse)
        const isCanonical = l.source.type === entityType && l.source.id === entityId &&
                           l.target.type === EntityType.CHARACTER && l.target.id === characterId;
        const isReverse = l.target.type === entityType && l.target.id === entityId &&
                         l.source.type === EntityType.CHARACTER && l.source.id === characterId;
        return isCanonical || isReverse;
      });

      if (ownerLink) {
        await ClientAPI.removeLink(ownerLink.id);

        // Reload data
        await loadData();

        if (onAdditionalOwnersChanged) {
          onAdditionalOwnersChanged();
        }
      }
    } catch (error) {
      console.error('Failed to remove owner:', error);
      alert('Failed to remove owner. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const renderCharacterCard = (character: Character, isSelected: boolean, showSelect: boolean = true) => (
    <button
      key={character.id}
      onClick={() => showSelect && setSelectedId(character.id)}
      className={`
        w-full p-3 rounded-lg border-2 transition-all text-left
        hover:border-primary/50 hover:bg-accent/50
        ${isSelected
          ? 'border-primary bg-accent'
          : showSelect ? 'border-border bg-card' : 'border-border bg-card'
        }
        ${!showSelect ? 'cursor-default' : ''}
      `}
      disabled={!showSelect}
    >
      <div className="flex items-start justify-between">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <p className="font-medium truncate">{character.name}</p>
            {character.id === currentPrimaryOwnerId && (
              <Badge variant="default" className="text-xs">
                <Crown className="h-3 w-3 mr-1" />
                Primary
              </Badge>
            )}
          </div>

          {character.description && (
            <p className="text-sm text-muted-foreground line-clamp-1 mb-2">
              {character.description}
            </p>
          )}

          <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
            {character.roles && character.roles.length > 0 && (
              <Badge variant="secondary" className="text-xs">
                {character.roles[0]}
              </Badge>
            )}

            {character.contactEmail && (
              <span className="truncate max-w-[200px]">
                {character.contactEmail}
              </span>
            )}
          </div>
        </div>

        {isSelected && showSelect && (
          <div className="ml-2 flex-shrink-0">
            <div className="h-5 w-5 rounded-full bg-primary flex items-center justify-center">
              <div className="h-2 w-2 rounded-full bg-primary-foreground" />
            </div>
          </div>
        )}
      </div>
    </button>
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        zIndexLayer={'SUB_MODALS'}
        className="max-w-4xl max-h-[80vh]"
      >
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <User className="h-5 w-5" />
            Manage Owners: {entityName}
          </DialogTitle>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as 'primary' | 'additional')}>
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="primary" className="flex items-center gap-2">
              <Crown className="h-4 w-4" />
              Primary Owner
            </TabsTrigger>
            <TabsTrigger value="additional" className="flex items-center gap-2">
              <Plus className="h-4 w-4" />
              Additional Owners
            </TabsTrigger>
          </TabsList>

          <TabsContent value="primary" className="space-y-4">
            {/* Search Bar */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search characters..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>

            {/* Characters List */}
            <ScrollArea className="h-[400px] pr-4">
              {loading ? (
                <div className="flex items-center justify-center h-32 text-muted-foreground">
                  Loading characters...
                </div>
              ) : primaryOwnerFilteredCharacters.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-32 text-muted-foreground">
                  <User className="h-8 w-8 mb-2 opacity-50" />
                  <p>{searchTerm ? 'No characters found' : 'No characters available'}</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {/* Current Primary Owner */}
                  {currentPrimaryOwnerId && (() => {
                    const currentOwner = characters.find(c => c.id === currentPrimaryOwnerId);
                    return currentOwner ? (
                      <div className="mb-4">
                        <h4 className="text-sm font-semibold mb-2">Current Primary Owner</h4>
                        {renderCharacterCard(currentOwner, false, false)}
                      </div>
                    ) : null;
                  })()}

                  {/* Available Characters */}
                  <div>
                    <h4 className="text-sm font-semibold mb-2">
                      {currentPrimaryOwnerId ? 'Change Primary Owner' : 'Select Primary Owner'}
                    </h4>
                    <div className="space-y-2">
                      {primaryOwnerFilteredCharacters.map((character) =>
                        renderCharacterCard(character, selectedId === character.id, true)
                      )}
                    </div>
                  </div>
                </div>
              )}
            </ScrollArea>
          </TabsContent>

          <TabsContent value="additional" className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              {/* Current Additional Owners */}
              <div>
                <h3 className="text-sm font-semibold mb-2">Current Additional Owners ({currentAdditionalOwners.length})</h3>
                <ScrollArea className="h-[350px] border rounded-md p-2">
                  {loading ? (
                    <div className="flex items-center justify-center h-32 text-muted-foreground">
                      Loading...
                    </div>
                  ) : currentAdditionalOwners.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-32 text-muted-foreground">
                      <User className="h-8 w-8 mb-2 opacity-50" />
                      <p className="text-sm">No additional owners</p>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {currentAdditionalOwners.map((character) => (
                        <div
                          key={character.id}
                          className="flex items-center justify-between p-3 border rounded-lg hover:bg-accent/50 transition-colors"
                        >
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                              <p className="font-medium truncate">{character.name}</p>
                            </div>
                            {character.description && (
                              <p className="text-xs text-muted-foreground line-clamp-1 mb-1">
                                {character.description}
                              </p>
                            )}
                            {character.roles && character.roles.length > 0 && (
                              <Badge variant="secondary" className="text-xs">
                                {character.roles[0]}
                              </Badge>
                            )}
                          </div>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleRemoveAdditionalOwner(character.id)}
                            disabled={saving}
                            className="h-8 w-8 p-0 text-destructive hover:text-destructive"
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  )}
                </ScrollArea>
              </div>

              {/* Add Owner */}
              <div>
                <h3 className="text-sm font-semibold mb-2">Add Additional Owner</h3>

                {/* Search Bar */}
                <div className="relative mb-2">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search characters..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                  />
                </div>

                {/* Characters List */}
                <ScrollArea className="h-[300px] border rounded-md p-2">
                  {loading ? (
                    <div className="flex items-center justify-center h-32 text-muted-foreground">
                      Loading characters...
                    </div>
                  ) : additionalOwnerFilteredCharacters.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-32 text-muted-foreground">
                      <User className="h-8 w-8 mb-2 opacity-50" />
                      <p className="text-sm">{searchTerm ? 'No characters found' : 'No characters available'}</p>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {additionalOwnerFilteredCharacters.map((character) =>
                        renderCharacterCard(character, selectedId === character.id, true)
                      )}
                    </div>
                  )}
                </ScrollArea>

                {/* Add Button */}
                <div className="mt-2">
                  <Button
                    onClick={handleAddAdditionalOwner}
                    disabled={!selectedId || saving || currentOwnerIds.has(selectedId)}
                    className="w-full"
                    size="sm"
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Add Owner
                  </Button>
                </div>
              </div>
            </div>
          </TabsContent>
        </Tabs>

        {/* Footer */}
        <DialogFooter className="flex justify-between items-center">
          {activeTab === 'primary' && (
            <>
              <div className="flex gap-2">
                {currentPrimaryOwnerId && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handlePrimaryOwnerRemove}
                    className="flex items-center gap-2 text-red-600 hover:text-red-700 hover:bg-red-50"
                  >
                    <X className="h-3 w-3" />
                    Remove Primary Owner
                  </Button>
                )}
              </div>

              <div className="flex gap-2">
                <Button
                  variant="outline"
                  onClick={() => onOpenChange(false)}
                >
                  Cancel
                </Button>
                <Button
                  onClick={handlePrimaryOwnerSelect}
                  disabled={!selectedId || selectedId === currentPrimaryOwnerId}
                >
                  {currentPrimaryOwnerId ? 'Change Primary Owner' : 'Set Primary Owner'}
                </Button>
              </div>
            </>
          )}

          {activeTab === 'additional' && (
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Close
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

