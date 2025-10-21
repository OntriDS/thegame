'use client';



import { useState, useEffect } from 'react';

import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';

import { Button } from '@/components/ui/button';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

import { Player, Character } from '@/types/entities';

import { CharacterRole } from '@/types/enums';

import { User, Heart, Users as UsersIcon, BookOpen, Zap, Settings, TrendingUp, Coins, Award, DollarSign, Network, CheckCircle, Target } from 'lucide-react';

import { Input } from '@/components/ui/input';

import { Label } from '@/components/ui/label';

// Side effects handled by parent component via API calls

import { getZIndexClass, getZIndexValue } from '@/lib/utils/z-index-utils';

import { POINTS_COLORS } from '@/lib/constants/color-constants';

import { getMonetaryTotal } from '@/lib/utils/financial-calculations';

import { DEFAULT_CURRENCY_EXCHANGE_RATES, type CurrencyExchangeRates } from '@/lib/constants/financial-constants';

import { getPointsOrder, getPointsMetadata } from '@/lib/utils/points-utils';

import { ClientAPI } from '@/lib/client-api';

// Submodal imports
import PersonalDataModal from './submodals/player-personal-data-submodal';
import AccountEditModal from './submodals/player-account-edit-submodal';



interface PlayerModalProps {

  player?: Player | null;

  open: boolean;

  onOpenChange: (open: boolean) => void;

  onSave: (player: Player) => void;

}



// Player Character Submodal
interface PlayerCharacterModalProps {
  character: Character | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

function PlayerCharacterModal({ character, open, onOpenChange }: PlayerCharacterModalProps) {
  // Debug z-index when modal opens
  useEffect(() => {
    if (open) {
      const zClass = getZIndexClass('DROPDOWNS');
      const zValue = getZIndexValue('DROPDOWNS');
      console.log('[PlayerCharacterModal] open=true z-index', { zClass, zValue, actualValue: 500 });
    }
  }, [open]);
  if (!character) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className={`max-w-md ${getZIndexClass('DROPDOWNS')}`}>
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
      <DialogContent className={`max-w-md ${getZIndexClass('DROPDOWNS')}`}>
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
              <Label className="text-xs text-muted-foreground">Name</Label>
              <div className="mt-1 text-base font-medium">{character.name}</div>
            </div>
            
            {character.description && (
              <div>
                <Label className="text-xs text-muted-foreground">Description</Label>
                <div className="mt-1 text-sm">{character.description}</div>
              </div>
            )}
            
            <div>
              <Label className="text-xs text-muted-foreground">Roles</Label>
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
                <Label className="text-xs text-muted-foreground">Jungle Coins</Label>
                <div className="mt-1 text-lg font-bold text-primary">
                  {character.jungleCoins.toFixed(1)} J$
                </div>
              </div>
              
              <div>
                <Label className="text-xs text-muted-foreground">Purchased Amount</Label>
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
  // Debug z-index when modal opens
  useEffect(() => {
    if (open) {
      const zClass = getZIndexClass('DROPDOWNS');
      const zValue = getZIndexValue('DROPDOWNS');
      console.log('[RelationshipsModal] open=true z-index', { zClass, zValue, actualValue: 500 });
    }
  }, [open]);
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className={`max-w-md ${getZIndexClass('DROPDOWNS')}`}>
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
              <li>• Relationship strength and history</li>
              <li>• New gameplay opportunities</li>
              <li>• Team building and collaboration mechanics</li>
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
      // Debug z-index when modal opens
      const zClass = getZIndexClass('DROPDOWNS');
      const zValue = getZIndexValue('DROPDOWNS');
      console.log('[ExchangePointsModal] open=true z-index', { zClass, zValue, actualValue: 500 });
      
      const loadRates = async () => {
        const rates = await ClientAPI.getPointsConversionRates();
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
      <DialogContent className={`max-w-2xl ${getZIndexClass('DROPDOWNS')}`}>
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
                {getPointsMetadata().map((pointType) => {
                  const pointValue = player.points?.[pointType.key.toLowerCase() as keyof typeof player.points] || 0;
                  return (
                    <div key={pointType.key}>
                      <div className="text-xs text-muted-foreground">{pointType.label}</div>
                      <div className="text-lg font-bold">{pointValue}</div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm">Select Points to Exchange</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {getPointsMetadata().map((pointType) => {
                const pointKey = pointType.key.toLowerCase();
                const pointValue = player.points?.[pointKey as keyof typeof player.points] || 0;
                const conversionKey = `${pointKey}ToJ$` as keyof typeof conversionRates;
                const conversionRate = conversionRates[conversionKey] || 1;
                
                let currentValue, setValue;
                switch (pointKey) {
                  case 'xp':
                    currentValue = xpToExchange;
                    setValue = setXpToExchange;
                    break;
                  case 'rp':
                    currentValue = rpToExchange;
                    setValue = setRpToExchange;
                    break;
                  case 'fp':
                    currentValue = fpToExchange;
                    setValue = setFpToExchange;
                    break;
                  case 'hp':
                    currentValue = hpToExchange;
                    setValue = setHpToExchange;
                    break;
                  default:
                    currentValue = 0;
                    setValue = () => {};
                }
                
                return (
                  <div key={pointType.key} className="grid grid-cols-3 gap-3 items-center">
                    <Label className="text-sm">{pointType.label} (÷{conversionRate} = 1 J$)</Label>
                    <Input
                      type="number"
                      min={0}
                      max={pointValue}
                      value={currentValue}
                      onChange={(e) => setValue(Math.min(parseInt(e.target.value) || 0, pointValue))}
                      className="text-center"
                    />
                    <div className="text-xs text-muted-foreground text-right">
                      = {(currentValue / conversionRate).toFixed(2)} J$
                    </div>
                  </div>
                );
              })}
            </CardContent>
          </Card>
          
          <Card className="border-2 border-primary/50 bg-primary/5">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-sm text-muted-foreground">You will receive:</div>
                  <div className="text-3xl font-bold text-primary">{j$Preview.toFixed(2)} J$</div>
                  <div className="text-xs text-muted-foreground mt-1">≈ ${usdValue.toFixed(2)} USD</div>
                </div>
                <Coins className="h-16 w-16 text-primary opacity-20" />
              </div>
            </CardContent>
          </Card>
        </div>
        
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isExchanging}>
            Cancel
          </Button>
          <Button 
            onClick={handleExchange} 
            disabled={!canExchange || isExchanging}
          >
            {isExchanging ? 'Exchanging...' : 'Confirm Exchange'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}



/**

 * PlayerModal - Player Entity Management (Real Person) - V0.1 Production Ready

 * v0.2 Full authentication, level system, achievements, relationship graph

 */

export function PlayerModal({ player, open, onOpenChange, onSave }: PlayerModalProps) {

  // Submodal states

  const [showPersonalData, setShowPersonalData] = useState(false);

  const [showPlayerCharacter, setShowPlayerCharacter] = useState(false);

  const [showAccountEdit, setShowAccountEdit] = useState(false);

  const [showRelationships, setShowRelationships] = useState(false);

  const [showExchangeModal, setShowExchangeModal] = useState(false);

  

  // Current player data

  const [playerData, setPlayerData] = useState<Player | null>(null);

  const [characters, setCharacters] = useState<Character[]>([]);

  const [accountData, setAccountData] = useState<any | null>(null);

  const [isLoading, setIsLoading] = useState(true);

  const [activeTab, setActiveTab] = useState<'state' | 'stats' | 'progression'>('state');



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
      // Debug z-index when main modal opens
      const zClass = getZIndexClass('MODALS');
      const zValue = getZIndexValue('MODALS');
      console.log('[PlayerModal] open=true z-index', { zClass, zValue, actualValue: 100 });

      const loadData = async () => {

        setIsLoading(true);

        try {

          // Load player (either passed player or fetch Player One)

          let loadedPlayer = player;

          

          if (!loadedPlayer) {

            // If no player passed, fetch the first player (Player One)

            const players = await ClientAPI.getPlayers();

            loadedPlayer = players[0] || null;

          }

          

          setPlayerData(loadedPlayer);

          console.log('[PlayerModal] loadedPlayer:', loadedPlayer);
          console.log('[PlayerModal] loadedPlayer?.accountId:', loadedPlayer?.accountId);
          
          // Load Account if linked
          if (loadedPlayer?.accountId) {
            try {
              const account = await ClientAPI.getAccount(loadedPlayer.accountId);
              setAccountData(account);
              console.log('[PlayerModal] accountData after successful fetch:', account);

            } catch (error) {

              console.warn('[PlayerModal] Could not load account data:', error);

              setAccountData(null);

            }

          } else {

            setAccountData(null);

          }

          

          // Load characters managed by this player

          let playerCharacters: Character[] = [];



          if (loadedPlayer?.characterIds && loadedPlayer.characterIds.length > 0) {

            // Try ambassador field first

            const allCharacters = await ClientAPI.getCharacters();

            playerCharacters = allCharacters.filter(c => 

              loadedPlayer!.characterIds.includes(c.id)

            );

          }



          // Fallback: If no characters found via ambassador field, query by playerId

          if (playerCharacters.length === 0 && loadedPlayer) {

            const allCharacters = await ClientAPI.getCharacters();

            playerCharacters = allCharacters.filter(c => 

              c.playerId === loadedPlayer.id && 

              c.roles.includes(CharacterRole.PLAYER) &&

              c.isActive

            );

            

            // If we found characters this way, update the Player entity to sync characterIds

            if (playerCharacters.length > 0) {

              const characterIds = playerCharacters.map(c => c.id);

              console.log(`[PlayerModal] Syncing characterIds for player ${loadedPlayer.id}:`, characterIds);

              // Note: We don't await this - let it sync in background

              ClientAPI.upsertPlayer({

                ...loadedPlayer,

                characterIds

              }).catch(err => console.error('Failed to sync characterIds:', err));

            }

          }



          setCharacters(playerCharacters);



          // Load financial data (Personal Monetary Assets)

          const personalAssetsData = await ClientAPI.getPersonalAssets();

          setPersonalAssets(personalAssetsData);



          // Load current month metrics from player data properly connected to totalTasksCompleted field

          setCurrentMonthMetrics({

            tasksCompleted: loadedPlayer?.totalTasksCompleted || 0,

            tasksValue: 0, // Placeholder - will calculate from completed tasks in future

            itemsSold: loadedPlayer?.totalItemsSold || 0,

            itemsValue: 0, // Placeholder - will calculate from sold items in future

          });

        } catch (error) {

          console.error('[PlayerModal] Failed to load player data:', error);

          console.error('[PlayerModal] Player:', player);

        } finally {

          setIsLoading(false);

        }

      };

      

      loadData();

    }

  }, [player, open]);

  

  // Calculate J$ values

  // Priority: Use Personal J$ from Finances (source of truth), fallback to Player entity

  const getPersonalJ$ = () => {

    return personalAssets?.personalJ$ ?? playerData?.jungleCoins ?? 0;

  };

  const j$ToUSD = getPersonalJ$() * 10; // 1 J$ = $10 USD

  

  // Format points display

  const formatPoints = (value: number) => {

    return value.toLocaleString();

  };



  // Calculate total points earned

  const totalPointsEarned = (playerData?.totalPoints?.hp || 0) + 

                            (playerData?.totalPoints?.fp || 0) + 

                            (playerData?.totalPoints?.rp || 0) + 

                            (playerData?.totalPoints?.xp || 0);



  // Calculate max J$ (for Stats tab)

  const maxJ$ = Math.max(getPersonalJ$(), 0); // Placeholder - will track historical max in V0.2



  // Calculate Personal Monetary Total (USD from Finances)

  const getPersonalMonetaryTotal = () => {

    if (!personalAssets) return 0;

    return getMonetaryTotal(personalAssets, DEFAULT_CURRENCY_EXCHANGE_RATES, true);

  };



  if (isLoading) {

    return (

      <Dialog open={open} onOpenChange={onOpenChange}>

        <DialogContent className={`w-full max-w-7xl h-[90vh] ${getZIndexClass('MODALS')}`}>

          <DialogHeader>

            <DialogTitle className="flex items-center gap-2">

              <User className="h-5 w-5" />

              

            </DialogTitle>

          </DialogHeader>

          <div className="flex items-center justify-center py-12">

            <div className="text-muted-foreground">Loading player data...</div>

          </div>

        </DialogContent>

      </Dialog>

    );

  }

  

  if (!playerData) {

    return (

      <Dialog open={open} onOpenChange={onOpenChange}>

        <DialogContent className={`w-full max-w-7xl h-[90vh] ${getZIndexClass('MODALS')}`}>

          <DialogHeader>

            <DialogTitle className="flex items-center gap-2">

              <User className="h-5 w-5" />

              No Player Found

            </DialogTitle>

          </DialogHeader>

          <div className="py-8 text-center text-muted-foreground">

            <p>No player data available. Please create a player first.</p>

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



  return (

    <>
    <Dialog open={open} onOpenChange={onOpenChange}>

      <DialogContent className={`w-full max-w-7xl h-[90vh] ${getZIndexClass('MODALS')}`}>

        <DialogHeader>

          <DialogTitle className="flex items-center gap-2 text-2xl">

            <User className="h-6 w-6" />

            Player Profile • {playerData.name}

            {accountData && (

              <span className="ml-auto text-xs font-normal text-green-600 dark:text-green-400">

                • Account Linked

              </span>

            )}

          </DialogTitle>

        </DialogHeader>



        {/* Tabs System - State | Stats | Progression */}

        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as any)} className={`flex-1 flex flex-col overflow-hidden ${getZIndexClass('SUBTABS')}`}>

          <TabsList className="w-full grid grid-cols-3 mb-4">

            <TabsTrigger value="state" className="text-base">

              <Target className="h-4 w-4 mr-2" />

              State

            </TabsTrigger>

            <TabsTrigger value="stats" className="text-base">

              <TrendingUp className="h-4 w-4 mr-2" />

              Stats

            </TabsTrigger>

            <TabsTrigger value="progression" className="text-base">

              <Award className="h-4 w-4 mr-2" />

              Progression

            </TabsTrigger>

          </TabsList>



          {/* STATE TAB - Current Month Data */}

          <TabsContent value="state" className="flex-1 overflow-y-auto space-y-4">

            {/* Current Points (Uncollected) */}

          <Card className="border-2">

            <CardHeader className="pb-3">

                <div className="flex items-center justify-between">

                  <CardTitle className="text-lg font-semibold">Current Points (Uncollected)</CardTitle>

                  <Button 

                  size="sm" 

                  variant="default"

                  onClick={() => {

                    // Calculate potential J$ from current points

                    const points = playerData.points || { xp: 0, rp: 0, fp: 0, hp: 0 };

                    const totalPoints = points.xp + points.rp + points.fp + points.hp;

                    const potentialJ$ = ClientAPI.convertPointsToJ$(totalPoints);

                    if (potentialJ$ > 0) {

                      setShowExchangeModal(true);

                    }

                  }}

                  disabled={(playerData.points?.hp || 0) === 0 && 

                           (playerData.points?.fp || 0) === 0 && 

                           (playerData.points?.rp || 0) === 0 && 

                           (playerData.points?.xp || 0) === 0}

                >

                  <Coins className="h-4 w-4 mr-2" />

                  Exchange Points

                </Button>

                </div>

            </CardHeader>

            <CardContent className="space-y-4">

                {/* Points Grid - XP, RP, FP, HP */}

              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">

                {/* XP */}

                <div className="flex items-center gap-3 p-3 rounded-lg border">

                  <Zap className="h-5 w-5 text-muted-foreground flex-shrink-0" />

                  <div className="flex-1 min-w-0">

                      <div className="text-xs font-medium text-muted-foreground">Experience</div>

                    <div className={`text-xl font-bold ${(playerData.points?.xp || 0) > 0 ? POINTS_COLORS.XP : 'text-muted-foreground'}`}>

                      {formatPoints(playerData.points?.xp || 0)} XP

                    </div>

                  </div>

                </div>

                

                {/* RP */}

                <div className="flex items-center gap-3 p-3 rounded-lg border">

                  <BookOpen className="h-5 w-5 text-muted-foreground flex-shrink-0" />

                  <div className="flex-1 min-w-0">

                      <div className="text-xs font-medium text-muted-foreground">Research</div>

                    <div className={`text-xl font-bold ${(playerData.points?.rp || 0) > 0 ? POINTS_COLORS.RP : 'text-muted-foreground'}`}>

                      {formatPoints(playerData.points?.rp || 0)} RP

                    </div>

                  </div>

                </div>

                

                {/* FP */}

                <div className="flex items-center gap-3 p-3 rounded-lg border">

                  <UsersIcon className="h-5 w-5 text-muted-foreground flex-shrink-0" />

                  <div className="flex-1 min-w-0">

                      <div className="text-xs font-medium text-muted-foreground">Family</div>

                    <div className={`text-xl font-bold ${(playerData.points?.fp || 0) > 0 ? POINTS_COLORS.FP : 'text-muted-foreground'}`}>

                      {formatPoints(playerData.points?.fp || 0)} FP

                    </div>

                  </div>

                </div>

                

                {/* HP */}

                <div className="flex items-center gap-3 p-3 rounded-lg border">

                  <Heart className="h-5 w-5 text-muted-foreground flex-shrink-0" />

                  <div className="flex-1 min-w-0">

                      <div className="text-xs font-medium text-muted-foreground">Health</div>

                    <div className={`text-xl font-bold ${(playerData.points?.hp || 0) > 0 ? POINTS_COLORS.HP : 'text-muted-foreground'}`}>

                      {formatPoints(playerData.points?.hp || 0)} HP

                    </div>

                  </div>

                </div>

              </div>

              </CardContent>

            </Card>



            {/* Personal Money Assets */}

            <Card className="border-2">

              <CardHeader className="pb-3">

                <CardTitle className="text-lg font-semibold">Personal Money Assets</CardTitle>

              </CardHeader>

              <CardContent>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">

                  {/* USD - From Personal Monetary Assets (Finances) */}

                  <div className="flex items-center gap-3 p-3 rounded-lg border-2">

                    <DollarSign className="h-6 w-6 text-green-600 dark:text-green-400 flex-shrink-0" />

                    <div className="flex-1 min-w-0">

                      <div className="text-xs font-medium text-muted-foreground">US Dollars</div>

                      <div className="text-xl font-bold text-green-600 dark:text-green-400">

                        ${getPersonalMonetaryTotal().toFixed(2)}

                      </div>

                      <div className="text-xs text-muted-foreground">From Personal Assets</div>

                    </div>

                  </div>

                  

                  {/* Jungle Coins - From Personal J$ (Finances) */}

                  <div className="flex items-center gap-3 p-3 rounded-lg border-2">

                    <Coins className="h-6 w-6 text-primary flex-shrink-0" />

                    <div className="flex-1 min-w-0">

                      <div className="text-xs font-medium text-muted-foreground">Jungle Coins</div>

                      <div className={`text-xl font-bold ${getPersonalJ$() > 0 ? POINTS_COLORS['J$'] : 'text-muted-foreground'}`}>

                        {getPersonalJ$().toFixed(1)} J$

                      </div>

                      <div className="text-xs text-muted-foreground">${j$ToUSD.toLocaleString()} USD</div>

                    </div>

                  </div>

                  

                  {/* Zap Coins (V0.2 Placeholder) */}

                  <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/30 border border-dashed">

                    <TrendingUp className="h-6 w-6 text-muted-foreground flex-shrink-0" />

                    <div className="flex-1 min-w-0">

                      <div className="text-xs font-medium text-muted-foreground">Zap Coins</div>

                      <div className="text-xl font-bold text-muted-foreground">0 Z₿</div>

                      <div className="text-xs text-muted-foreground">(V0.2)</div>

                    </div>

                  </div>

                </div>

              </CardContent>

            </Card>



            {/* Current Month Activity */}

            <Card>

              <CardHeader className="pb-3">

                <CardTitle className="text-lg font-semibold">This Month&apos;s Activity</CardTitle>

              </CardHeader>

              <CardContent>

                <div className="grid grid-cols-2 gap-4">

                  <div className="space-y-2">

                    <div className="flex items-center justify-between p-3 rounded-lg border">

                      <div className="flex items-center gap-2">

                        <CheckCircle className="h-5 w-5 text-green-600" />

                        <span className="text-sm font-medium">Tasks Completed</span>

                      </div>

                      <span className="text-lg font-bold">{currentMonthMetrics.tasksCompleted}</span>

                    </div>

                    <div className="flex items-center justify-between p-3 rounded-lg border">

                      <span className="text-xs text-muted-foreground ml-7">Total Value</span>

                      <span className="text-sm font-semibold">${currentMonthMetrics.tasksValue.toFixed(2)}</span>

                    </div>

                  </div>

                  

                  <div className="space-y-2">

                    <div className="flex items-center justify-between p-3 rounded-lg border">

                      <div className="flex items-center gap-2">

                        <DollarSign className="h-5 w-5 text-green-600" />

                        <span className="text-sm font-medium">Items Sold</span>

                      </div>

                      <span className="text-lg font-bold">{currentMonthMetrics.itemsSold}</span>

                    </div>

                    <div className="flex items-center justify-between p-3 rounded-lg border">

                      <span className="text-xs text-muted-foreground ml-7">Total Value</span>

                      <span className="text-sm font-semibold">${currentMonthMetrics.itemsValue.toFixed(2)}</span>

                    </div>

                  </div>

                </div>

                

                <div className="text-xs text-muted-foreground p-3 border rounded-lg bg-muted/30 mt-4">

                  <p className="font-semibold mb-1">📊 Current Month Performance</p>

                  <p>Real-time tracking of your business activities and achievements this month.</p>

              </div>

            </CardContent>

          </Card>

          </TabsContent>



          {/* STATS TAB - Historical Data */}

          <TabsContent value="stats" className="flex-1 overflow-y-auto space-y-4">

            {/* Lifetime Points */}

            <Card className="border-2">

              <CardHeader className="pb-3">

                <CardTitle className="text-lg font-semibold">Lifetime Points (All-Time Earned)</CardTitle>

              </CardHeader>

              <CardContent className="space-y-3">

                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">

                  <div className="p-3 rounded-lg border">

                    <div className="text-xs font-medium text-muted-foreground mb-1">Total XP</div>

                    <div className={`text-xl font-bold ${POINTS_COLORS.XP}`}>

                      {formatPoints(playerData.totalPoints?.xp || 0)}

                    </div>

          </div>

          

                  <div className="p-3 rounded-lg border">

                    <div className="text-xs font-medium text-muted-foreground mb-1">Total RP</div>

                    <div className={`text-xl font-bold ${POINTS_COLORS.RP}`}>

                      {formatPoints(playerData.totalPoints?.rp || 0)}

                    </div>

          </div>

          

                  <div className="p-3 rounded-lg border">

                    <div className="text-xs font-medium text-muted-foreground mb-1">Total FP</div>

                    <div className={`text-xl font-bold ${POINTS_COLORS.FP}`}>

                      {formatPoints(playerData.totalPoints?.fp || 0)}

                    </div>

                  </div>

                  

                  <div className="p-3 rounded-lg border">

                    <div className="text-xs font-medium text-muted-foreground mb-1">Total HP</div>

                    <div className={`text-xl font-bold ${POINTS_COLORS.HP}`}>

                      {formatPoints(playerData.totalPoints?.hp || 0)}

                    </div>

                  </div>

                </div>

                

                <div className="border-t pt-3 flex items-center justify-between">

                  <span className="text-sm font-semibold">All Points Ever Earned:</span>

                  <span className="text-2xl font-bold">{formatPoints(totalPointsEarned)}</span>

                </div>

              </CardContent>

            </Card>



            {/* Level & Progression */}

          <Card>

            <CardHeader className="pb-3">

                <CardTitle className="text-lg font-semibold">Player Level & Progression</CardTitle>

            </CardHeader>

              <CardContent className="space-y-3">

                <div className="flex items-center justify-between p-4 rounded-lg border-2">

                  <span className="text-base font-semibold">Current Level:</span>

                  <span className="text-3xl font-bold">{playerData.level ?? 0}</span>

                </div>

                

                <div className="text-xs text-muted-foreground p-3 border rounded-lg bg-muted/30">

                  <p className="font-semibold mb-1">🎮 Level System Coming in V0.2</p>

                  <p>Experience-based progression, level unlocks, skill points, and more!</p>

                </div>

              </CardContent>

            </Card>



            {/* Activity Stats */}

            <Card>

              <CardHeader className="pb-3">

                <CardTitle className="text-lg font-semibold">All-Time Activity Stats</CardTitle>

              </CardHeader>

              <CardContent className="space-y-2">

                <div className="flex items-center justify-between p-3 rounded-lg border">

                  <span className="text-sm font-medium">Total Tasks Completed:</span>

                  <span className="text-lg font-bold">{playerData.totalTasksCompleted || 0}</span>

                </div>

                <div className="flex items-center justify-between p-3 rounded-lg border">

                  <span className="text-sm font-medium">Total Sales Made:</span>

                  <span className="text-lg font-bold">{playerData.totalSalesCompleted || 0}</span>

                </div>

                <div className="flex items-center justify-between p-3 rounded-lg border">

                  <span className="text-sm font-medium">Total Items Sold:</span>

                  <span className="text-lg font-bold">{playerData.totalItemsSold || 0}</span>

                </div>

                <div className="flex items-center justify-between p-3 rounded-lg border-2">

                  <span className="text-sm font-medium">Max J$ Achieved:</span>

                  <span className="text-lg font-bold text-primary">{maxJ$.toFixed(1)} J$</span>

                </div>

              </CardContent>

            </Card>

          </TabsContent>



          {/* PROGRESSION TAB - RPG Mechanics Placeholder */}

          <TabsContent value="progression" className="flex-1 overflow-y-auto space-y-4">

            {/* RPG Stats Preview */}

            <Card className="border-2 border-primary/30">

              <CardHeader className="pb-3">

                <CardTitle className="text-lg font-semibold flex items-center gap-2">

                  <Award className="h-5 w-5" />

                  Real Life Character Development (RPG Stats)

                </CardTitle>

              </CardHeader>

              <CardContent className="space-y-4">

                <div className="text-sm text-muted-foreground p-4 border rounded-lg bg-primary/5">

                  <p className="font-semibold mb-2">🎯 Coming in V0.2: Your Personal Growth System</p>

                  <p className="mb-2">Track and develop your real-life capabilities across three dimensions:</p>

                  <ul className="space-y-1 ml-4">

                    <li>• <strong>Skills</strong> - Professional and creative abilities (Design, Programming, Teaching, etc.)</li>

                    <li>• <strong>Intellectual Functions</strong> - Cognitive strengths (Creativity, Planning, Analysis, etc.)</li>

                    <li>• <strong>Attributes</strong> - Personal traits (Charisma, Logic, Resilience, etc.)</li>

                  </ul>

                </div>



                {/* Skills Preview */}

                <div className="space-y-2">

                  <div className="text-sm font-semibold">Skills (Professional Abilities)</div>

                  <div className="grid grid-cols-2 gap-2">

                    <div className="p-3 rounded-lg border bg-muted/30 opacity-60">

                      <div className="text-xs text-muted-foreground">Design Thinking</div>

                      <div className="text-lg font-bold text-muted-foreground">— / 10</div>

                          </div>

                    <div className="p-3 rounded-lg border bg-muted/30 opacity-60">

                      <div className="text-xs text-muted-foreground">Programming</div>

                      <div className="text-lg font-bold text-muted-foreground">— / 10</div>

                        </div>

                    <div className="p-3 rounded-lg border bg-muted/30 opacity-60">

                      <div className="text-xs text-muted-foreground">Teaching</div>

                      <div className="text-lg font-bold text-muted-foreground">— / 10</div>

                      </div>

                    <div className="p-3 rounded-lg border bg-muted/30 opacity-60">

                      <div className="text-xs text-muted-foreground">Woodworking</div>

                      <div className="text-lg font-bold text-muted-foreground">— / 10</div>

                        </div>

                    </div>

                </div>



                {/* Intellectual Functions Preview */}

                <div className="space-y-2">

                  <div className="text-sm font-semibold">Intellectual Functions (Cognitive Strengths)</div>

                  <div className="grid grid-cols-2 gap-2">

                    <div className="p-3 rounded-lg border bg-muted/30 opacity-60">

                      <div className="text-xs text-muted-foreground">Creativity</div>

                      <div className="text-lg font-bold text-muted-foreground">— / 10</div>

                    </div>

                    <div className="p-3 rounded-lg border bg-muted/30 opacity-60">

                      <div className="text-xs text-muted-foreground">Planning</div>

                      <div className="text-lg font-bold text-muted-foreground">— / 10</div>

                    </div>

                    <div className="p-3 rounded-lg border bg-muted/30 opacity-60">

                      <div className="text-xs text-muted-foreground">Analysis</div>

                      <div className="text-lg font-bold text-muted-foreground">— / 10</div>

                    </div>

                    <div className="p-3 rounded-lg border bg-muted/30 opacity-60">

                      <div className="text-xs text-muted-foreground">Problem Solving</div>

                      <div className="text-lg font-bold text-muted-foreground">— / 10</div>

                    </div>

                  </div>

                </div>



                {/* Attributes Preview */}

                <div className="space-y-2">

                  <div className="text-sm font-semibold">Attributes (Personal Traits)</div>

                  <div className="grid grid-cols-2 gap-2">

                    <div className="p-3 rounded-lg border bg-muted/30 opacity-60">

                      <div className="text-xs text-muted-foreground">Charisma</div>

                      <div className="text-lg font-bold text-muted-foreground">— / 10</div>

                    </div>

                    <div className="p-3 rounded-lg border bg-muted/30 opacity-60">

                      <div className="text-xs text-muted-foreground">Logic</div>

                      <div className="text-lg font-bold text-muted-foreground">— / 10</div>

                    </div>

                    <div className="p-3 rounded-lg border bg-muted/30 opacity-60">

                      <div className="text-xs text-muted-foreground">Resilience</div>

                      <div className="text-lg font-bold text-muted-foreground">— / 10</div>

                    </div>

                    <div className="p-3 rounded-lg border bg-muted/30 opacity-60">

                      <div className="text-xs text-muted-foreground">Determination</div>

                      <div className="text-lg font-bold text-muted-foreground">— / 10</div>

                    </div>

                  </div>

                </div>

            </CardContent>

          </Card>

          

            {/* Achievements Preview */}

            <Card>

              <CardHeader className="pb-3">

                <CardTitle className="text-lg font-semibold">Achievements & Milestones</CardTitle>

              </CardHeader>

              <CardContent>

                {playerData.achievementsPlayer && playerData.achievementsPlayer.length > 0 ? (

                  <div className="space-y-2">

                    {playerData.achievementsPlayer.map((achievement, index) => (

                      <div 

                        key={index}

                        className="flex items-center gap-2 p-3 rounded-lg border"

                      >

                        <Award className="h-5 w-5 text-yellow-600" />

                        <span className="text-sm font-medium">{achievement}</span>

          </div>

                    ))}

        </div>

                ) : (

                  <div className="text-center text-muted-foreground py-6 text-sm">

                    No achievements unlocked yet. Complete tasks and missions to earn achievements!

                  </div>

                )}

              </CardContent>

            </Card>

          </TabsContent>

        </Tabs>



        {/* FOOTER BUTTONS - Matches Sales Modal Pattern */}

        <DialogFooter className="flex items-center justify-between py-2 border-t">

          <div className="flex items-center gap-2">

            {accountData && (

          <Button 

            variant="outline" 

            size="sm"

                onClick={() => {
                  console.log('Opening Account Edit Modal');
                  setShowAccountEdit(true);
                }}

                className="h-8 text-xs"

          >

                <Settings className="h-4 w-4 mr-1" />

                Edit Account

          </Button>

            )}

            

            <Button

              variant="outline"

              size="sm"

              onClick={() => {
                console.log('Opening Personal Data Modal');
                setShowPersonalData(true);
              }}

              className="h-8 text-xs"

            >

              <User className="h-4 w-4 mr-1" />

              View Personal Data

            </Button>

            

            {characters.length > 0 && (

              <Button

                variant="outline"

                size="sm"

                onClick={() => setShowPlayerCharacter(true)}

                className="h-8 text-xs"

              >

                <User className="h-4 w-4 mr-1" />

                Character

              </Button>

            )}

            

            <Button

              variant="outline"

              size="sm"

              onClick={() => setShowRelationships(true)}

              className="h-8 text-xs"

            >

              <Network className="h-4 w-4 mr-1" />

              Relationships

            </Button>

          </div>



          <div className="flex items-center gap-2">

            <Button variant="outline" onClick={() => onOpenChange(false)} className="h-8 text-xs">

            Close

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

        onSave={(updatedPlayer) => {

          setPlayerData(updatedPlayer);

          onSave(updatedPlayer);

          setShowPersonalData(false);

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

      

      {/* Account Edit Submodal */}

      {accountData && (

        <AccountEditModal

          account={accountData}

          open={showAccountEdit}

          onOpenChange={setShowAccountEdit}

          onSave={async (updatedAccount: any) => {

            // Save Account

            await ClientAPI.upsertAccount(updatedAccount);

            

            // Update Player and Character names to match

            if (playerData) {

              await ClientAPI.upsertPlayer({

                ...playerData,

                name: updatedAccount.name

              });

            }

            

            const character = characters[0];

            if (character) {

              await ClientAPI.upsertCharacter({

                ...character,

                name: updatedAccount.name,

                contactEmail: updatedAccount.email,

                contactPhone: updatedAccount.phone

              });

            }

            

            // Reload data

            setAccountData(updatedAccount);

            setShowAccountEdit(false);

            window.location.reload(); // Refresh to show updated data

          }}

        />

      )}

      

      {/* Exchange Points Modal */}

      <ExchangePointsModal

        player={playerData}

        open={showExchangeModal}

        onOpenChange={setShowExchangeModal}

        onExchange={async (pointsToExchange, j$Received) => {

          // THE ROSETTA STONE WAY: Create Financial Record (DNA)

          // The Ribosome (workflows) will handle the actual point deduction and J$ addition

          

          const currentDate = new Date();

          const exchangeRecord: any = {

            id: `finrec_${Date.now()}`,

            name: `Points to J$ Exchange - ${currentDate.toLocaleDateString()}`,

            description: `Exchanged ${pointsToExchange.hp} HP, ${pointsToExchange.fp} FP, ${pointsToExchange.rp} RP, ${pointsToExchange.xp} XP for ${j$Received} J$`,

            type: 'personal',

            year: currentDate.getFullYear(),

            month: currentDate.getMonth() + 1,

            station: 'Strategy',

            cost: 0,

            revenue: 0, // No USD transaction yet

            jungleCoins: j$Received, // ← The J$ received

            netCashflow: 0,

            notes: `Points Exchange: ${pointsToExchange.hp} HP + ${pointsToExchange.fp} FP + ${pointsToExchange.rp} RP + ${pointsToExchange.xp} XP → ${j$Received} J$`,

            createdAt: currentDate,

            updatedAt: currentDate,

            links: [],

            // ✨ AMBASSADOR FIELD: Points being exchanged (tells Ribosome to deduct)

            metadata: {

              transactionType: 'points-to-j$-exchange',

              pointsExchanged: pointsToExchange

            }

          };

          

          // Save via DataStore → Adapter → Ribosome (The Rosetta Stone Way!)

          await ClientAPI.upsertFinancialRecord(exchangeRecord);

          

          // Reload player data to reflect changes

          const updatedPlayers = await ClientAPI.getPlayers();

          const updatedPlayer = updatedPlayers.find(p => p.id === playerData!.id);

          if (updatedPlayer) {

            setPlayerData(updatedPlayer);

          }

          

          // Reload personal assets to reflect J$ addition

          const updatedAssets = await ClientAPI.getPersonalAssets();

          setPersonalAssets(updatedAssets);

          

          // Close modal

          setShowExchangeModal(false);

          

          // Dispatch events to update other displays

          window.dispatchEvent(new Event('playerUpdated'));

          window.dispatchEvent(new Event('pointsUpdated'));

          window.dispatchEvent(new Event('financialsUpdated'));

        }}

      />

    </>
  );

}

