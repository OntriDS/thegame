'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ClientAPI } from '@/lib/client-api';
import { useEntityUpdates } from '@/lib/hooks/use-entity-updates';
import { useKeyboardShortcuts } from '@/lib/hooks/use-keyboard-shortcuts';
import CharacterModal from '@/components/modals/character-modal';
import type { Character } from '@/types/entities';
import { CharacterRole, CHARACTER_ROLE_TYPES } from '@/types/enums';
import { ROLE_COLORS } from '@/lib/constants/color-constants';
import { Plus, User, Mail, Phone } from 'lucide-react';

export default function PersonasPage() {
  const [showCharacterModal, setShowCharacterModal] = useState(false);
  const [selectedCharacter, setSelectedCharacter] = useState<Character | null>(null);
  const [characters, setCharacters] = useState<Character[]>([]);
  const [roleFilter, setRoleFilter] = useState<CharacterRole | 'ALL'>('ALL');
  const [isHydrated, setIsHydrated] = useState(false);

  const isLoadingRef = useRef(false);
  const lastRefreshRef = useRef(0);

  useKeyboardShortcuts({
    onOpenCharacterModal: () => setShowCharacterModal(true),
  });

  const loadCharacters = useCallback(async () => {
    if (isLoadingRef.current) return;
    isLoadingRef.current = true;
    try {
      const charactersData = await ClientAPI.getCharacters();
      setCharacters(charactersData || []);
      setIsHydrated(true);
    } catch (error) {
      console.error('[Personas Section] Failed to load personas:', error);
    } finally {
      isLoadingRef.current = false;
      lastRefreshRef.current = Date.now();
    }
  }, []);

  useEffect(() => {
    loadCharacters();
  }, [loadCharacters]);

  const handleUpdate = useCallback(() => {
    const now = Date.now();
    if (isLoadingRef.current) return;
    if (now - lastRefreshRef.current < 1000) return;
    loadCharacters();
  }, [loadCharacters]);

  useEntityUpdates('character', handleUpdate);

  const handleCharacterSave = useCallback(async (character: Character) => {
    try {
      await ClientAPI.upsertCharacter(character);
      setShowCharacterModal(false);
      setSelectedCharacter(null);
      await loadCharacters();
    } catch (error) {
      console.error('Failed to save persona:', error);
      alert('Failed to save persona');
    }
  }, [loadCharacters]);

  const handleCreateCharacter = useCallback(() => {
    setSelectedCharacter(null);
    setShowCharacterModal(true);
  }, []);

  const handleEditCharacter = useCallback((character: Character) => {
    setSelectedCharacter(character);
    setShowCharacterModal(true);
  }, []);

  const existingRoles = useMemo(
    () => Array.from(new Set(characters.flatMap((char) => char.roles))),
    [characters],
  );

  const filteredCharacters = useMemo(() => {
    if (roleFilter === 'ALL') return characters;
    return characters.filter((char) => char.roles.includes(roleFilter));
  }, [characters, roleFilter]);

  if (!isHydrated) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold">Personas</h1>
          <Button onClick={handleCreateCharacter} size="sm" variant="default" className="flex items-center gap-2">
            <Plus className="h-4 w-4" />
            Add Persona
          </Button>
        </div>
        <div className="flex items-center justify-center h-64">
          <div className="text-muted-foreground">Loading personas...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h1 className="text-3xl font-bold">Personas</h1>
        <div className="flex items-center gap-2">
          <select
            className="h-8 rounded-md border border-input bg-background px-3 text-sm"
            value={roleFilter}
            onChange={(event) => setRoleFilter(event.target.value as CharacterRole | 'ALL')}
          >
            <option value="ALL">All Roles ({characters.length})</option>
            {existingRoles.map((role) => {
              const count = characters.filter((c) => c.roles.includes(role)).length;
              return (
                <option key={role} value={role}>
                  {role} ({count})
                </option>
              );
            })}
          </select>
          <Button onClick={handleCreateCharacter} size="sm" variant="default" className="flex items-center gap-2">
            <Plus className="h-4 w-4" />
            Add Persona
          </Button>
        </div>
      </div>

      <Card>
        <CardContent>
          {filteredCharacters.length === 0 ? (
            <div className="text-center text-muted-foreground py-8">
              {roleFilter === 'ALL'
                ? 'No personas yet. Create the first one!'
                : `No personas with ${roleFilter} role.`}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredCharacters.map((character) => {
                const getRoleColor = (role: CharacterRole): string => {
                  const roleKey = role.toUpperCase() as keyof typeof ROLE_COLORS;
                  return ROLE_COLORS[roleKey] || ROLE_COLORS.CUSTOMER;
                };

                const isSpecialRole = (role: CharacterRole) =>
                  CHARACTER_ROLE_TYPES.SPECIAL.includes(role as any);

                const specialRoles = character.roles.filter(isSpecialRole);
                const regularRoles = character.roles.filter((role) => !isSpecialRole(role));

                return (
                  <Card
                    key={character.id}
                    className="cursor-pointer hover:shadow-lg hover:border-primary/50 transition-all"
                    onClick={() => handleEditCharacter(character)}
                  >
                    <CardHeader className="pb-3">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1 min-w-0">
                          <CardTitle className="text-lg font-semibold truncate">{character.name}</CardTitle>
                          {character.description && (
                            <CardDescription className="text-xs mt-1 line-clamp-1">
                              {character.description}
                            </CardDescription>
                          )}
                        </div>
                        <User className="h-5 w-5 text-muted-foreground flex-shrink-0" />
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <div className="space-y-1.5">
                        {specialRoles.length > 0 && (
                          <div className="flex flex-wrap gap-1">
                            {specialRoles.map((role) => (
                              <span
                                key={role}
                                className={`text-xs px-2 py-1 rounded-md border font-semibold ${getRoleColor(role)}`}
                              >
                                {role}
                              </span>
                            ))}
                          </div>
                        )}
                        {regularRoles.length > 0 && (
                          <div className="flex flex-wrap gap-1">
                            {regularRoles.slice(0, 3).map((role) => (
                              <span
                                key={role}
                                className={`text-xs px-2 py-0.5 rounded-md border ${getRoleColor(role)}`}
                              >
                                {role}
                              </span>
                            ))}
                            {regularRoles.length > 3 && (
                              <span className="text-xs px-2 py-0.5 text-muted-foreground">
                                +{regularRoles.length - 3} more
                              </span>
                            )}
                          </div>
                        )}
                      </div>

                      <div className="flex items-center gap-3 text-xs pt-2 border-t">
                        {character.jungleCoins > 0 && (
                          <div className="flex items-center gap-1">
                            <span className="font-semibold text-yellow-600 dark:text-yellow-400">
                              {character.jungleCoins} J$
                            </span>
                          </div>
                        )}
                        {character.purchasedAmount > 0 && (
                          <div className="flex items-center gap-1 text-muted-foreground">
                            <span>Purchased: ${character.purchasedAmount.toFixed(0)}</span>
                          </div>
                        )}
                        {!character.jungleCoins && !character.purchasedAmount && (
                          <span className="text-muted-foreground">No activity yet</span>
                        )}
                      </div>

                      {(character.contactEmail || character.contactPhone) && (
                        <div className="flex items-center gap-2 text-xs text-muted-foreground pt-1">
                          {character.contactEmail && <Mail className="h-3 w-3" />}
                          {character.contactPhone && <Phone className="h-3 w-3" />}
                        </div>
                      )}
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      <CharacterModal
        character={selectedCharacter}
        open={showCharacterModal}
        onOpenChange={setShowCharacterModal}
        onSave={handleCharacterSave}
      />
    </div>
  );
}
