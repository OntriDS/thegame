'use client';

import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { FileText, Calendar, CheckCircle, TrendingUp, Zap, AlertTriangle, X, User, MapPin, ShoppingCart } from 'lucide-react';
import { useState, useEffect, useCallback } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { calculateTaskProfit, calculateTaskProfitPercentage } from '@/lib/utils/business-utils';
import { TaskStatus, EntityType } from '@/types/enums';
import { useThemeColors } from '@/lib/hooks/use-theme-colors';
import { formatDateDDMMYYYY } from '@/lib/constants/date-constants';
import { useUserPreferences } from '@/lib/hooks/use-user-preferences';
import { useEntityUpdates } from '@/lib/hooks/use-entity-updates';
import { TasksLifecycleTab } from '@/components/data-center/tasks-lifecycle-tab';
import { ItemsLifecycleTab } from '@/components/data-center/items-lifecycle-tab';
import { FinancialsTab } from '@/components/data-center/financials-tab';
import { CharacterLogTab } from '@/components/data-center/character-log-tab';
import { PlayerLogTab } from '@/components/data-center/player-log-tab';
import { SalesLogTab } from '@/components/data-center/sales-log-tab';
import { SitesLogTab } from '@/components/data-center/sites-log-tab';
import { LinksTab } from '@/components/data-center/links-tab';
import { deduplicateTasksLog } from '@/lib/utils/logging-utils';

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
  
  
  // Generic log loading function
  const loadLog = useCallback(async (logType: string, setter: (data: any) => void, isTasksLog = false) => {
    try {
      const response = await fetch(`/api/${logType}-log`);
      if (response.ok) {
        const data = await response.json();
        if (isTasksLog) {
          setter(deduplicateTasksLog(data));
        } else {
          setter(data);
        }
      }
    } catch (error) {
      // Failed to load log
    }
  }, []);
  
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


  // Load character log
  useEffect(() => {
    loadLog(EntityType.CHARACTER, setCharacterLog);
  }, [loadLog]);

  // Load player log
  useEffect(() => {
    loadLog(EntityType.PLAYER, setPlayerLog);
  }, [loadLog]);

  // Load sales log
  useEffect(() => {
    loadLog('sales', setSalesLog);
  }, [loadLog]);

  // Load sites log
  useEffect(() => {
    loadLog('sites', setSitesLog);
  }, [loadLog]);

  // Load financials log
  useEffect(() => {
    loadLog('financials', setFinancialsLog);
  }, [loadLog]);

  // Listen for financials updates to refresh financials log
  useEntityUpdates('financial', () => loadLog('financials', setFinancialsLog));

  // Load items log
  useEffect(() => {
    loadLog('items', setItemsLog);
  }, [loadLog]);

  // Listen for items updates to refresh items log
  useEntityUpdates('item', () => loadLog('items', setItemsLog));

  // Load tasks log
  useEffect(() => {
    loadLog('tasks', setTasksLog, true);
  }, [loadLog]);

  // Listen for tasks updates to refresh tasks log
  useEntityUpdates('task', () => loadLog('tasks', setTasksLog, true));


  // Reload all logs (all 7 entity logs)
  const handleReloadLogs = async () => {
    setIsReloading(true);
    try {
      // Reload all 7 entity logs
      const [characterResponse, playerResponse, salesResponse, sitesResponse, financialsResponse, itemsResponse, tasksResponse] = await Promise.all([
        fetch('/api/character-log'),
        fetch('/api/player-log'),
        fetch('/api/sales-log'),
        fetch('/api/sites-log'),
        fetch('/api/financials-log'),
        fetch('/api/items-log'),
        fetch('/api/tasks-log')
      ]);

      if (characterResponse.ok) {
        const data = await characterResponse.json();
        setCharacterLog(data);
      }
      if (playerResponse.ok) {
        const data = await playerResponse.json();
        setPlayerLog(data);
      }
      if (salesResponse.ok) {
        const data = await salesResponse.json();
        setSalesLog(data);
      }
      if (sitesResponse.ok) {
        const data = await sitesResponse.json();
        setSitesLog(data);
      }
      if (financialsResponse.ok) {
        const data = await financialsResponse.json();
        setFinancialsLog(data);
      }
      if (itemsResponse.ok) {
        const data = await itemsResponse.json();
        setItemsLog(data);
      }
      if (tasksResponse.ok) {
        const data = await tasksResponse.json();
        setTasksLog(deduplicateTasksLog(data));
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
            <FileText className="h-4 w-4" />
            Links
          </TabsTrigger>
        </TabsList>

        {/* Tasks Lifecycle Tab */}
        <TabsContent value="tasks-lifecycle" className="space-y-4">
          <TasksLifecycleTab 
            tasksLog={tasksLog}
            onReload={handleReloadLogs}
            isReloading={isReloading}
          />
        </TabsContent>

        {/* Items Lifecycle Tab */}
        <TabsContent value="items-lifecycle" className="space-y-4">
          <ItemsLifecycleTab 
            itemsLog={itemsLog}
            onReload={handleReloadLogs}
            isReloading={isReloading}
          />
                </TabsContent>
                
        {/* Financials Log Tab */}
        <TabsContent value="financials-history" className="space-y-4">
          <FinancialsTab 
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

        {/* Links Tab - The Rosetta Stone */}
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
