'use client';

import { useEffect, useState, useCallback } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Character, Link } from '@/types/entities';
import { Search, User, X, Plus } from 'lucide-react';
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
  onOwnersChanged?: () => void;
}

export default function OwnerSubmodal({
  open,
  onOpenChange,
  entityType,
  entityId,
  entityName,
  linkType,
  onOwnersChanged
}: OwnerModalProps) {
  const [characters, setCharacters] = useState<Character[]>([]);
  const [owners, setOwners] = useState<Character[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedOwnerId, setSelectedOwnerId] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const loadData = useCallback(async () => {
    try {
      setLoading(true);

      // Load all active characters
      const allCharacters = await ClientAPI.getCharacters();
      const activeCharacters = allCharacters.filter((c: Character) => c.isActive);
      setCharacters(activeCharacters);

      // Load ALL owners from links (no primary/additional distinction)
      const links = await ClientAPI.getLinksFor({ type: entityType, id: entityId });
      const ownerLinks = links.filter((l: Link) => l.linkType === linkType);

      // Get character IDs from links (check both directions for bidirectional query support)
      const ownerIds = new Set<string>();
      ownerLinks.forEach((link: Link) => {
        if (link.source.type === entityType && link.source.id === entityId) {
          ownerIds.add(link.target.id);
        } else if (link.target.type === entityType && link.target.id === entityId) {
          ownerIds.add(link.source.id);
        }
      });

      // Get all owners
      const currentOwners = activeCharacters.filter((c: Character) => ownerIds.has(c.id));
      setOwners(currentOwners);
    } catch (error) {
      console.error('Failed to load data:', error);
    } finally {
      setLoading(false);
    }
  }, [entityType, entityId, linkType]);

  // Load data when modal opens
  useEffect(() => {
    if (open) {
      loadData();
    }
  }, [open, loadData]);

  // Filter characters for selection (exclude current owners)
  const currentOwnerIds = new Set(owners.map(o => o.id));
  const availableCharacters = characters.filter((c: Character) => {
    const matchesSearch = c.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.contactEmail?.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesSearch && !currentOwnerIds.has(c.id);
  });

  const handleAddOwner = async () => {
    if (!selectedOwnerId || currentOwnerIds.has(selectedOwnerId)) return;

    try {
      setSaving(true);

      // Create link in canonical direction
      const link = {
        id: crypto.randomUUID(),
        linkType: linkType,
        source: { type: entityType, id: entityId },
        target: { type: EntityType.CHARACTER, id: selectedOwnerId },
        createdAt: new Date().toISOString()
      };

      await ClientAPI.createLink(link);

      // Reload data
      await loadData();
      setSelectedOwnerId('');
      setSearchTerm('');

      if (onOwnersChanged) {
        onOwnersChanged();
      }
    } catch (error) {
      console.error('Failed to add owner:', error);
      alert('Failed to add owner. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const handleRemoveOwner = async (characterId: string) => {
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

        if (onOwnersChanged) {
          onOwnersChanged();
        }
      }
    } catch (error) {
      console.error('Failed to remove owner:', error);
      alert('Failed to remove owner. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const renderOwnerCard = (character: Character) => (
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
        onClick={() => handleRemoveOwner(character.id)}
        disabled={saving}
        className="h-8 w-8 p-0 text-destructive hover:text-destructive ml-2"
      >
        <X className="h-4 w-4" />
      </Button>
    </div>
  );

  const renderCharacterCard = (character: Character, isSelected: boolean) => (
    <button
      key={character.id}
      onClick={() => setSelectedOwnerId(character.id)}
      className={`
        w-full p-3 rounded-lg border-2 transition-all text-left
        hover:border-primary/50 hover:bg-accent/50
        ${isSelected
          ? 'border-primary bg-accent'
          : 'border-border bg-card'
        }
      `}
    >
      <div className="flex items-start justify-between">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <p className="font-medium truncate">{character.name}</p>
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

        {isSelected && (
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

        <div className="grid grid-cols-2 gap-4">
          {/* Left: Current Owners */}
          <div>
            <h3 className="text-sm font-semibold mb-2">Current Owners ({owners.length})</h3>
            <ScrollArea className="h-[350px] border rounded-md p-2">
              {loading ? (
                <div className="flex items-center justify-center h-32 text-muted-foreground">
                  Loading...
                </div>
              ) : owners.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-32 text-muted-foreground">
                  <User className="h-8 w-8 mb-2 opacity-50" />
                  <p className="text-sm">No owners</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {owners.map((character) => renderOwnerCard(character))}
                </div>
              )}
            </ScrollArea>
          </div>

          {/* Right: Add Owner */}
          <div>
            <h3 className="text-sm font-semibold mb-2">Add Owner</h3>

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
              ) : availableCharacters.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-32 text-muted-foreground">
                  <User className="h-8 w-8 mb-2 opacity-50" />
                  <p className="text-sm">{searchTerm ? 'No characters found' : 'No characters available'}</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {availableCharacters.map((character) =>
                    renderCharacterCard(character, selectedOwnerId === character.id)
                  )}
                </div>
              )}
            </ScrollArea>

            {/* Add Button */}
            <div className="mt-2">
              <Button
                onClick={handleAddOwner}
                disabled={!selectedOwnerId || saving}
                className="w-full"
                size="sm"
              >
                <Plus className="h-4 w-4 mr-2" />
                Add Owner
              </Button>
            </div>
          </div>
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
