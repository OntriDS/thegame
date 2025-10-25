'use client';

import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { BookOpen, Map, FileText, Compass, Zap, CheckCircle, AlertTriangle, X } from 'lucide-react';
import { useState, useEffect, Suspense } from 'react';
import { NotebookType } from '@/types/enums';
import { useUserPreferences } from '@/lib/hooks/use-user-preferences';
import { NotesTab } from '@/components/research/notes-tab';
import { RoadmapsTab } from '@/components/research/roadmaps-tab';
import { DiagramsTab } from '@/components/research/diagrams-tab';
import { SystemDevelopmentTab } from '@/components/research/system-development-tab';
import { DevSprintsTab } from '@/components/data-center/dev-sprints-tab';

function ResearchPageContent() {
  const { getPreference, setPreference } = useUserPreferences();
  const [notes, setNotes] = useState<any[]>([]);
  const [projectStatus, setProjectStatus] = useState<any>(null);
  const [devLog, setDevLog] = useState<any>(null);
  const [isReloading, setIsReloading] = useState(false);
  const [activeTab, setActiveTab] = useState('system-development');
  const [notebooks, setNotebooks] = useState<any[]>([]);
  const [isClient, setIsClient] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');

  // SSR Guard: Only run client-side code after hydration
  useEffect(() => {
    setIsClient(true);
  }, []);

  // Load preferences and URL tab on mount (client-side only)
  useEffect(() => {
    if (!isClient) return;
    
    const savedTab = getPreference('research-active-tab', 'system-development');
    
    // Get URL tab from window.location.search
    const params = new URLSearchParams(window.location.search);
    const urlTab = params.get('tab');
    
    // URL tab takes precedence over saved preference
    setActiveTab(urlTab || savedTab);
  }, [getPreference, isClient]);

  // Update URL and preferences when tab changes (client-side only)
  const handleTabChange = (value: string) => {
    if (!isClient) return;
    
    setActiveTab(value);
    setPreference('research-active-tab', value);
    
    // SSR Guard for window object
    if (typeof window !== 'undefined') {
      const url = new URL(window.location.href);
      url.searchParams.set('tab', value);
      window.history.replaceState({}, '', url.toString());
    }
  };

  // Load project status from API (client-side only)
  useEffect(() => {
    if (!isClient) return;
    
    const loadProjectStatus = async () => {
      console.log('🔥 [Research Page] Loading project status...');
      try {
        const response = await fetch('/api/project-status');
        console.log('🔥 [Research Page] Project status response:', response.status, response.statusText);
        
        if (response.ok) {
          const data = await response.json();
          console.log('🔥 [Research Page] Project status data:', data);
          console.log('🔥 [Research Page] Project status structure:', {
            hasPhasePlan: !!data.phasePlan,
            hasCurrentSprint: !!data.currentSprint,
            keys: Object.keys(data),
            isEmpty: Object.keys(data).length === 0
          });
          setProjectStatus(data);
        } else {
          console.error('🔥 [Research Page] ❌ Failed to load project status:', response.status, response.statusText);
        }
      } catch (error) {
        console.error('🔥 [Research Page] ❌ Error loading project status:', error);
      }
    };

    loadProjectStatus();
  }, [isClient]);

  // Load dev log from API (client-side only)
  useEffect(() => {
    if (!isClient) return;
    
    const loadDevLog = async () => {
      console.log('🔥 [Research Page] Loading dev log...');
      try {
        const response = await fetch('/api/dev-log');
        console.log('🔥 [Research Page] Dev log response:', response.status, response.statusText);
        
        if (response.ok) {
          const data = await response.json();
          console.log('🔥 [Research Page] Dev log data:', data);
          console.log('🔥 [Research Page] Dev log structure:', {
            hasSprints: !!data.sprints,
            hasPhases: !!data.phases,
            sprintsLength: data.sprints?.length || 0,
            phasesLength: data.phases?.length || 0,
            keys: Object.keys(data),
            isEmpty: Object.keys(data).length === 0
          });
          setDevLog(data);
        } else {
          console.error('🔥 [Research Page] ❌ Failed to load dev log:', response.status, response.statusText);
        }
      } catch (error) {
        console.error('🔥 [Research Page] ❌ Error loading dev log:', error);
      }
    };

    loadDevLog();
  }, [isClient]);

  // Initialize notebooks with persistence (client-side only)
  useEffect(() => {
    if (!isClient) return;
    
    const loadNotebooks = () => {
      try {
        const savedNotebooks = getPreference('research-notebooks');
        if (savedNotebooks) {
          setNotebooks(JSON.parse(savedNotebooks));
        } else {
          // Only initialize with defaults if no saved notebooks exist
          const initialNotebooks = [
            { 
              id: NotebookType.ALL_NOTES, 
              label: 'All Notes', 
              icon: 'BookOpen',
              color: 'text-black-600'
            },
            { 
              id: NotebookType.CURRENT_SPRINT, 
              label: 'Current Sprint', 
              icon: 'Target',
              color: 'text-green-600'
            },
            { 
              id: NotebookType.CHALLENGES, 
              label: 'Challenges', 
              icon: 'Wrench',
              color: 'text-red-600'
            },
            { 
              id: NotebookType.ROAD_AHEAD, 
              label: 'Road Ahead', 
              icon: 'CalendarDays',
              color: 'text-purple-600'
            },
            { 
              id: NotebookType.STRATEGY, 
              label: 'Strategy', 
              icon: 'Zap',
              color: 'text-orange-600'
            },
            { 
              id: NotebookType.IDEAS, 
              label: 'Ideas', 
              icon: 'Lightbulb',
              color: 'text-yellow-600'
            },
            { 
              id: NotebookType.GENERAL, 
              label: 'General', 
              icon: 'FileText',
              color: 'text-gray-600'
            }
          ];
          setNotebooks(initialNotebooks);
          setPreference('research-notebooks', JSON.stringify(initialNotebooks));
        }
      } catch (error) {
        console.error('Error loading notebooks:', error);
        // Fallback to defaults
        const initialNotebooks = [
          { 
            id: NotebookType.ALL_NOTES, 
            label: 'All Notes', 
            icon: 'BookOpen',
            color: 'text-black-600'
          },
          { 
            id: NotebookType.CURRENT_SPRINT, 
            label: 'Current Sprint', 
            icon: 'Target',
            color: 'text-green-600'
          },
          { 
            id: NotebookType.CHALLENGES, 
            label: 'Challenges', 
            icon: 'Wrench',
            color: 'text-red-600'
          },
          { 
            id: NotebookType.ROAD_AHEAD, 
            label: 'Road Ahead', 
            icon: 'CalendarDays',
            color: 'text-purple-600'
          },
          { 
            id: NotebookType.STRATEGY, 
            label: 'Strategy', 
            icon: 'Zap',
            color: 'text-orange-600'
          },
          { 
            id: NotebookType.IDEAS, 
            label: 'Ideas', 
            icon: 'Lightbulb',
            color: 'text-yellow-600'
          },
          { 
            id: NotebookType.GENERAL, 
            label: 'General', 
            icon: 'FileText',
            color: 'text-gray-600'
          }
        ];
        setNotebooks(initialNotebooks);
      }
    };

    loadNotebooks();
  }, [isClient]);

  // Load notes from API (client-side only)
  useEffect(() => {
    if (!isClient) return;
    
    const loadNotes = async () => {
      console.log('🔥 [Research Page] Loading notes...');
      try {
        const response = await fetch('/api/notes-log');
        console.log('🔥 [Research Page] Notes response:', response.status, response.statusText);
        
        if (response.ok) {
          const data = await response.json();
          console.log('🔥 [Research Page] Notes data:', data);
          console.log('🔥 [Research Page] Notes structure:', {
            hasEntries: !!data.entries,
            entriesLength: data.entries?.length || 0,
            keys: Object.keys(data),
            isEmpty: Object.keys(data).length === 0
          });
          setNotes(data.entries || []);
        } else {
          console.error('🔥 [Research Page] ❌ Failed to load notes:', response.status, response.statusText);
        }
      } catch (error) {
        console.error('🔥 [Research Page] ❌ Error loading notes:', error);
      }
    };

    loadNotes();
  }, [isClient]);

  // Reload dev log and project status
  const handleReloadLogs = async () => {
    setIsReloading(true);
    try {
      const [projectResponse, devResponse] = await Promise.all([
        fetch('/api/project-status'),
        fetch('/api/dev-log')
      ]);

      if (projectResponse.ok) {
        const data = await projectResponse.json();
        setProjectStatus(data);
      }
      if (devResponse.ok) {
        const data = await devResponse.json();
        setDevLog(data);
      }
    } catch (error) {
      console.error('Error reloading logs:', error);
    } finally {
      setIsReloading(false);
    }
  };

  // Phase status management handlers (placeholder for now)
  const handleCyclePhaseStatus = async (phaseKey: string) => {
    if (!projectStatus || !projectStatus.phasePlan || !projectStatus.phasePlan[phaseKey]) {
      return;
    }

    const currentStatus = projectStatus.phasePlan[phaseKey].status;
    const statusCycle = ['Not Started', 'In Progress', 'Done'];
    const currentIndex = statusCycle.indexOf(currentStatus);
    const nextIndex = (currentIndex + 1) % statusCycle.length;
    const newStatus = statusCycle[nextIndex];

    try {
      const response = await fetch('/api/project-status', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          phaseKey,
          newStatus
        })
      });

      if (response.ok) {
        // Reload project status to reflect changes
        await handleReloadLogs();
      } else {
        const errorText = await response.text();
        console.error('Failed to update phase status:', errorText);
        alert('Failed to update phase status. Please try again.');
      }
    } catch (error) {
      console.error('Error updating phase status:', error);
      alert('Error updating phase status. Please try again.');
    }
  };

  const handleCheckSprintCompletion = async () => {
    if (!projectStatus || !projectStatus.phasePlan) {
      return;
    }

    // Check if all phases are "Done"
    const incompletePhasesList = Object.entries(projectStatus.phasePlan)
      .filter(([phaseKey, phase]: [string, any]) => phase.status !== 'Done')
      .map(([phaseKey, phase]: [string, any]) => phase.phaseName);

    if (incompletePhasesList.length > 0) {
      alert(`Cannot complete sprint. Incomplete phases: ${incompletePhasesList.join(', ')}`);
      return;
    }

    // Check if nextSprintPlan exists and has phases
    if (!projectStatus.nextSprintPlan || 
        Object.keys(projectStatus.nextSprintPlan).length === 0) {
      alert('Next sprint plan is not ready. Please ensure it has at least one phase.');
      return;
    }

    try {
      
      // 1. Create sprint completion entry for dev log
      const completedSprint = {
        id: `sprint-${projectStatus.currentSprintNumber}`,
        sprintName: projectStatus.currentSprint,
        description: `Sprint ${projectStatus.currentSprintNumber} completed successfully`,
        completedAt: new Date().toLocaleDateString('en-GB'), // DD-MM-YYYY format
        challenge: projectStatus.currentChallenge || 'System Development',
        phases: Object.entries(projectStatus.phasePlan).map(([phaseKey, phase]: [string, any]) => ({
          id: phaseKey,
          phaseName: phase.phaseName || phaseKey, // Use phaseName if available, fallback to phaseKey
          description: phase.description,
          completedAt: new Date().toLocaleDateString('en-GB'), // DD-MM-YYYY format
          completedFeatures: phase.deliverables || []
        }))
      };

      // 2. Update dev log with completed sprint
      const currentDevLog = devLog || { sprints: [], phases: [] };
      const updatedDevLog = {
        ...currentDevLog,
        sprints: [...(currentDevLog.sprints || []), completedSprint]
      };

      const devLogResponse = await fetch('/api/dev-log', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updatedDevLog)
      });

      if (!devLogResponse.ok) {
        throw new Error('Failed to update dev log');
      }

      // 3. Update project status: move nextSprintPlan to phasePlan, increment sprint number
      const nextSprintNumber = (projectStatus.currentSprintNumber || 10) + 1;
      const updatedProjectStatus = {
        ...projectStatus,
        lastUpdated: new Date().toISOString(),
        currentSprintNumber: nextSprintNumber,
        currentSprint: `Sprint ${nextSprintNumber}`,
        phasePlan: projectStatus.nextSprintPlan,
        nextSprintPlan: {
          "phaseX.1": {
            "phaseName": "",
            "status": "Not Started",
            "description": "",
            "deliverables": []
          },
          "PhaseX.2": {
            "phaseName": "",
            "status": "Not Started", 
            "description": "",
            "deliverables": []
          },
          "phaseX.3": {
            "phaseName": "",
            "status": "Not Started",
            "description": "",
            "deliverables": []
          },
          "phaseX.4": {
            "phaseName": "",
            "status": "Not Started",
            "description": "",
            "deliverables": []
          }
        }
      };

      const projectStatusResponse = await fetch('/api/project-status', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updatedProjectStatus)
      });

      if (!projectStatusResponse.ok) {
        throw new Error('Failed to update project status');
      }

      // 4. Reload data to reflect changes
      await handleReloadLogs();
      
      setSuccessMessage(`Sprint ${projectStatus.currentSprintNumber} completed successfully! Moved to Sprint ${nextSprintNumber}.`);
      setShowSuccessModal(true);
      
    } catch (error) {
      console.error('Error completing sprint:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      setSuccessMessage(`Error completing sprint: ${errorMessage}`);
      setShowSuccessModal(true);
    }
  };




  // Show loading state during SSR
  if (!isClient) {
    return (
      <div className="container mx-auto px-4 space-y-6">
        <div className="flex items-center justify-center h-64">
          <div className="text-muted-foreground">Loading...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 space-y-6">
      <Tabs value={activeTab} onValueChange={handleTabChange} className="w-full">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="system-development" className="flex items-center gap-2">
            <BookOpen className="h-4 w-4" />
            System Development
          </TabsTrigger>
          <TabsTrigger value="dev-log" className="flex items-center gap-2">
            <Zap className="h-4 w-4" />
            Dev Log
          </TabsTrigger>
          <TabsTrigger value="diagrams" className="flex items-center gap-2">
            <Map className="h-4 w-4" />
            Diagrams
          </TabsTrigger>
          <TabsTrigger value="roadmaps" className="flex items-center gap-2">    
            <Compass className="h-4 w-4" />
            Roadmaps
          </TabsTrigger>
          <TabsTrigger value="notes" className="flex items-center gap-2">
            <FileText className="h-4 w-4" />
            Notes
          </TabsTrigger>
        </TabsList>

        {/* System Development Tab */}
        <SystemDevelopmentTab projectStatus={projectStatus} />

        {/* Dev Log Tab */}
        <TabsContent value="dev-log" className="space-y-6">
          <DevSprintsTab 
            projectStatus={projectStatus}
            devLog={devLog}
            onReload={handleReloadLogs}
            isReloading={isReloading}
            onCyclePhaseStatus={handleCyclePhaseStatus}
            onCheckSprintCompletion={handleCheckSprintCompletion}
          />
        </TabsContent>

        {/* Diagrams Tab */}
        <DiagramsTab />


        {/* Roadmaps Tab */}
        <RoadmapsTab />

        {/* Notes Tab */}
        <NotesTab 
          notes={notes}
          notebooks={notebooks}
          onUpdateNotes={setNotes}
          onUpdateNotebooks={setNotebooks}
        />
      </Tabs>

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

export default function ResearchPage() {
  return (
    <Suspense fallback={
      <div className="container mx-auto px-4 space-y-6">
        <div className="flex items-center justify-center h-64">
          <div className="text-muted-foreground">Loading...</div>
        </div>
      </div>
    }>
      <ResearchPageContent />
    </Suspense>
  );
}
