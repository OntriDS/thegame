'use client';

import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { FileText, Calendar, CheckCircle, TrendingUp, Zap, AlertTriangle, X, User, MapPin, ShoppingCart } from 'lucide-react';
import { useState, useEffect, useCallback } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { calculateTaskProfit, calculateTaskProfitPercentage } from '@/lib/utils/business-utils';
import { TaskStatus } from '@/types/enums';
import { useThemeColors } from '@/lib/hooks/use-theme-colors';
import { formatDateDDMMYYYY } from '@/lib/constants/date-constants';
import { SprintCompletionModal } from '@/components/research/sprint-completion-modal';
import { useUserPreferences } from '@/lib/hooks/use-user-preferences';
import { TasksLifecycleTab } from '@/components/data-center/tasks-lifecycle-tab';
import { ItemsLifecycleTab } from '@/components/data-center/items-lifecycle-tab';
import { DevSprintsTab } from '@/components/data-center/dev-sprints-tab';
import { FinancialsTab } from '@/components/data-center/financials-tab';
import { CharacterLogTab } from '@/components/data-center/character-log-tab';
import { PlayerLogTab } from '@/components/data-center/player-log-tab';
import { SalesLogTab } from '@/components/data-center/sales-log-tab';
import { SitesLogTab } from '@/components/data-center/sites-log-tab';
import { LinksTab } from '@/components/data-center/links-tab';
import { updatePhaseStatus, logPhaseCompletion, cyclePhaseStatus } from '@/lib/utils/phase-status-utils';
import { deduplicateTasksLog } from '@/lib/utils/logging-utils';
import { DEFAULT_STORAGE_MODE, StorageMode } from '@/lib/constants/storage-constants';

export default function DataCenterPage() {
  const { textColor } = useThemeColors();
  const { getPreference, setPreference } = useUserPreferences();
  const [projectStatus, setProjectStatus] = useState<any>(null);
  const [devLog, setDevLog] = useState<any>(null);
  const [characterLog, setCharacterLog] = useState<any>(null);
  const [playerLog, setPlayerLog] = useState<any>(null);
  const [salesLog, setSalesLog] = useState<any>(null);
  const [sitesLog, setSitesLog] = useState<any>(null);
  const [financialsLog, setFinancialsLog] = useState<any>(null);
  const [itemsLog, setItemsLog] = useState<any>(null);
  const [tasksLog, setTasksLog] = useState<any>(null);
  const [logOrder, setLogOrder] = useState<'newest' | 'oldest'>('newest');
  const [showSprintCompletionModal, setShowSprintCompletionModal] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const [incompletePhases, setIncompletePhases] = useState<string[]>([]);
  const [isReloading, setIsReloading] = useState(false);
  
  // Use the same environment detection as the rest of the system
  const isKVEnvironment = DEFAULT_STORAGE_MODE === StorageMode.HYBRID;
  
  // Helper function to get the correct API URL
  const getLogApiUrl = useCallback((logType: string) => {
    return isKVEnvironment 
      ? `/api/${logType}-log` 
      : `/api/local-logs?logType=${logType}`;
  }, [isKVEnvironment]);
  
  // Helper function to parse log response
  const parseLogResponse = useCallback(async (response: Response, isTasksLog = false) => {
    if (isKVEnvironment && isTasksLog) {
      // Production tasks-log returns text that needs special parsing
      const text = await response.text();
      return (() => { try { return JSON.parse(text); } catch { return { entries: [] }; } })();
    } else {
      // All other cases return JSON directly
      return await response.json();
    }
  }, [isKVEnvironment]);
  
  // Generic log loading function
  const loadLog = useCallback(async (logType: string, setter: (data: any) => void, isTasksLog = false) => {
    try {
      const response = await fetch(getLogApiUrl(logType));
      if (response.ok) {
        const data = await parseLogResponse(response, isTasksLog);
        if (isTasksLog) {
          setter(deduplicateTasksLog(data));
        } else {
          setter(data);
        }
      }
    } catch (error) {
      // Failed to load log
    }
  }, [getLogApiUrl, parseLogResponse]);
  
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

  // Load project status from API
  useEffect(() => {
    const loadProjectStatus = async () => {
      try {
        const response = await fetch('/api/project-status');
        if (response.ok) {
          const data = await response.json();
          setProjectStatus(data);
        }
      } catch (error) {
        // Failed to load project status from API
      }
    };

    loadProjectStatus();
  }, []);

  // Load dev log
  useEffect(() => {
    const loadDevLog = async () => {
      try {
        const response = await fetch('/api/dev-log');
        if (response.ok) {
          const data = await response.json();
          setDevLog(data);
        }
      } catch (error) {
        // Failed to load Dev log
      }
    };

    loadDevLog();
  }, []);

  // Load character log
  useEffect(() => {
    loadLog('character', setCharacterLog);
  }, [loadLog]);

  // Load player log
  useEffect(() => {
    loadLog('player', setPlayerLog);
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
  useEffect(() => {
    const handleFinancialsUpdate = () => {
      loadLog('financials', setFinancialsLog);
    };

    window.addEventListener('financialsUpdated', handleFinancialsUpdate);
    return () => {
      window.removeEventListener('financialsUpdated', handleFinancialsUpdate);
    };
  }, [loadLog]);

  // Load items log
  useEffect(() => {
    loadLog('items', setItemsLog);
  }, [loadLog]);

  // Listen for items updates to refresh items log
  useEffect(() => {
    const handleItemsUpdate = () => {
      loadLog('items', setItemsLog);
    };

    window.addEventListener('itemsUpdated', handleItemsUpdate);
    return () => {
      window.removeEventListener('itemsUpdated', handleItemsUpdate);
    };
  }, [loadLog]);

  // Load tasks log
  useEffect(() => {
    loadLog('tasks', setTasksLog, true);
  }, [loadLog]);

  // Listen for tasks updates to refresh tasks log
  useEffect(() => {
    const handleTasksUpdate = () => {
      loadLog('tasks', setTasksLog, true);
    };

    window.addEventListener('tasksUpdated', handleTasksUpdate);
    return () => {
      window.removeEventListener('tasksUpdated', handleTasksUpdate);
    };
  }, [loadLog]);

  // Phase status management using utilities
  const handleCyclePhaseStatus = async (phaseKey: string) => {
    await cyclePhaseStatus(phaseKey, projectStatus, handleUpdatePhaseStatus);
  };

  const handleUpdatePhaseStatus = async (phaseKey: string, newStatus: string) => {
    await updatePhaseStatus(phaseKey, newStatus, projectStatus);
    
    // Reload project status after update
    const statusResponse = await fetch('/api/project-status');
    if (statusResponse.ok) {
      const statusData = await statusResponse.json();
      setProjectStatus(statusData);
    }
    
    // Reload dev log after update (especially important when phase is marked as "Done")
    const devLogResponse = await fetch('/api/dev-log');
    if (devLogResponse.ok) {
      const devLogData = await devLogResponse.json();
      setDevLog(devLogData);
    }
  };

  // Reload all logs (all 7 entity logs)
  const handleReloadLogs = async () => {
    setIsReloading(true);
    try {
      // Reload all 7 entity logs + dev log
      const [devResponse, characterResponse, playerResponse, salesResponse, sitesResponse, financialsResponse, itemsResponse, tasksResponse] = await Promise.all([
        fetch('/api/dev-log'),
        fetch(getLogApiUrl('character')),
        fetch(getLogApiUrl('player')),
        fetch(getLogApiUrl('sales')),
        fetch(getLogApiUrl('sites')),
        fetch(getLogApiUrl('financials')),
        fetch(getLogApiUrl('items')),
        fetch(getLogApiUrl('tasks'))
      ]);

      if (devResponse.ok) {
        const data = await devResponse.json();
        setDevLog(data);
      }
      if (characterResponse.ok) {
        const data = await parseLogResponse(characterResponse);
        setCharacterLog(data);
      }
      if (playerResponse.ok) {
        const data = await parseLogResponse(playerResponse);
        setPlayerLog(data);
      }
      if (salesResponse.ok) {
        const data = await parseLogResponse(salesResponse);
        setSalesLog(data);
      }
      if (sitesResponse.ok) {
        const data = await parseLogResponse(sitesResponse);
        setSitesLog(data);
      }
      if (financialsResponse.ok) {
        const data = await parseLogResponse(financialsResponse);
        setFinancialsLog(data);
      }
      if (itemsResponse.ok) {
        const data = await parseLogResponse(itemsResponse);
        setItemsLog(data);
      }
      if (tasksResponse.ok) {
        const data = await parseLogResponse(tasksResponse, true);
        setTasksLog(deduplicateTasksLog(data));
      }
    } catch (error) {
      console.error('Error reloading logs:', error);
    } finally {
      setIsReloading(false);
    }
  };

  const handleSprintCompletion = async () => {
    if (!projectStatus || !projectStatus.phasePlan) return;

    // Check if all phases are "Done"
    const incompletePhasesList = Object.entries(projectStatus.phasePlan)
      .filter(([phaseKey, phase]: [string, any]) => phase.status !== 'Done')
      .map(([phaseKey, phase]: [string, any]) => phase.phaseName);

    if (incompletePhasesList.length > 0) {
      setIncompletePhases(incompletePhasesList);
      setShowSprintCompletionModal(true);
      return;
    }

    // Check if nextSprintPlan exists and has phases
    if (!projectStatus.nextSprintPlan || 
        Object.keys(projectStatus.nextSprintPlan).length === 0) {
      alert('Next sprint plan is not ready. Please ensure it has at least one phase.');
      return;
    }

    try {
      const response = await fetch('/api/sprint-completion', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          currentSprintNumber: projectStatus.currentSprintNumber,
          currentSprintName: projectStatus.currentSprint,
          phasePlan: projectStatus.phasePlan
        }),
      });

      if (response.ok) {
        // Reload project status to get updated data
        const statusResponse = await fetch('/api/project-status');
        if (statusResponse.ok) {
          const data = await statusResponse.json();
          setProjectStatus(data);
        }

        // Reload dev log to show completion entry
        const devLogResponse = await fetch('/api/dev-log');
        if (devLogResponse.ok) {
          const data = await devLogResponse.json();
          setDevLog(data);
        }
        
        setSuccessMessage('Sprint completed successfully!');
        setShowSuccessModal(true);
      } else {
        const errorText = await response.text();
        console.error('Failed to complete sprint:', errorText);
        setSuccessMessage('Failed to complete sprint. Please try again.');
        setShowSuccessModal(true);
      }
    } catch (error) {
      console.error('Error completing sprint:', error);
      setSuccessMessage('Error completing sprint. Please try again.');
      setShowSuccessModal(true);
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
            projectStatus={projectStatus}
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

        {/* Dev Log Tab - Moving to Research */}
        <TabsContent value="dev-log" className="space-y-4">
          <DevSprintsTab 
            projectStatus={projectStatus}
            devLog={devLog}
            onReload={handleReloadLogs}
            isReloading={isReloading}
            onCyclePhaseStatus={handleCyclePhaseStatus}
            onCheckSprintCompletion={handleSprintCompletion}
          />
                </TabsContent>
                

      </Tabs>

      {/* Sprint Completion Modal */}
      <SprintCompletionModal
        isOpen={showSprintCompletionModal}
        onClose={() => setShowSprintCompletionModal(false)}
        onConfirm={() => setShowSprintCompletionModal(false)}
        incompletePhases={incompletePhases}
        currentSprintNumber={projectStatus?.currentSprintNumber || 0}
        currentSprintName={projectStatus?.currentSprint || ''}
      />
      
      {/* Success/Error Modal */}
      {showSuccessModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                {successMessage.includes('successfully') ? (
                  <CheckCircle className="h-6 w-6 text-green-500" />
                ) : (
                  <AlertTriangle className="h-6 w-6 text-red-500" />
                )}
                <h3 className="text-lg font-semibold">
                  {successMessage.includes('successfully') ? 'Success' : 'Error'}
                </h3>
              </div>
              <button
                onClick={() => setShowSuccessModal(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <p className="text-gray-700 mb-4">{successMessage}</p>
            <Button 
              onClick={() => setShowSuccessModal(false)}
              className="w-full"
            >
              OK
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
