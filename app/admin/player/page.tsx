'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useEntityUpdates } from '@/lib/hooks/use-entity-updates';
import { ClientAPI } from '@/lib/client-api';
import { PLAYER_ONE_ID } from '@/types/enums';
import type { Player } from '@/types/entities';
import { Coins, TrendingUp, User } from 'lucide-react';
import { PlayerModal } from '@/components/modals/player-modal';
import ConversionRatesModal from '@/components/modals/submodals/conversion-rates-submodal';
import { useKeyboardShortcuts } from '@/lib/hooks/use-keyboard-shortcuts';

type PointMap = {
  xp: number;
  rp: number;
  fp: number;
  hp: number;
};

const ZERO_POINTS: PointMap = { xp: 0, rp: 0, fp: 0, hp: 0 };

function addPoints(target: PointMap, addition: Partial<PointMap> | null | undefined) {
  if (!addition) return;
  target.xp += addition.xp ? Number(addition.xp) : 0;
  target.rp += addition.rp ? Number(addition.rp) : 0;
  target.fp += addition.fp ? Number(addition.fp) : 0;
  target.hp += addition.hp ? Number(addition.hp) : 0;
}

function clampNonNegative(delta: PointMap): PointMap {
  return {
    xp: Math.max(delta.xp, 0),
    rp: Math.max(delta.rp, 0),
    fp: Math.max(delta.fp, 0),
    hp: Math.max(delta.hp, 0),
  };
}

function createZeroPoints(): PointMap {
  return { ...ZERO_POINTS };
}

function calculateUnexchangedPoints(entries: any[], monthStart: Date): PointMap {
  const earned = createZeroPoints();
  const exchanged = createZeroPoints();

  for (const entry of entries ?? []) {
    const timestamp = entry?.timestamp || entry?.createdAt || entry?.updatedAt;
    if (!timestamp) continue;

    const entryDate = new Date(timestamp);
    if (Number.isNaN(entryDate.getTime())) continue;
    if (entryDate < monthStart) continue;

    if (entry?.event === 'WIN_POINTS') {
      addPoints(earned, entry.points);
    }

    if (entry?.pointsExchanged) {
      addPoints(exchanged, entry.pointsExchanged);
    }
  }

  return clampNonNegative({
    xp: earned.xp - exchanged.xp,
    rp: earned.rp - exchanged.rp,
    fp: earned.fp - exchanged.fp,
    hp: earned.hp - exchanged.hp,
  });
}

function calculatePreview(points: PointMap, rates: Record<string, number>) {
  const safeDiv = (value: number, rate: number | undefined) =>
    rate && rate > 0 ? value / rate : 0;

  const xpPreview = safeDiv(points.xp, rates.xpToJ$);
  const rpPreview = safeDiv(points.rp, rates.rpToJ$);
  const fpPreview = safeDiv(points.fp, rates.fpToJ$);
  const hpPreview = safeDiv(points.hp, rates.hpToJ$);
  const totalPreview = xpPreview + rpPreview + fpPreview + hpPreview;

  return {
    xpPreview,
    rpPreview,
    fpPreview,
    hpPreview,
    totalPreview,
  };
}

export default function PlayerPage() {
  const [players, setPlayers] = useState<Player[]>([]);
  const [playerLog, setPlayerLog] = useState<any[]>([]);
  const [conversionRates, setConversionRates] = useState({
    xpToJ$: 1,
    rpToJ$: 1,
    fpToJ$: 1,
    hpToJ$: 1,
    j$ToUSD: 10,
  });
  const [personalAssets, setPersonalAssets] = useState<any | null>(null);
  const [jungleCoinsBalance, setJungleCoinsBalance] = useState<number | undefined>(undefined);
  const [unexchangedPoints, setUnexchangedPoints] = useState<PointMap>(ZERO_POINTS);
  const [showPlayerModal, setShowPlayerModal] = useState(false);
  const [selectedPlayer, setSelectedPlayer] = useState<Player | null>(null);
  const [showConversionRatesModal, setShowConversionRatesModal] = useState(false);
  const [isHydrated, setIsHydrated] = useState(false);

  const isLoadingRef = useRef(false);
  const lastRefreshRef = useRef(0);

  const monthStart = useMemo(() => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), 1);
  }, []);

  const mainPlayer = useMemo(() => {
    if (!players?.length) return null;
    return players.find((p) => p.id === PLAYER_ONE_ID) || players[0];
  }, [players]);

  const handlePlayerModalOpen = useCallback(
    (player?: Player | null) => {
      setSelectedPlayer(player ?? mainPlayer ?? null);
      setShowPlayerModal(true);
    },
    [mainPlayer],
  );

  useKeyboardShortcuts({
    onOpenPlayerModal: () => handlePlayerModalOpen(mainPlayer ?? undefined),
  });

  const computeAndSetUnexchanged = useCallback(
    (entries: any[]) => {
      const unexchanged = calculateUnexchangedPoints(entries, monthStart);
      setUnexchangedPoints(unexchanged);
    },
    [monthStart],
  );

  const loadData = useCallback(async () => {
    if (isLoadingRef.current) return;
    isLoadingRef.current = true;
    try {
      const [
        playerLogData,
        ratesData,
        playersData,
        personalAssetsData,
      ] = await Promise.all([
        ClientAPI.getPlayerLog(),
        ClientAPI.getPlayerConversionRates(),
        ClientAPI.getPlayers(),
        ClientAPI.getPersonalAssets(),
      ]);

      const entries = playerLogData?.entries ?? [];
      setPlayerLog(entries);
      setConversionRates((prev) => ({
        xpToJ$: Number(ratesData?.xpToJ$ ?? prev.xpToJ$ ?? 1),
        rpToJ$: Number(ratesData?.rpToJ$ ?? prev.rpToJ$ ?? 1),
        fpToJ$: Number(ratesData?.fpToJ$ ?? prev.fpToJ$ ?? 1),
        hpToJ$: Number(ratesData?.hpToJ$ ?? prev.hpToJ$ ?? 1),
        j$ToUSD: Number(ratesData?.j$ToUSD ?? prev.j$ToUSD ?? 10),
      }));
      setPlayers(playersData ?? []);
      setPersonalAssets(personalAssetsData ?? null);
      
      // Fetch J$ balance for the main player (multiplayer-ready)
      const mainPlayerId = playersData?.find((p) => p.id === PLAYER_ONE_ID)?.id || playersData?.[0]?.id;
      if (mainPlayerId) {
        try {
          const j$BalanceData = await ClientAPI.getPlayerJungleCoinsBalance(mainPlayerId);
          setJungleCoinsBalance(j$BalanceData?.totalJ$ ?? 0);
        } catch (error) {
          console.error('Failed to fetch J$ balance:', error);
          setJungleCoinsBalance(0);
        }
      } else {
        setJungleCoinsBalance(0);
      }
      computeAndSetUnexchanged(entries);
      setIsHydrated(true);
    } catch (error) {
      console.error('[Player Page] Failed to load data:', error);
    } finally {
      isLoadingRef.current = false;
      lastRefreshRef.current = Date.now();
    }
  }, [computeAndSetUnexchanged]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleUpdate = useCallback(() => {
    const now = Date.now();
    if (isLoadingRef.current) return;
    if (now - lastRefreshRef.current < 1000) return;
    loadData();
  }, [loadData]);

  useEntityUpdates('player', handleUpdate);

  const handlePlayerSave = useCallback(async (player: Player) => {
    try {
      await ClientAPI.upsertPlayer(player);
      setShowPlayerModal(false);
      setSelectedPlayer(null);
      await loadData();
    } catch (error) {
      console.error('Failed to save player:', error);
      alert('Failed to save player');
    }
  }, [loadData]);

  const preview = useMemo(
    () => calculatePreview(unexchangedPoints, conversionRates),
    [unexchangedPoints, conversionRates],
  );

  const jHoldings = jungleCoinsBalance ?? 0;

  if (!isHydrated) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold">Player</h1>
        </div>
        <div className="flex items-center justify-center h-64">
          <div className="text-muted-foreground">Loading player data...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Player</h1>
          {mainPlayer?.name && (
            <p className="text-sm text-muted-foreground mt-1">
              Managing profile for <span className="font-medium">{mainPlayer.name}</span>
            </p>
          )}
        </div>
        <div className="flex items-center gap-2">
          <Button
            onClick={() => handlePlayerModalOpen(mainPlayer ?? undefined)}
            size="sm"
            variant="default"
            className="flex items-center gap-2"
          >
            <User className="h-4 w-4" />
            Player Modal
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-xl">
            <TrendingUp className="h-5 w-5 text-primary" />
            Current Month Holdings
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
            {[
              { key: 'xp', label: 'XP', description: 'Experience' },
              { key: 'rp', label: 'RP', description: 'Research' },
              { key: 'fp', label: 'FP', description: 'Family' },
              { key: 'hp', label: 'HP', description: 'Health' },
            ].map((point) => (
              <div key={point.key} className="text-center p-3 bg-muted/30 rounded-lg">
                <div className="text-xs font-medium text-muted-foreground mb-1">{point.label}</div>
                <div className="text-2xl font-bold">{unexchangedPoints[point.key as keyof PointMap]}</div>
                <div className="text-xs text-muted-foreground mt-1">{point.description}</div>
              </div>
            ))}
            <div className="text-center p-3 bg-primary/10 rounded-lg border-2 border-primary/20">
              <div className="text-xs font-medium text-muted-foreground mb-1">Jungle Coins</div>
              <div className="text-xl font-bold text-primary">{jHoldings.toFixed(1)} J$</div>
              <div className="text-xs text-muted-foreground mt-1">
                ${(jHoldings * conversionRates.j$ToUSD).toFixed(2)} USD
              </div>
            </div>
            <div className="text-center p-3 bg-muted/30 rounded-lg border border-dashed opacity-60">
              <div className="text-xs font-medium text-muted-foreground mb-1">Zap Coins</div>
              <div className="text-xl font-bold text-muted-foreground">0 Z₿</div>
              <div className="text-xs text-muted-foreground mt-1">(Coming soon)</div>
            </div>
          </div>

          <div className="border-t pt-4">
            <div className="flex items-center gap-2 mb-3">
              <Coins className="h-4 w-4 text-primary" />
              <span className="font-semibold text-sm">Exchange Preview — Current Month Points</span>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4 text-sm">
              {[
                { key: 'xpPreview', label: 'XP → J$' },
                { key: 'rpPreview', label: 'RP → J$' },
                { key: 'fpPreview', label: 'FP → J$' },
                { key: 'hpPreview', label: 'HP → J$' },
              ].map((item) => (
                <div key={item.key} className="p-3 bg-muted/20 rounded-lg text-center">
                  <div className="text-xs text-muted-foreground mb-1">{item.label}</div>
                  <div className="text-lg font-semibold">
                    {preview[item.key as keyof typeof preview].toFixed(2)} J$
                  </div>
                </div>
              ))}
              <div className="p-3 bg-primary/10 rounded-lg text-center border-2 border-primary/20">
                <div className="text-xs text-muted-foreground mb-1">Total Preview</div>
                <div className="text-lg font-semibold text-primary">
                  {preview.totalPreview.toFixed(2)} J$
                </div>
                <div className="text-xs text-muted-foreground">
                  ≈ ${(preview.totalPreview * conversionRates.j$ToUSD).toFixed(2)} USD
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg">Conversion Rates</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap items-center gap-6 text-sm">
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

      {showConversionRatesModal && (
        <ConversionRatesModal
          isOpen={showConversionRatesModal}
          onClose={() => setShowConversionRatesModal(false)}
          onSave={async (rates: any) => {
            try {
              await ClientAPI.savePlayerConversionRates(rates);
              setShowConversionRatesModal(false);
              await loadData();
            } catch (error) {
              console.error('Failed to save conversion rates:', error);
            }
          }}
        />
      )}

      <PlayerModal
        player={selectedPlayer}
        open={showPlayerModal}
        onOpenChange={setShowPlayerModal}
        onSave={handlePlayerSave}
      />
    </div>
  );
}

