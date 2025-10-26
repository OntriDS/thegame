'use client';

import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { User, Network, Coins, Target, TrendingUp, Flag } from 'lucide-react';
import { Player, Character } from '@/types/entities';
import { getZIndexClass } from '@/lib/utils/z-index-utils';
import { ClientAPI } from '@/lib/client-api';
import { dispatchEntityUpdated } from '@/lib/ui/ui-events';

// Submodal imports
import PersonalDataModal from './submodals/player-personal-data-submodal';
import PlayerCharacterModal from './submodals/player-character-submodal';
import RelationshipsModal from './submodals/player-relationships-submodal';
import ExchangePointsModal from './submodals/exchange-points-submodal';

// Import tab content components
import { PlayerStateContent } from './modals-tabs/player-state-tab';
import { PlayerStatsContent } from './modals-tabs/player-stats-tab';
import { PlayerProgressionContent } from './modals-tabs/player-progression-tab';

interface PlayerModalProps {
  player: Player | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (player: Player) => Promise<void>;
}

export function PlayerModal({ player, open, onOpenChange, onSave }: PlayerModalProps) {
  // Submodal states
  const [showPersonalData, setShowPersonalData] = useState(false);
  const [showPlayerCharacter, setShowPlayerCharacter] = useState(false);
  const [showRelationships, setShowRelationships] = useState(false);
  const [showExchangeModal, setShowExchangeModal] = useState(false);
  const [activeTab, setActiveTab] = useState('state');

  // Current player data
  const [playerData, setPlayerData] = useState<Player | null>(null);
  const [characters, setCharacters] = useState<Character[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Financial data
  const [personalAssets, setPersonalAssets] = useState<any>(null);

  // Current month metrics (for State tab)
  const [currentMonthMetrics, setCurrentMonthMetrics] = useState({
    tasksCompleted: 0,
    tasksValue: 0,
    itemsSold: 0,
    itemsValue: 0,
  });

  // Load player data and characters on modal open
  useEffect(() => {
    if (open) {
      const loadData = async () => {
        setIsLoading(true);
        try {
          // Load player (either passed player or fetch Player One)
          let playerToLoad = player;
          if (!playerToLoad) {
            const players = await ClientAPI.getPlayers();
            playerToLoad = players.find(p => p.name === 'Player One') || players[0];
          }
          
          if (playerToLoad) {
            setPlayerData(playerToLoad);
            
            // Load characters for this player
            const playerCharacters = await ClientAPI.getCharacters();
            const playerChars = playerCharacters.filter(c => c.playerId === playerToLoad!.id);
            setCharacters(playerChars);
            
            // Load personal assets
            try {
              const assets = await ClientAPI.getPersonalAssets();
              setPersonalAssets(assets);
            } catch (error) {
              console.error('Failed to load personal assets:', error);
            }
          }
        } catch (error) {
          console.error('Failed to load player data:', error);
        } finally {
          setIsLoading(false);
        }
      };
      
      loadData();
    }
  }, [open, player]);

  if (isLoading) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent zIndexLayer={'MODALS'} className="w-full max-w-7xl max-h-[90vh] overflow-hidden">
          <DialogHeader>
            <DialogTitle>Loading Player Data...</DialogTitle>
          </DialogHeader>
          <div className="py-8 text-center text-muted-foreground">
            Loading player information...
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  if (!playerData) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent zIndexLayer={'MODALS'} className="w-full max-w-7xl max-h-[90vh] overflow-hidden">
          <DialogHeader>
            <DialogTitle>Player Not Found</DialogTitle>
          </DialogHeader>
          <div className="py-8 text-center text-muted-foreground">
            No player data available.
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent zIndexLayer={'MODALS'} className="w-full max-w-7xl max-h-[90vh] overflow-hidden">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-2xl">
              <User className="h-6 w-6" />
              Player Profile • {playerData.name}
            </DialogTitle>
          </DialogHeader>

          {/* Tabs - State | Stats | Progression */}
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="state" className="flex items-center gap-2">
                <Target className="h-4 w-4" />
                State
              </TabsTrigger>
              <TabsTrigger value="stats" className="flex items-center gap-2">
                <TrendingUp className="h-4 w-4" />
                Stats
              </TabsTrigger>
              <TabsTrigger value="progression" className="flex items-center gap-2">
                <Flag className="h-4 w-4" />
                Progression
              </TabsTrigger>
            </TabsList>

            {/* Tab Content */}
            <div className="mt-4 overflow-y-auto max-h-[calc(90vh-12rem)] pr-2">
              <TabsContent value="state" className="mt-0">
                <PlayerStateContent 
                  playerData={playerData}
                  currentMonthMetrics={currentMonthMetrics}
                  personalAssets={personalAssets}
                />
              </TabsContent>
              
              <TabsContent value="stats" className="mt-0">
                <PlayerStatsContent 
                  playerData={playerData}
                  personalAssets={personalAssets}
                />
              </TabsContent>
              
              <TabsContent value="progression" className="mt-0">
                <PlayerProgressionContent 
                  playerData={playerData}
                />
              </TabsContent>
            </div>
          </Tabs>

          {/* FOOTER BUTTONS - Matches Sales Modal Pattern */}
          <DialogFooter className="flex items-center justify-between py-2 border-t">
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowPersonalData(true)}
                className="flex items-center gap-2"
              >
                <User className="h-4 w-4" />
                View Personal Data
              </Button>
            </div>

            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowPlayerCharacter(true)}
                className="flex items-center gap-2"
              >
                <User className="h-4 w-4" />
                Character
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowRelationships(true)}
                className="flex items-center gap-2"
              >
                <Network className="h-4 w-4" />
                Relationships
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowExchangeModal(true)}
                className="flex items-center gap-2"
              >
                <Coins className="h-4 w-4" />
                Exchange Points
              </Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>


      {/* Personal Data Submodal */}
      <PersonalDataModal
        player={playerData}
        open={showPersonalData}
        onOpenChange={setShowPersonalData}
        onSave={async (updatedPlayer) => {
          try {
            setPlayerData(updatedPlayer);
            await onSave(updatedPlayer);
            setShowPersonalData(false);
            
            // Dispatch events AFTER successful save
            dispatchEntityUpdated('player');
          } catch (error) {
            console.error('Save failed:', error);
            // Keep modal open on error
          }
        }}
      />

      {/* Player Character Submodal */}
      <PlayerCharacterModal
        character={characters[0] || null}
        open={showPlayerCharacter}
        onOpenChange={setShowPlayerCharacter}
      />

      {/* Relationships Submodal */}
      <RelationshipsModal
        player={playerData}
        open={showRelationships}
        onOpenChange={setShowRelationships}
      />


      {/* Exchange Points Modal */}
      <ExchangePointsModal
        player={playerData}
        open={showExchangeModal}
        onOpenChange={setShowExchangeModal}
        onExchange={async (pointsToExchange, j$Received) => {
          // Update player points
          const updatedPlayer = {
            ...playerData,
            points: {
              xp: (playerData.points?.xp || 0) - pointsToExchange.xp,
              rp: (playerData.points?.rp || 0) - pointsToExchange.rp,
              fp: (playerData.points?.fp || 0) - pointsToExchange.fp,
              hp: (playerData.points?.hp || 0) - pointsToExchange.hp,
            }
          };
          
          // Update personal assets
          const updatedAssets = {
            ...personalAssets,
            jungleCoins: (personalAssets?.jungleCoins || 0) + j$Received,
            usdValue: ((personalAssets?.jungleCoins || 0) + j$Received) * 10
          };
          
          try {
            await ClientAPI.upsertPlayer(updatedPlayer);
            setPlayerData(updatedPlayer);
            setPersonalAssets(updatedAssets);
            setShowExchangeModal(false);
            
            // Log the points-to-J$ conversion
            const totalPointsExchanged = pointsToExchange.xp + pointsToExchange.rp + pointsToExchange.fp + pointsToExchange.hp;
            const { appendEntityLog } = await import('@/workflows/entities-logging');
            const { EntityType, LogEventType } = await import('@/types/enums');
            await appendEntityLog(
              EntityType.PLAYER,
              playerData.id,
              LogEventType.UPDATED,
              {
                name: playerData.name,
                pointsExchanged: pointsToExchange,
                jungleCoinsReceived: j$Received,
                description: `Player exchanged ${totalPointsExchanged} points for ${j$Received} J$`
              }
            );
            
            // Trigger financials update event AFTER successful save
            dispatchEntityUpdated('player');
            dispatchEntityUpdated('financial');
          } catch (error) {
            console.error('Save failed:', error);
            // Keep modal open on error
          }
        }}
      />
    </>
  );
}
