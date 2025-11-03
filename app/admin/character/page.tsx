'use client';

import { useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useEntityUpdates } from "@/lib/hooks/use-entity-updates";
import { ClientAPI } from "@/lib/client-api";
import { CharacterRole, CHARACTER_ROLE_TYPES } from "@/types/enums";
import ConversionRatesModal from "@/components/modals/submodals/conversion-rates-submodal";
import CharacterModal from "@/components/modals/character-modal";
import { PlayerModal } from "@/components/modals/player-modal";
import { useKeyboardShortcuts } from '@/lib/hooks/use-keyboard-shortcuts';
import type { Character, Player } from "@/types/entities";
import { Plus, User, Users, Mail, Phone } from "lucide-react";
import { ROLE_COLORS } from "@/lib/constants/color-constants";
import { PLAYER_ONE_ID } from "@/types/enums";

export default function CharactersPage() {
  const [showConversionRatesModal, setShowConversionRatesModal] = useState(false);
  const [showCharacterModal, setShowCharacterModal] = useState(false);
  const [showPlayerModal, setShowPlayerModal] = useState(false);
  
  // Keyboard shortcuts for modal navigation
  useKeyboardShortcuts({
    onOpenCharacterModal: () => setShowCharacterModal(true),
    onOpenPlayerModal: () => setShowPlayerModal(true),
  });
  const [selectedCharacter, setSelectedCharacter] = useState<Character | null>(null);
  const [selectedPlayer, setSelectedPlayer] = useState<Player | null>(null);
  const [characters, setCharacters] = useState<Character[]>([]);
  const [players, setPlayers] = useState<Player[]>([]);
  const [playerLog, setPlayerLog] = useState<any[]>([]);
  const [roleFilter, setRoleFilter] = useState<CharacterRole | 'ALL'>('ALL');
  const [isHydrated, setIsHydrated] = useState(false);
  const [points, setPoints] = useState({ xp: 0, rp: 0, fp: 0, hp: 0 });
  const [personalJ$, setPersonalJ$] = useState(0);
  const [conversionRates, setConversionRates] = useState({ xpToJ$: 1, rpToJ$: 1, fpToJ$: 1, hpToJ$: 1, j$ToUSD: 1 });
  
  // 🚨 FIX: Use ref to persist loading state across renders
  const isLoadingDataRef = useRef(false);
  const lastRefreshTimeRef = useRef(0);

  useEffect(() => {
    setIsHydrated(true);
    
    // Load points, characters, and conversion rates asynchronously
    const loadData = async () => {
      if (isLoadingDataRef.current) {
        console.log('[Character Section] ⏭️ Skipping loadData - already loading');
        return;
      }
      
      isLoadingDataRef.current = true;
      try {
        const [playerLogData, ratesData, charactersData, playersData, personalAssets] = await Promise.all([
          ClientAPI.getPlayerLog(),  // ✅ Points come from Player Log now
          ClientAPI.getPlayerConversionRates(),
          ClientAPI.getCharacters(),
          ClientAPI.getPlayers(),
          ClientAPI.getPersonalAssets()
        ]);
        
        const playerLogEntries = playerLogData.entries || [];
        
        // Get current player points (not sum of all log entries)
        const mainPlayer = playersData.find((p: Player) => p.id === PLAYER_ONE_ID) || playersData[0];
        const pointsData = mainPlayer?.points || { xp: 0, rp: 0, fp: 0, hp: 0 };
        
        setPoints(pointsData);
        setPersonalJ$(personalAssets?.personalJ$ || 0);
        setConversionRates(ratesData || { xpToJ$: 1, rpToJ$: 1, fpToJ$: 1, hpToJ$: 1, j$ToUSD: 1 });
        setCharacters(charactersData || []);
        setPlayers(playersData || []);
        setPlayerLog(playerLogEntries);
      } catch (error) {
        console.error('Failed to load player/character data:', error);
      } finally {
        // 🚨 FIX: Always reset the loading flag and update timestamp
        isLoadingDataRef.current = false;
        lastRefreshTimeRef.current = Date.now();
      }
    };
    
    loadData();
  }, []);

  // ✅ Debounced handler for entity updates
  const refreshTimeout = useRef<NodeJS.Timeout | null>(null);
  const handleUpdate = () => {
    const now = Date.now();
    
    // Skip if already loading to prevent infinite loops
    if (isLoadingDataRef.current) {
      console.log('[Character Section] ⏭️ Skipping refresh - already loading data');
      return;
    }
    
    // Skip if we refreshed too recently (within 1 second)
    if (now - lastRefreshTimeRef.current < 1000) {
      console.log('[Character Section] ⏭️ Skipping refresh - too soon after last refresh');
      return;
    }
    
    // Clear existing timeout to debounce rapid events
    if (refreshTimeout.current) {
      clearTimeout(refreshTimeout.current);
    }
    
    // Schedule refresh with 100ms debounce
    refreshTimeout.current = setTimeout(async () => {
      console.log('[Character Section] Executing debounced refresh...');
      if (isLoadingDataRef.current) return;
      
      isLoadingDataRef.current = true;
      try {
        const [playerLogData, ratesData, charactersData, playersData, personalAssets] = await Promise.all([
          ClientAPI.getPlayerLog(),
          ClientAPI.getPlayerConversionRates(),
          ClientAPI.getCharacters(),
          ClientAPI.getPlayers(),
          ClientAPI.getPersonalAssets()
        ]);
        
        const playerLogEntries = playerLogData.entries || [];
        const mainPlayer = playersData.find((p: Player) => p.id === PLAYER_ONE_ID) || playersData[0];
        const pointsData = mainPlayer?.points || { xp: 0, rp: 0, fp: 0, hp: 0 };
        
        setPoints(pointsData);
        setPersonalJ$(personalAssets?.personalJ$ || 0);
        setConversionRates(ratesData || { xpToJ$: 1, rpToJ$: 1, fpToJ$: 1, hpToJ$: 1, j$ToUSD: 1 });
        setCharacters(charactersData || []);
        setPlayers(playersData || []);
        setPlayerLog(playerLogEntries);
      } catch (error) {
        console.error('Failed to refresh player/character data:', error);
      } finally {
        isLoadingDataRef.current = false;
        lastRefreshTimeRef.current = Date.now();
      }
      refreshTimeout.current = null;
    }, 100);
  };

  // Listen for character and player updates (unified pattern)
  useEntityUpdates('character', handleUpdate);
  useEntityUpdates('player', handleUpdate);

  const handlePlayerSave = async (player: Player) => {
    try {
      // Check if this is a new player (no existing ID match)
      const isNew = !players.find(p => p.id === player.id);
      
      // Always trigger workflow processing for both create and update (includes logging)
      await ClientAPI.upsertPlayer(player);
      
      setShowPlayerModal(false);
      setSelectedPlayer(null);
      

    } catch (error) {
      console.error('Failed to save player:', error);
      alert('Failed to save player');
    }
  };

  const handleCharacterSave = async (character: Character) => {
    try {
      // Check if this is a new character (no existing ID match)
      const isNew = !characters.find(c => c.id === character.id);
      
      // Always trigger workflow processing for both create and update (includes logging)
      const finalCharacter = await ClientAPI.upsertCharacter(character);
      
      setShowCharacterModal(false);
      // Update selectedCharacter with fresh data BEFORE modal closes (fixes stale UI issue)
      setSelectedCharacter(finalCharacter);
      

    } catch (error) {
      console.error('Failed to save character:', error);
      alert('Failed to save character');
    }
  };

  const handleCreatePlayer = () => {
    setSelectedPlayer(null);
    setShowPlayerModal(true);
  };

  const handleEditPlayer = (player: Player) => {
    setSelectedPlayer(player);
    setShowPlayerModal(true);
  };

  const handleCreateCharacter = () => {
    setSelectedCharacter(null);
    setShowCharacterModal(true);
  };

  const handleEditCharacter = (character: Character) => {
    setSelectedCharacter(character);
    setShowCharacterModal(true);
  };

  // Get unique roles that exist in current characters
  const existingRoles = Array.from(new Set(characters.flatMap(char => char.roles)));
  
  // Filter characters by role
  const filteredCharacters = roleFilter === 'ALL' 
    ? characters 
    : characters.filter(char => char.roles.includes(roleFilter as CharacterRole));

  if (!isHydrated) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Characters</h1>
          </div>
        </div>
        <div className="flex items-center justify-center h-64">
          <div className="text-muted-foreground">Loading...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* DIVISION 1: PLAYER */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-2xl font-bold">Player</CardTitle>
            <Button onClick={handleCreatePlayer} size="sm" variant="default">
              <User className="w-4 h-4 mr-2" />
              Player Modal
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-3 lg:grid-cols-6 gap-4 text-sm">
            {/* XP */}
            <div className="text-center p-3 bg-muted/30 rounded-lg">
              <div className="text-xs font-medium text-muted-foreground mb-1">XP</div>
              <div className="text-2xl font-bold">{points.xp}</div>
              <div className="text-xs text-muted-foreground mt-1">Experience</div>
            </div>
            
            {/* RP */}
            <div className="text-center p-3 bg-muted/30 rounded-lg">
              <div className="text-xs font-medium text-muted-foreground mb-1">RP</div>
              <div className="text-2xl font-bold">{points.rp}</div>
              <div className="text-xs text-muted-foreground mt-1">Research</div>
            </div>
            
            {/* FP */}
            <div className="text-center p-3 bg-muted/30 rounded-lg">
              <div className="text-xs font-medium text-muted-foreground mb-1">FP</div>
              <div className="text-2xl font-bold">{points.fp}</div>
              <div className="text-xs text-muted-foreground mt-1">Family</div>
            </div>
            
            {/* HP */}
            <div className="text-center p-3 bg-muted/30 rounded-lg">
              <div className="text-xs font-medium text-muted-foreground mb-1">HP</div>
              <div className="text-2xl font-bold">{points.hp}</div>
              <div className="text-xs text-muted-foreground mt-1">Health</div>
            </div>

            {/* Personal J$ */}
            <div className="text-center p-3 bg-primary/10 rounded-lg border-2 border-primary/20">
              <div className="text-xs font-medium text-muted-foreground mb-1">Jungle Coins</div>
              <div className="text-xl font-bold text-primary">{personalJ$.toFixed(1)} J$</div>
              <div className="text-xs text-muted-foreground mt-1">${(personalJ$ * conversionRates.j$ToUSD).toFixed(2)}</div>
            </div>
            
            {/* Personal Zap Coins (Z₿) - V0.2 Placeholder */}
            <div className="text-center p-3 bg-muted/30 rounded-lg border border-dashed opacity-60">
              <div className="text-xs font-medium text-muted-foreground mb-1">Zap Coins</div>
              <div className="text-xl font-bold text-muted-foreground">0 Z₿</div>
              <div className="text-xs text-muted-foreground mt-1">(V0.2)</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* DIVISION 2: CHARACTERS */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-2xl font-bold">Characters</CardTitle>
            <div className="flex items-center gap-2">
              <select 
                className="h-8 rounded-md border border-input bg-background px-3 text-sm"
                value={roleFilter}
                onChange={(e) => setRoleFilter(e.target.value as CharacterRole | 'ALL')}
              >
                <option value="ALL">All Roles ({characters.length})</option>
                {existingRoles.map(role => {
                  const count = characters.filter(c => c.roles.includes(role)).length;
                  return (
                    <option key={role} value={role}>{role} ({count})</option>
                  );
                })}
              </select>
              <Button onClick={handleCreateCharacter} size="sm" variant="default">
                <Plus className="w-4 h-4 mr-2" />
                Add Character
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {filteredCharacters.length === 0 ? (
            <div className="text-center text-muted-foreground py-8">
              {roleFilter === 'ALL' 
                ? 'No characters yet. Create your first character!' 
                : `No characters with ${roleFilter} role.`}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredCharacters.map(character => {
                // Get role color helper
                const getRoleColor = (role: CharacterRole): string => {
                  const roleKey = role.toUpperCase() as keyof typeof ROLE_COLORS;
                  return ROLE_COLORS[roleKey] || ROLE_COLORS.CUSTOMER;
                };
                
                // Separate special roles from regular roles using CHARACTER_ROLE_TYPES
                const isSpecialRole = (role: CharacterRole): boolean => {
                  return CHARACTER_ROLE_TYPES.SPECIAL.includes(role as any);
                };
                const specialRoles = character.roles.filter(isSpecialRole);
                const regularRoles = character.roles.filter(r => !isSpecialRole(r));
                
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
                      {/* Roles Section */}
                      <div className="space-y-1.5">
                        {/* Special Roles - Prominent Display */}
                        {specialRoles.length > 0 && (
                          <div className="flex flex-wrap gap-1">
                            {specialRoles.map(role => (
                              <span
                                key={role}
                                className={`text-xs px-2 py-1 rounded-md border font-semibold ${getRoleColor(role)}`}
                              >
                                {role}
                              </span>
                            ))}
                          </div>
                        )}
                        
                        {/* Regular Roles - Compact Display */}
                        {regularRoles.length > 0 && (
                          <div className="flex flex-wrap gap-1">
                            {regularRoles.slice(0, 3).map(role => (
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
                      
                      {/* Key Metrics - Only show if relevant */}
                      <div className="flex items-center gap-3 text-xs pt-2 border-t">
                        {character.jungleCoins > 0 && (
                          <div className="flex items-center gap-1">
                            <span className="font-semibold text-yellow-600 dark:text-yellow-400">{character.jungleCoins} J$</span>
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
                      
                      {/* Contact Info - Compact Icons */}
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

      {/* Conversion Rates Footer */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg">Conversion Rates</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-6 text-sm flex-wrap">
            <div className="flex items-center gap-2">
              <span className="font-medium">Points to J$:</span>
            </div>
            
            <div className="flex items-center gap-1">
              <span className="text-xs text-muted-foreground">XP:</span>
              <span className="font-semibold">{conversionRates.xpToJ$}</span>
              <span className="text-xs text-muted-foreground">= 1 J$</span>
            </div>
            
            <div className="flex items-center gap-1">
              <span className="text-xs text-muted-foreground">RP:</span>
              <span className="font-semibold">{conversionRates.rpToJ$}</span>
              <span className="text-xs text-muted-foreground">= 1 J$</span>
            </div>
            
            <div className="flex items-center gap-1">
              <span className="text-xs text-muted-foreground">FP:</span>
              <span className="font-semibold">{conversionRates.fpToJ$}</span>
              <span className="text-xs text-muted-foreground">= 1 J$</span>
            </div>
            
            <div className="flex items-center gap-1">
              <span className="text-xs text-muted-foreground">HP:</span>
              <span className="font-semibold">{conversionRates.hpToJ$}</span>
              <span className="text-xs text-muted-foreground">= 1 J$</span>
            </div>
            
            <div className="flex items-center gap-2 border-l pl-6">
              <span className="font-medium">J$ to USD:</span>
              <span className="font-semibold">1 J$ = ${conversionRates.j$ToUSD}</span>
            </div>
            
            <Button
              size="sm"
              variant="outline"
              onClick={() => setShowConversionRatesModal(true)}
              className="h-7 px-3 text-xs ml-auto"
            >
              Edit Rates
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Conversion Rates Modal */}
      {showConversionRatesModal && (
        <ConversionRatesModal
          isOpen={showConversionRatesModal}
          onClose={() => setShowConversionRatesModal(false)}
          onSave={(rates: any) => {
            ClientAPI.savePlayerConversionRates(rates);
            setShowConversionRatesModal(false);
            window.dispatchEvent(new Event('pointsUpdated'));
          }}
        />
      )}

      {/* Player Modal */}
      <PlayerModal
        player={selectedPlayer}
        open={showPlayerModal}
        onOpenChange={setShowPlayerModal}
        onSave={handlePlayerSave}
      />

      {/* Character Modal */}
      <CharacterModal
        character={selectedCharacter}
        open={showCharacterModal}
        onOpenChange={setShowCharacterModal}
        onSave={handleCharacterSave}
      />

    </div>
  );
}
