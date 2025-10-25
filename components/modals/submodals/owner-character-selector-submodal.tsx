'use client';

import { useEffect, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Character } from '@/types/entities';
import { Search, User, X } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { getZIndexClass } from '@/lib/utils/z-index-utils';

interface CharacterSelectorModalProps {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onSelect: (characterId: string | null) => void;
  currentOwnerId?: string | null;
}

export default function CharacterSelectorModal({ open, onOpenChange, onSelect, currentOwnerId }: CharacterSelectorModalProps) {
  const [characters, setCharacters] = useState<Character[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedId, setSelectedId] = useState<string | null>(currentOwnerId || null);
  const [loading, setLoading] = useState(true);

  // Load characters when modal opens
  useEffect(() => {
    if (open) {
      loadCharacters();
      setSelectedId(currentOwnerId || null);
    }
  }, [open, currentOwnerId]);

  const loadCharacters = async () => {
    try {
      setLoading(true);
      
      const { ClientAPI } = await import('@/lib/client-api');
      const allCharacters = await ClientAPI.getCharacters();
      
      // Filter only active characters
      const activeCharacters = allCharacters.filter((c: Character) => c.isActive);
      
      setCharacters(activeCharacters);
    } catch (error) {
      console.error('Failed to load characters:', error);
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
      <DialogContent zIndexLayer={'SUB_MODALS'} className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <User className="h-5 w-5" />
            Select Item Owner
          </DialogTitle>
        </DialogHeader>

        {/* Search Bar */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by name, email, or description..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
            autoFocus
          />
        </div>

        {/* Characters List */}
        <ScrollArea className="h-[400px] pr-4">
          {loading ? (
            <div className="flex items-center justify-center h-32 text-muted-foreground">
              Loading characters...
            </div>
          ) : filteredCharacters.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-32 text-muted-foreground">
              <User className="h-8 w-8 mb-2 opacity-50" />
              <p>{searchTerm ? 'No characters found' : 'No characters available'}</p>
            </div>
          ) : (
            <div className="space-y-2">
              {filteredCharacters.map((character) => {
                const isSelected = selectedId === character.id;
                const isCurrent = currentOwnerId === character.id;
                
                return (
                  <button
                    key={character.id}
                    onClick={() => setSelectedId(character.id)}
                    className={`
                      w-full p-4 rounded-lg border-2 transition-all text-left
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
                          {isCurrent && (
                            <Badge variant="outline" className="text-xs">
                              Current Owner
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
                            <span className="flex items-center gap-1">
                              <Badge variant="secondary" className="text-xs">
                                {character.roles[0]}
                              </Badge>
                              {character.roles.length > 1 && (
                                <span className="text-muted-foreground">
                                  +{character.roles.length - 1}
                                </span>
                              )}
                            </span>
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
              })}
            </div>
          )}
        </ScrollArea>

        {/* Footer */}
        <DialogFooter className="flex justify-between items-center">
          <div className="flex gap-2">
            {currentOwnerId && (
              <Button
                variant="outline"
                size="sm"
                onClick={handleRemove}
                className="flex items-center gap-2 text-red-600 hover:text-red-700 hover:bg-red-50"
              >
                <X className="h-3 w-3" />
                Remove Owner
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
              onClick={handleSelect}
              disabled={!selectedId || selectedId === currentOwnerId}
            >
              Set Owner
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

