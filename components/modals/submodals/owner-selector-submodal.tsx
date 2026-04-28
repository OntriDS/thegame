'use client';

import { useEffect, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Character } from '@/types/entities';
import { CharacterRole, TaskStatus } from '@/types/enums';
import { Search, User, X, CheckCircle2, UserMinus } from 'lucide-react';

interface OwnerSelectorModalProps {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onSelect: (characterId: string | null) => void;
  currentOwnerId?: string | null;
}

const ALLOWED_OWNER_ROLES = [
  CharacterRole.FOUNDER,
  CharacterRole.TEAM,
  CharacterRole.APPRENTICE,
  CharacterRole.COLLABORATOR,
  CharacterRole.PARTNER,
];

const STORAGE_KEY = 'owner-selector-active-roles';

export default function OwnerSelectorModal({ 
  open, 
  onOpenChange, 
  onSelect, 
  currentOwnerId
}: OwnerSelectorModalProps) {
  const [characters, setCharacters] = useState<Character[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedId, setSelectedId] = useState<string | null>(currentOwnerId || null);
  const [activeRoles, setActiveRoles] = useState<CharacterRole[]>([]);
  const [loading, setLoading] = useState(true);

  // Load initial roles and characters
  useEffect(() => {
    // Load from localStorage
    const savedRoles = localStorage.getItem(STORAGE_KEY);
    if (savedRoles) {
      try {
        setActiveRoles(JSON.parse(savedRoles));
      } catch (e) {
        setActiveRoles(ALLOWED_OWNER_ROLES);
      }
    } else {
      setActiveRoles(ALLOWED_OWNER_ROLES);
    }
  }, []);

  // Sync activeRoles to localStorage
  useEffect(() => {
    if (activeRoles.length > 0) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(activeRoles));
    }
  }, [activeRoles]);

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
      
      // Filter characters that have at least one allowed role and are active
      const ownerCharacters = allCharacters.filter((c: Character) => {
        if (!c.isActive || !c.roles) return false;
        return c.roles.some((role) => ALLOWED_OWNER_ROLES.includes(role));
      });
      
      setCharacters(ownerCharacters);
    } catch (error) {
      console.error('Failed to load owner characters:', error);
    } finally {
      setLoading(false);
    }
  };

  const toggleRole = (role: CharacterRole) => {
    setActiveRoles(prev => 
      prev.includes(role) 
        ? prev.filter(r => r !== role) 
        : [...prev, role]
    );
  };

  // Filter characters based on search term AND active roles
  const filteredCharacters = characters.filter((c: Character) => {
    // Role filter
    const hasActiveRole = c.roles?.some(role => activeRoles.includes(role));
    if (!hasActiveRole) return false;

    // Search filter
    const matchesSearch = c.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.contactEmail?.toLowerCase().includes(searchTerm.toLowerCase());
    
    return matchesSearch;
  }).sort((a, b) => {
    // 1. Put selected character on top
    if (a.id === selectedId) return -1;
    if (b.id === selectedId) return 1;

    // 2. Sort by role priority
    const getMinRoleIndex = (c: Character) => {
      if (!c.roles) return Infinity;
      const indices = c.roles
        .map(role => ALLOWED_OWNER_ROLES.indexOf(role))
        .filter(index => index !== -1);
      return indices.length > 0 ? Math.min(...indices) : Infinity;
    };

    const indexA = getMinRoleIndex(a);
    const indexB = getMinRoleIndex(b);

    if (indexA !== indexB) {
      return indexA - indexB;
    }
    
    // 3. Secondary sort by name
    return a.name.localeCompare(b.name);
  });

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
      <DialogContent zIndexLayer={'SUB_MODALS'} className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <User className="h-4 w-4" />
            Select Task Owner
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search team members..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 h-9"
            />
          </div>

          {/* Role Filter Buttons */}
          <div className="flex flex-wrap gap-2 pt-1">
            {ALLOWED_OWNER_ROLES.map((role) => {
              const isActive = activeRoles.includes(role);
              return (
                <Badge
                  key={role}
                  variant={isActive ? "default" : "outline"}
                  className={`cursor-pointer capitalize text-[10px] px-2 py-0.5 transition-all ${
                    isActive ? 'opacity-100 scale-105' : 'opacity-60 grayscale'
                  }`}
                  onClick={() => toggleRole(role)}
                >
                  {role.toLowerCase()}
                </Badge>
              );
            })}
          </div>

          {/* Character List */}
          <ScrollArea className="h-64 border rounded-md">
            {loading ? (
              <div className="flex items-center justify-center py-8">
                <div className="text-sm text-muted-foreground">Loading...</div>
              </div>
            ) : filteredCharacters.length === 0 ? (
              <div className="flex items-center justify-center py-8">
                <div className="text-sm text-muted-foreground">
                  {searchTerm ? 'No team members found.' : 'No team members match selected roles.'}
                </div>
              </div>
            ) : (
              <div className="divide-y">
                {/* Special "No Owner" Option */}
                <div
                  className={`p-3 cursor-pointer transition-all relative ${
                    selectedId === null
                      ? 'bg-emerald-500/10 border-l-4 border-l-emerald-500'
                      : 'hover:bg-muted'
                  }`}
                  onClick={() => setSelectedId(null)}
                >
                  <div className="flex items-center gap-3">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${
                      selectedId === null ? 'bg-emerald-500 text-white' : 'bg-destructive/10 text-destructive'
                    }`}>
                      {selectedId === null ? (
                        <CheckCircle2 className="h-4 w-4" />
                      ) : (
                        <UserMinus className="h-4 w-4" />
                      )}
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center justify-between">
                        <div className="font-bold text-sm text-destructive">No Owner / Unassigned</div>
                        {selectedId === null && (
                          <Badge variant="default" className="bg-emerald-500 hover:bg-emerald-500 h-4 text-[9px] px-1.5 font-bold uppercase">
                            Selected
                          </Badge>
                        )}
                      </div>
                      <div className="text-[10px] text-muted-foreground mt-0.5">
                        Task will have no assigned owner
                      </div>
                    </div>
                  </div>
                </div>

                {filteredCharacters.map((character) => (
                  <div
                    key={character.id}
                    className={`p-3 cursor-pointer transition-all relative ${
                      selectedId === character.id
                        ? 'bg-emerald-500/10 border-l-4 border-l-emerald-500'
                        : 'hover:bg-muted'
                    }`}
                    onClick={() => setSelectedId(selectedId === character.id ? null : character.id)}
                  >
                    <div className="flex items-center gap-3">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${
                        selectedId === character.id ? 'bg-emerald-500 text-white' : 'bg-primary/10 text-primary'
                      }`}>
                        {selectedId === character.id ? (
                          <CheckCircle2 className="h-4 w-4" />
                        ) : (
                          <User className="h-4 w-4" />
                        )}
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center justify-between">
                          <div className="font-bold text-sm">{character.name}</div>
                          {selectedId === character.id && (
                            <Badge variant="default" className="bg-emerald-500 hover:bg-emerald-500 h-4 text-[9px] px-1.5 font-bold uppercase">
                              Selected
                            </Badge>
                          )}
                        </div>
                        <div className="flex gap-1 mt-0.5">
                          {character.roles?.filter(r => ALLOWED_OWNER_ROLES.includes(r)).map(r => (
                            <span key={r} className="text-[9px] uppercase tracking-wider text-muted-foreground font-semibold">
                              {r}
                            </span>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </ScrollArea>
        </div>

        <DialogFooter className="flex items-center justify-end mt-4">
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
              className="h-8 text-xs px-4 bg-emerald-600 hover:bg-emerald-700 text-white font-bold"
            >
              Assign
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
