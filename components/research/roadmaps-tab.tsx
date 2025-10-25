'use client';

import { TabsContent } from '@/components/ui/tabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { 
  Building2, 
  Circle, 
  CircleCheck, 
  Construction, 
  Compass,
  Settings,
  Database,
  BookOpen,
  Command,
  Package,
  ShoppingCart,
  DollarSign,
  Map,
  BarChart3,
  Archive,
  User
} from 'lucide-react';
import { useMemo } from 'react';

type SystemStatus = 'Done' | 'In Progress' | 'Not Started';

type ProjectStatus = {
  currentSprint?: string;
  systems?: Record<string, { status: SystemStatus; version: string; description?: string }>;
};

// Icon mapping for each system
const systemIcons = {
  foundations: Building2,
  settings: Settings,
  dataCenter: Database,
  research: BookOpen,
  controlRoom: Command,
  inventories: Package,
  sales: ShoppingCart,
  finances: DollarSign,
  maps: Map,
  dashboards: BarChart3,
  archive: Archive,
  player: User,
};

// System display names
const systemNames = {
  foundations: 'Foundations',
  settings: 'Settings',
  dataCenter: 'Data Center',
  research: 'Research',
  controlRoom: 'Control Room',
  inventories: 'Inventories',
  sales: 'Sales',
  finances: 'Finances',
  maps: 'Maps',
  dashboards: 'Dashboards',
  archive: 'Archive',
  player: 'Player',
};

function getStatusColor(status: SystemStatus) {
  switch (status) {
    case 'Done':
      return 'from-green-400 to-emerald-500';
    case 'In Progress':
      return 'from-blue-400 to-cyan-500';
    case 'Not Started':
      return 'from-gray-300 to-slate-400';
    default:
      return 'from-gray-300 to-slate-400';
  }
}

function getStatusGlow(status: SystemStatus) {
  switch (status) {
    case 'Done':
      return 'shadow-green-500/50';
    case 'In Progress':
      return 'shadow-blue-500/50';
    case 'Not Started':
      return 'shadow-gray-400/30';
    default:
      return 'shadow-gray-400/30';
  }
}

function BuildingFloor({ 
  systems, 
  floorNumber 
}: { 
  systems: Array<[string, { status: SystemStatus; version: string; description?: string }]>;
  floorNumber: number;
}) {
  return (
    <div className="relative">
      {/* Floor line */}
      <div className="absolute left-0 right-0 top-1/2 h-0.5 bg-gradient-to-r from-slate-200 via-slate-300 to-slate-200 transform -translate-y-1/2" />
      
      {/* Systems on this floor */}
      <div className="relative flex justify-between items-center py-8">
        {systems.map(([key, info], index) => {
          const Icon = systemIcons[key as keyof typeof systemIcons] || Building2;
          const name = systemNames[key as keyof typeof systemNames] || key;
          const isEven = index % 2 === 0;
          
          return (
            <div
              key={key}
              className={`relative flex flex-col items-center group ${
                isEven ? 'self-start' : 'self-end'
              }`}
            >
              {/* Connection line to floor */}
              <div className={`w-0.5 h-8 bg-slate-300 ${isEven ? 'mb-2' : 'mt-2'}`} />
              
              {/* System pin */}
              <div className={`
                relative w-16 h-16 rounded-full 
                bg-gradient-to-br ${getStatusColor(info.status)}
                shadow-lg ${getStatusGlow(info.status)}
                flex items-center justify-center
                transition-all duration-300
                group-hover:scale-110 group-hover:shadow-xl
                ${info.status === 'Done' ? 'animate-pulse' : ''}
              `}>
                <Icon className="h-8 w-8 text-white" />
                
                {/* Version badge */}
                <div className="absolute -top-2 -right-2 bg-white rounded-full px-1.5 py-0.5 shadow-md">
                  <span className="text-xs font-bold text-slate-600">{info.version}</span>
                </div>
              </div>
              
              {/* System name */}
              <div className="mt-2 text-center">
                <div className="text-sm font-medium text-slate-700">{name}</div>
                <div className="text-xs text-slate-500">Floor {floorNumber}</div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function SmartBuilding({ systems }: { systems: NonNullable<ProjectStatus['systems']> }) {
  const floors = useMemo(() => {
    const entries = Object.entries(systems);
    // Order systems for building layout
    const order = [
      'foundations',
      'settings', 
      'dataCenter',
      'research',
      'controlRoom',
      'inventories',
      'sales',
      'finances',
      'maps',
      'dashboards',
      'archive',
      'player',
    ];
    const sorted = entries.sort((a, b) => order.indexOf(a[0]) - order.indexOf(b[0]));
    
    // Group into floors (3 systems per floor)
    const floors: Array<Array<[string, { status: SystemStatus; version: string; description?: string }]>> = [];
    for (let i = 0; i < sorted.length; i += 3) {
      floors.push(sorted.slice(i, i + 3));
    }
    return floors;
  }, [systems]);

  return (
    <div className="relative">
      <div className="mx-auto max-w-6xl">
        {/* Building structure */}
        <div className="relative bg-gradient-to-b from-slate-50 to-white rounded-2xl p-8 shadow-lg border">
          {/* Building title */}
          <div className="text-center mb-8">
            <div className="flex items-center justify-center gap-3 mb-2">
              <Building2 className="h-8 w-8 text-slate-600" />
              <h3 className="text-2xl font-bold text-slate-800">Smart Building</h3>
            </div>
            <p className="text-slate-600">Version v0.1 Development Progress</p>
          </div>

          {/* Building floors */}
          <div className="space-y-12">
            {floors.map((floorSystems, index) => (
              <BuildingFloor 
                key={index} 
                systems={floorSystems} 
                floorNumber={floors.length - index} 
              />
            ))}
          </div>

          {/* Building foundation */}
          <div className="mt-8 h-4 bg-gradient-to-r from-slate-300 via-slate-400 to-slate-300 rounded-b-2xl" />
        </div>
      </div>
    </div>
  );
}

export function RoadmapsTab({ projectStatus }: { projectStatus: ProjectStatus | null }) {
  const systems = projectStatus?.systems;

  return (
    <TabsContent value="roadmaps" className="space-y-4">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Smart Building Roadmap</CardTitle>
              <CardDescription>
                {projectStatus?.currentSprint ? (
                  <span>Version v0.1 in development • {projectStatus.currentSprint}</span>
                ) : (
                  <span>Version v0.1 in development</span>
                )}
              </CardDescription>
            </div>
            <Compass className="h-6 w-6 text-muted-foreground" />
          </div>
        </CardHeader>
        <CardContent>
          {!systems ? (
            <div className="text-center py-10 text-muted-foreground">
              <p className="mb-1">No project status data available.</p>
              <p className="text-xs">Make sure PROJECT-STATUS.json is accessible via the API.</p>
            </div>
          ) : (
            <SmartBuilding systems={systems} />
          )}
        </CardContent>
      </Card>
    </TabsContent>
  );
}
