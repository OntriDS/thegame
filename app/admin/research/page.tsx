'use client';

import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { BookOpen, Map, FileText, Compass, Zap } from 'lucide-react';
import { useState, useEffect, Suspense } from 'react';
import { NotebookType } from '@/types/enums';
import { useUserPreferences } from '@/lib/hooks/use-user-preferences';
import { NotesTab } from '@/components/research/notes-tab';
import { RoadmapsTab } from '@/components/research/roadmaps-tab';
import { DiagramsTab } from '@/components/research/diagrams-tab';
import { SystemDevelopmentTab } from '@/components/research/system-development-tab';
import { DevSprintsTab } from '@/components/data-center/dev-sprints-tab';
import { LinkRulesTab } from '@/components/research/link-rules-tab';

function ResearchPageContent() {
  const { getPreference, setPreference } = useUserPreferences();
  const [notes, setNotes] = useState<any[]>([]);
  const [projectStatus, setProjectStatus] = useState<any>(null);
  const [devLog, setDevLog] = useState<any>(null);
  const [isReloading, setIsReloading] = useState(false);
  const [activeTab, setActiveTab] = useState('link-rules');
  const [notebooks, setNotebooks] = useState<any[]>([]);
  const [isClient, setIsClient] = useState(false);

  // SSR Guard: Only run client-side code after hydration
  useEffect(() => {
    setIsClient(true);
  }, []);

  // Load preferences and URL tab on mount (client-side only)
  useEffect(() => {
    if (!isClient) return;
    
    const savedTab = getPreference('research-active-tab', 'link-rules');
    
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
      try {
        const response = await fetch('/api/project-status');
        if (response.ok) {
          const data = await response.json();
          setProjectStatus(data);
        } else {
          console.error('Failed to load project status:', response.status, response.statusText);
        }
      } catch (error) {
        console.error('Error loading project status:', error);
      }
    };

    loadProjectStatus();
  }, [isClient]);

  // Load dev log from API (client-side only)
  useEffect(() => {
    if (!isClient) return;
    
    const loadDevLog = async () => {
      try {
        const response = await fetch('/api/dev-log');
        if (response.ok) {
          const data = await response.json();
          setDevLog(data);
        } else {
          console.error('Failed to load dev log:', response.status, response.statusText);
        }
      } catch (error) {
        console.error('Error loading dev log:', error);
      }
    };

    loadDevLog();
  }, [isClient]);

  // Initialize notebooks with persistence (client-side only)
  useEffect(() => {
    if (!isClient) return;
    
    const loadNotebooks = () => {
      try {
        // SSR Guard for localStorage
        if (typeof window === 'undefined') return;
        
        const savedNotebooks = localStorage.getItem('notebooks');
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
          localStorage.setItem('notebooks', JSON.stringify(initialNotebooks));
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
      try {
        const response = await fetch('/api/notes-log');
        if (response.ok) {
          const data = await response.json();
          setNotes(data.entries || []);
        }
      } catch (error) {
        console.error('Failed to load notes:', error);
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
    console.log('Cycle phase status:', phaseKey);
    // This functionality is currently in data-center, keeping it simple for research
  };

  const handleCheckSprintCompletion = async () => {
    console.log('Check sprint completion');
    // This functionality is currently in data-center, keeping it simple for research
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
        <TabsList className="grid w-full grid-cols-6">
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
          <TabsTrigger value="link-rules" className="flex items-center gap-2">
            <Zap className="h-4 w-4" />
            Link Rules
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

        {/* Link Rules Tab */}
        <LinkRulesTab />

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
