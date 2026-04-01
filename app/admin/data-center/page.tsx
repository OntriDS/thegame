'use client';

import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { MonthSelector } from '@/components/ui/month-selector';
import { Boxes, Link as LinkIcon, Users, UserCircle, History, Package, Loader2, Calendar, CheckCircle, TrendingUp, Zap, AlertTriangle, X, User, MapPin, ShoppingCart } from 'lucide-react';
import { useState, useEffect, useCallback } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { calculateTaskProfit, calculateTaskProfitPercentage } from '@/lib/utils/business-utils';
import { TaskStatus, EntityType } from '@/types/enums';
import { useThemeColors } from '@/lib/hooks/use-theme-colors';
import { formatDateDDMMYYYY } from '@/lib/constants/date-constants';
import { useUserPreferences } from '@/lib/hooks/use-user-preferences';
import { useEntityUpdates } from '@/lib/hooks/use-entity-updates';
import { TasksLogTab } from '@/components/data-center/tasks-log-tab';
import { ItemsLogTab } from '@/components/data-center/items-log-tab';
import { FinancialsLogTab } from '@/components/data-center/financials-log-tab';
import { CharacterLogTab } from '@/components/data-center/character-log-tab';
import { PlayerLogTab } from '@/components/data-center/player-log-tab';
import { SalesLogTab } from '@/components/data-center/sales-log-tab';
import { SitesLogTab } from '@/components/data-center/sites-log-tab';
import { LinksTab } from '@/components/data-center/links-tab';
import { deduplicateTasksLog } from '@/lib/utils/logging-utils';
import { sortMonthKeys, getCurrentMonthKey } from '@/lib/utils/date-utils';

export default function DataCenterPage() {
  const { textColor } = useThemeColors();
  const { getPreference, setPreference } = useUserPreferences();
  const [characterLog, setCharacterLog] = useState<any>(null);
  const [playerLog, setPlayerLog] = useState<any>(null);
  const [salesLog, setSalesLog] = useState<any>(null);
  const [sitesLog, setSitesLog] = useState<any>(null);
  const [financialsLog, setFinancialsLog] = useState<any>(null);
  const [itemsLog, setItemsLog] = useState<any>(null);
  const [tasksLog, setTasksLog] = useState<any>(null);
  const [logOrder, setLogOrder] = useState<'newest' | 'oldest'>('newest');
  const [isReloading, setIsReloading] = useState(false);

  // Month selector state — shared across all tabs
  const [selectedMonth, setSelectedMonth] = useState<string>(getCurrentMonthKey());
  const [availableMonths, setAvailableMonths] = useState<string[]>([getCurrentMonthKey()]);

  // Generic log loading function — month-aware
  const loadLog = useCallback(async (logType: string, setter: (data: any) => void, isTasksLog = false, month?: string) => {
    try {
      const monthParam = month || selectedMonth;
      const response = await fetch(`/api/${logType}-log?month=${monthParam}`);
      if (response.ok) {
        const data = await response.json();
        // Collect available months from any tab that returns them
        if (data.months && Array.isArray(data.months) && data.months.length > 0) {
          setAvailableMonths(prev => sortMonthKeys(Array.from(new Set([...prev, ...data.months]))));
        }
        if (isTasksLog) {
          setter(deduplicateTasksLog(data));
        } else {
          setter(data);
        }
      }
    } catch (error) {
      // Failed to load log
    }
  }, [selectedMonth]);

  // Main tab state
  const [activeMainTab, setActiveMainTab] = useState<string>('tasks-lifecycle');

  // Sub-tab states
  const [activeTasksSubTab, setActiveTasksSubTab] = useState<string>('lifecycle-log');
  const [activeItemsSubTab, setActiveItemsSubTab] = useState<string>('lifecycle-log');
  const [activeDevSubTab, setActiveDevSubTab] = useState<string>('sprints');
  const [activeFinancialsSubTab, setActiveFinancialsSubTab] = useState<string>('all-financials');

  // Load preferences on mount
  useEffect(() => {
    const savedMainTab = getPreference('data-center-active-main-tab', 'tasks-lifecycle');
    const savedTasksSubTab = getPreference('data-center-active-tasks-sub-tab', 'lifecycle-log');
    const savedItemsSubTab = getPreference('data-center-active-items-sub-tab', 'lifecycle-log');
    const savedDevSubTab = getPreference('data-center-active-dev-sub-tab', 'sprints');
    const savedFinancialsSubTab = getPreference('data-center-active-financials-sub-tab', 'all-financials');

    const normalizedMainTab = savedMainTab === 'player-statistics' ? 'player-log' : savedMainTab;

    setActiveMainTab(normalizedMainTab);
    setActiveTasksSubTab(savedTasksSubTab);
    setActiveItemsSubTab(savedItemsSubTab);
    setActiveDevSubTab(savedDevSubTab);
    setActiveFinancialsSubTab(savedFinancialsSubTab);

    if (normalizedMainTab !== savedMainTab) {
      setPreference('data-center-active-main-tab', normalizedMainTab);
    }
  }, [getPreference, setPreference]);

  // Reload all logs when selectedMonth changes
  useEffect(() => {
    loadLog(EntityType.CHARACTER, setCharacterLog, false, selectedMonth);
    loadLog(EntityType.PLAYER, setPlayerLog, false, selectedMonth);
    loadLog('sales', setSalesLog, false, selectedMonth);
    loadLog('sites', setSitesLog, false, selectedMonth);
    loadLog('financials', setFinancialsLog, false, selectedMonth);
    loadLog('items', setItemsLog, false, selectedMonth);
    loadLog('tasks', setTasksLog, true, selectedMonth);
  }, [selectedMonth, loadLog]); // eslint-disable-line react-hooks/exhaustive-deps

  // Listen for entity updates to refresh relevant log (stays on currently selected month)
  useEntityUpdates('financial', () => loadLog('financials', setFinancialsLog, false, selectedMonth));
  useEntityUpdates('item', () => loadLog('items', setItemsLog, false, selectedMonth));
  useEntityUpdates('task', () => loadLog('tasks', setTasksLog, true, selectedMonth));

  // Reload all logs (keeps same month)
  const handleReloadLogs = async () => {
    setIsReloading(true);
    try {
      const month = selectedMonth;
      const [characterResponse, playerResponse, salesResponse, sitesResponse, financialsResponse, itemsResponse, tasksResponse] = await Promise.all([
        fetch(`/api/character-log?month=${month}`),
        fetch(`/api/player-log?month=${month}`),
        fetch(`/api/sales-log?month=${month}`),
        fetch(`/api/sites-log?month=${month}`),
        fetch(`/api/financials-log?month=${month}`),
        fetch(`/api/items-log?month=${month}`),
        fetch(`/api/tasks-log?month=${month}`)
      ]);

      if (characterResponse.ok) {
        const data = await characterResponse.json();
        setCharacterLog(data);
        if (data.months) setAvailableMonths(prev => sortMonthKeys(Array.from(new Set([...prev, ...data.months]))));
      }
      if (playerResponse.ok) {
        const data = await playerResponse.json();
        setPlayerLog(data);
        if (data.months) setAvailableMonths(prev => sortMonthKeys(Array.from(new Set([...prev, ...data.months]))));
      }
      if (salesResponse.ok) {
        const data = await salesResponse.json();
        setSalesLog(data);
        if (data.months) setAvailableMonths(prev => sortMonthKeys(Array.from(new Set([...prev, ...data.months]))));
      }
      if (sitesResponse.ok) {
        const data = await sitesResponse.json();
        setSitesLog(data);
        if (data.months) setAvailableMonths(prev => sortMonthKeys(Array.from(new Set([...prev, ...data.months]))));
      }
      if (financialsResponse.ok) {
        const data = await financialsResponse.json();
        setFinancialsLog(data);
        if (data.months) setAvailableMonths(prev => sortMonthKeys(Array.from(new Set([...prev, ...data.months]))));
      }
      if (itemsResponse.ok) {
        const data = await itemsResponse.json();
        setItemsLog(data);
        if (data.months) setAvailableMonths(prev => sortMonthKeys(Array.from(new Set([...prev, ...data.months]))));
      }
      if (tasksResponse.ok) {
        const data = await tasksResponse.json();
        setTasksLog(deduplicateTasksLog(data));
        if (data.months) {
          setAvailableMonths(prev => sortMonthKeys(Array.from(new Set([...prev, ...data.months]))));
        }
      }
    } catch (error) {
      console.error('Error reloading logs:', error);
    } finally {
      setIsReloading(false);
    }
  };


  return (
    <div className="container mx-auto px-6 space-y-6 ">
      <Tabs value={activeMainTab} onValueChange={(value) => {
        setActiveMainTab(value);
        setPreference('data-center-active-main-tab', value);
      }} className="w-full">
        {/* Month Selector — shown above all tabs */}
        <div className="flex items-center justify-between mb-2">
          <MonthSelector
            selectedMonth={selectedMonth}
            availableMonths={availableMonths}
            onChange={setSelectedMonth}
          />
        </div>

        <TabsList className="grid w-full grid-cols-8">
          <TabsTrigger value="tasks-lifecycle" className="flex items-center gap-2">
            <CheckCircle className="h-4 w-4" />
            Tasks
          </TabsTrigger>
          <TabsTrigger value="items-lifecycle" className="flex items-center gap-2">
            <TrendingUp className="h-4 w-4" />
            Items
          </TabsTrigger>
          <TabsTrigger value="financials-history" className="flex items-center gap-2">
            <TrendingUp className="h-4 w-4" />
            Financials
          </TabsTrigger>
          <TabsTrigger value="sales-log" className="flex items-center gap-2">
            <ShoppingCart className="h-4 w-4" />
            Sales
          </TabsTrigger>
          <TabsTrigger value="characters-log" className="flex items-center gap-2">
            <Zap className="h-4 w-4" />
            Characters
          </TabsTrigger>
          <TabsTrigger value="player-log" className="flex items-center gap-2">
            <User className="h-4 w-4" />
            Player
          </TabsTrigger>
          <TabsTrigger value="sites-log" className="flex items-center gap-2">
            <MapPin className="h-4 w-4" />
            Sites
          </TabsTrigger>
          <TabsTrigger value="links-debug" className="flex items-center gap-2">
            <LinkIcon className="h-4 w-4" />
            Links Graph
          </TabsTrigger>
        </TabsList>

        {/* Tasks Lifecycle Tab */}
        <TabsContent value="tasks-lifecycle" className="space-y-4">
          <TasksLogTab
            tasksLog={tasksLog}
            onReload={handleReloadLogs}
            isReloading={isReloading}
          />
        </TabsContent>

        {/* Items Lifecycle Tab */}
        <TabsContent value="items-lifecycle" className="space-y-4">
          <ItemsLogTab
            itemsLog={itemsLog}
            onReload={handleReloadLogs}
            isReloading={isReloading}
          />
        </TabsContent>

        {/* Financials Log Tab */}
        <TabsContent value="financials-history" className="space-y-4">
          <FinancialsLogTab
            financialsLog={financialsLog}
            onReload={handleReloadLogs}
            isReloading={isReloading}
          />
        </TabsContent>

        {/* Sales Log Tab */}
        <TabsContent value="sales-log" className="space-y-4">
          <SalesLogTab
            salesLog={salesLog}
            onReload={handleReloadLogs}
            isReloading={isReloading}
          />
        </TabsContent>

        {/* Characters Log Tab */}
        <TabsContent value="characters-log" className="space-y-4">
          <CharacterLogTab
            characterLog={characterLog}
            onReload={handleReloadLogs}
            isReloading={isReloading}
          />
        </TabsContent>

        {/* Player Log Tab */}
        <TabsContent value="player-log" className="space-y-4">
          <PlayerLogTab
            playerLog={playerLog}
            onReload={handleReloadLogs}
            isReloading={isReloading}
          />
        </TabsContent>

        {/* Sites Log Tab */}
        <TabsContent value="sites-log" className="space-y-4">
          <SitesLogTab
            sitesLog={sitesLog}
            onReload={handleReloadLogs}
            isReloading={isReloading}
          />
        </TabsContent>

        {/* All links in the link registry (KV), not entity lifecycle logs */}
        <TabsContent value="links-debug" className="space-y-4">
          <LinksTab
            onReload={handleReloadLogs}
            isReloading={isReloading}
          />
        </TabsContent>



      </Tabs>

    </div>
  );
}
