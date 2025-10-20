'use client';

import { useEffect, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Character } from '@/types/entities';
import { CharacterRole } from '@/types/enums';
import { Search, User, X } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { getZIndexClass } from '@/lib/utils/z-index-utils';
import { CHARACTER_ONE_ID } from '@/lib/constants/entity-constants';

interface PlayerCharacterSelectorModalProps {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onSelect: (characterId: string | null) => void;
  currentPlayerCharacterId?: string | null;
}

export default function PlayerCharacterSelectorModal({ 
  open, 
  onOpenChange, 
  onSelect, 
  currentPlayerCharacterId 
}: PlayerCharacterSelectorModalProps) {
  const [characters, setCharacters] = useState<Character[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedId, setSelectedId] = useState<string | null>(currentPlayerCharacterId || CHARACTER_ONE_ID);
  const [loading, setLoading] = useState(true);

  // Load characters when modal opens
  useEffect(() => {
    if (open) {
      loadCharacters();
      setSelectedId(currentPlayerCharacterId || CHARACTER_ONE_ID);
    }
  }, [open, currentPlayerCharacterId]);

  const loadCharacters = async () => {
    try {
      setLoading(true);
      const { ClientAPI } = await import('@/lib/client-api');
      const allCharacters = await ClientAPI.getCharacters();
      
      // Filter only characters with PLAYER role
      const playerCharacters = allCharacters.filter((c: Character) => 
        c.isActive && c.roles?.includes(CharacterRole.PLAYER)
      );
      
      setCharacters(playerCharacters);
    } catch (error) {
      console.error('Failed to load player characters:', error);
    } finally {
      setLoading(false);
    }
  };

  // Filter characters based on search term
  const filteredCharacters = characters.filter((c: Character) => 
    c.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    c.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    c.contactEmail?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleSelect = () => {
    onSelect(selectedId);
    onOpenChange(false);
  };

  const handleRemove = () => {
    onSelect(null);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className={`max-w-md ${getZIndexClass('MODALS')}`}>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <User className="h-4 w-4" />
            Select Player Character
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search player characters..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>

          {/* Character List */}
          <ScrollArea className="h-64">
            {loading ? (
              <div className="flex items-center justify-center py-8">
                <div className="text-sm text-muted-foreground">Loading player characters...</div>
              </div>
            ) : filteredCharacters.length === 0 ? (
              <div className="flex items-center justify-center py-8">
                <div className="text-sm text-muted-foreground">
                  {searchTerm ? 'No player characters found matching your search.' : 'No player characters available.'}
                </div>
              </div>
            ) : (
              <div className="space-y-2">
                {filteredCharacters.map((character) => (
                  <div
                    key={character.id}
                    className={`p-3 rounded-lg border cursor-pointer transition-colors ${
                      selectedId === character.id
                        ? 'border-primary bg-primary/5'
                        : 'border-border hover:bg-muted'
                    }`}
                    onClick={() => setSelectedId(character.id)}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                          <User className="h-4 w-4 text-primary" />
                        </div>
                        <div>
                          <div className="font-medium text-sm">{character.name}</div>
                          {character.description && (
                            <div className="text-xs text-muted-foreground">{character.description}</div>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {character.roles?.map((role) => (
                          <Badge key={role} variant="secondary" className="text-xs">
                            {role}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </ScrollArea>
        </div>

        <DialogFooter className="flex items-center justify-between">
          <Button
            variant="outline"
            onClick={handleRemove}
            className="h-8 text-xs"
          >
            <X className="h-3 w-3 mr-1" />
            Remove
          </Button>
          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={() => onOpenChange(false)}
              className="h-8 text-xs"
            >
              Cancel
            </Button>
            <Button
              onClick={handleSelect}
              className="h-8 text-xs"
              disabled={!selectedId}
            >
              Select
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
