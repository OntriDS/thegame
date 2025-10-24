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

// Player Character Submodal
interface PlayerCharacterModalProps {
  character: Character | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

function PlayerCharacterModal({ character, open, onOpenChange }: PlayerCharacterModalProps) {
  if (!character) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent zIndexLayer={'SUB_MODALS'} className="max-w-md">
          <DialogHeader>
            <DialogTitle>Player Character</DialogTitle>
          </DialogHeader>
          <div className="py-8 text-center text-muted-foreground">
            No player character found.
          </div>
          <DialogFooter>
            <Button onClick={() => onOpenChange(false)}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    );
  }
  
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent zIndexLayer={'SUB_MODALS'} className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <User className="h-5 w-5" />
            Player Character • {character.name}
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4 py-4">
          <div className="text-xs p-3 border rounded-lg bg-blue-50 dark:bg-blue-950/30">
            <p className="font-semibold">⚡ The Triforce Connection</p>
            <p className="text-muted-foreground mt-1">This character is mega-linked to your Player and Account with super glue.</p>
          </div>
          
          <div className="space-y-3">
            <div>
              <div className="text-xs text-muted-foreground">Name</div>
              <div className="mt-1 text-base font-medium">{character.name}</div>
            </div>
            
            {character.description && (
              <div>
                <div className="text-xs text-muted-foreground">Description</div>
                <div className="mt-1 text-sm">{character.description}</div>
              </div>
            )}
            
            <div>
              <div className="text-xs text-muted-foreground">Roles</div>
              <div className="mt-1 flex flex-wrap gap-1">
                {character.roles.map(role => (
                  <span key={role} className="text-xs px-2 py-1 rounded-md border">
                    {role}
                  </span>
                ))}
              </div>
            </div>
            
            <div className="grid grid-cols-2 gap-3 pt-2 border-t">
              <div>
                <div className="text-xs text-muted-foreground">Jungle Coins</div>
                <div className="mt-1 text-lg font-bold text-primary">
                  {character.jungleCoins.toFixed(1)} J$
                </div>
              </div>
              
              <div>
                <div className="text-xs text-muted-foreground">Purchased Amount</div>
                <div className="mt-1 text-lg font-bold">
                  ${character.purchasedAmount.toFixed(2)}
                </div>
              </div>
            </div>
          </div>
        </div>
        
        <DialogFooter>
          <Button onClick={() => onOpenChange(false)}>
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// Relationships Submodal
interface RelationshipsModalProps {
  player: Player;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

function RelationshipsModal({ player, open, onOpenChange }: RelationshipsModalProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className={`max-w-md ${getZIndexClass('CRITICAL')}`}>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Network className="h-5 w-5" />
            Player Relationships
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4 py-4">
          <div className="text-xs p-4 border rounded-lg bg-primary/5">
            <p className="font-semibold mb-2">🔗 Coming in V0.2: Relationship Graph</p>
            <p className="mb-2">This feature will display:</p>
            <ul className="space-y-1 ml-4">
              <li>• Character relationships and connections</li>
              <li>• Social network visualization</li>
              <li>• Team collaboration networks</li>
              <li>• Influence and impact mapping</li>
            </ul>
          </div>
          
          <div className="text-center py-6">
            <Network className="h-16 w-16 text-muted-foreground mx-auto mb-4 opacity-30" />
            <p className="text-muted-foreground">Relationship system not yet implemented</p>
          </div>
        </div>
        
        <DialogFooter>
          <Button onClick={() => onOpenChange(false)}>
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// Exchange Points Modal
interface ExchangePointsModalProps {
  player: Player | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onExchange: (pointsToExchange: { hp: number; fp: number; rp: number; xp: number }, j$Received: number) => Promise<void>;
}

function ExchangePointsModal({ player, open, onOpenChange, onExchange }: ExchangePointsModalProps) {
  const [hpToExchange, setHpToExchange] = useState(0);
  const [fpToExchange, setFpToExchange] = useState(0);
  const [rpToExchange, setRpToExchange] = useState(0);
  const [xpToExchange, setXpToExchange] = useState(0);
  const [conversionRates, setConversionRates] = useState<any>(null);
  const [isExchanging, setIsExchanging] = useState(false);

  useEffect(() => {
    if (open) {
      const loadRates = async () => {
        const rates = await ClientAPI.getPlayerConversionRates();
        setConversionRates(rates);
      };
      loadRates();
      
      setHpToExchange(0);
      setFpToExchange(0);
      setRpToExchange(0);
      setXpToExchange(0);
    }
  }, [open]);

  if (!player || !conversionRates) {
    return null;
  }

  const calculateJ$Preview = () => {
    return (
      (hpToExchange / conversionRates.hpToJ$) +
      (fpToExchange / conversionRates.fpToJ$) +
      (rpToExchange / conversionRates.rpToJ$) +
      (xpToExchange / conversionRates.xpToJ$)
    );
  };

  const j$Preview = Math.round(calculateJ$Preview() * 100) / 100;
  const usdValue = j$Preview * conversionRates.j$ToUSD;

  const canExchange = j$Preview > 0 && 
    hpToExchange <= (player.points?.hp || 0) &&
    fpToExchange <= (player.points?.fp || 0) &&
    rpToExchange <= (player.points?.rp || 0) &&
    xpToExchange <= (player.points?.xp || 0);

  const handleExchange = async () => {
    if (!canExchange) return;
    
    setIsExchanging(true);
    try {
      await onExchange(
        { hp: hpToExchange, fp: fpToExchange, rp: rpToExchange, xp: xpToExchange },
        j$Preview
      );
    } catch (error) {
      console.error('Exchange failed:', error);
      alert('Exchange failed. Please try again.');
    } finally {
      setIsExchanging(false);
    }
  };
  
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className={`max-w-2xl ${getZIndexClass('CRITICAL')}`}>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Coins className="h-5 w-5" />
            Exchange Points for J$
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4 py-4">
          <Card className="bg-muted/30">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm">Available Points</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-4 gap-3 text-center">
                {[
                  { key: 'XP', value: player.points?.xp || 0, color: 'bg-blue-500' },
                  { key: 'RP', value: player.points?.rp || 0, color: 'bg-green-500' },
                  { key: 'FP', value: player.points?.fp || 0, color: 'bg-yellow-500' },
                  { key: 'HP', value: player.points?.hp || 0, color: 'bg-red-500' }
                ].map((point) => (
                  <div key={point.key}>
                    <div className="text-xs text-muted-foreground">{point.key}</div>
                    <div className="text-lg font-bold">{point.value}</div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm">Select Points to Exchange</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {[
                { key: 'xp', label: 'XP', value: xpToExchange, setValue: setXpToExchange, max: player.points?.xp || 0, rate: conversionRates.xpToJ$ },
                { key: 'rp', label: 'RP', value: rpToExchange, setValue: setRpToExchange, max: player.points?.rp || 0, rate: conversionRates.rpToJ$ },
                { key: 'fp', label: 'FP', value: fpToExchange, setValue: setFpToExchange, max: player.points?.fp || 0, rate: conversionRates.fpToJ$ },
                { key: 'hp', label: 'HP', value: hpToExchange, setValue: setHpToExchange, max: player.points?.hp || 0, rate: conversionRates.hpToJ$ }
              ].map((point) => (
                <div key={point.key} className="flex items-center gap-3">
                  <div className="w-16 text-sm font-medium">{point.label}</div>
                  <input
                    type="number"
                    min="0"
                    max={point.max}
                    value={point.value}
                    onChange={(e) => point.setValue(parseInt(e.target.value) || 0)}
                    className="flex-1 px-3 py-2 border rounded-md"
                  />
                  <div className="w-20 text-xs text-muted-foreground">
                    Max: {point.max}
                  </div>
                  <div className="w-20 text-xs text-muted-foreground">
                    Rate: {point.rate}x
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
          
          <Card className="bg-primary/5">
            <CardContent className="pt-6">
              <div className="text-center">
                <div className="text-2xl font-bold text-primary">
                  {j$Preview.toFixed(2)} J$
                </div>
                <div className="text-sm text-muted-foreground">
                  ≈ ${usdValue.toFixed(2)} USD
                </div>
                <Button 
                  onClick={handleExchange}
                  disabled={!canExchange || isExchanging}
                  className="mt-4"
                >
                  {isExchanging ? 'Exchanging...' : 'Exchange Points'}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
        
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
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
