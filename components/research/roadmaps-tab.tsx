'use client';

import { TabsContent } from '@/components/ui/tabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Building2, Circle, CircleCheck, Construction, Compass } from 'lucide-react';
import { useMemo } from 'react';

type SystemStatus = 'Done' | 'In Progress' | 'Not Started';

type ProjectStatus = {
  currentSprint?: string;
  systems?: Record<string, { status: SystemStatus; version: string; description?: string }>;
};

function StatusPill({ status }: { status: SystemStatus }) {
  const style =
    status === 'Done'
      ? 'bg-green-50 text-green-700 border border-green-200'
      : status === 'In Progress'
      ? 'bg-blue-50 text-blue-700 border border-blue-200'
      : 'bg-gray-50 text-gray-600 border border-gray-200';
  const Icon = status === 'Done' ? CircleCheck : status === 'In Progress' ? Construction : Circle;
  return (
    <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs ${style}`}>
      <Icon className="h-3.5 w-3.5" />
      {status}
    </span>
  );
}

function DepartmentCard({
  name,
  info,
}: {
  name: string;
  info: { status: SystemStatus; version: string; description?: string };
}) {
  return (
    <div className="rounded-lg border bg-white p-3 shadow-sm flex items-center justify-between">
      <div className="flex items-center gap-3 min-w-0">
        <div className="h-8 w-8 rounded-md bg-gradient-to-br from-slate-100 to-slate-200 flex items-center justify-center text-slate-600">
          <Building2 className="h-5 w-5" />
        </div>
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <span className="font-medium truncate">{name}</span>
            <Badge variant="secondary" className="text-[10px]">{info.version}</Badge>
          </div>
          {info.description ? (
            <p className="text-xs text-muted-foreground truncate">{info.description}</p>
          ) : null}
        </div>
      </div>
      <StatusPill status={info.status} />
    </div>
  );
}

function SmartBuilding({ systems }: { systems: NonNullable<ProjectStatus['systems']> }) {
  // Order departments in a pleasing layout (floors)
  const floors = useMemo(() => {
    const entries = Object.entries(systems);
    // Preferred display order
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
    // Group 3 per row to resemble floors
    const rows: typeof sorted[] = [];
    for (let i = 0; i < sorted.length; i += 3) rows.push(sorted.slice(i, i + 3));
    return rows;
  }, [systems]);

  return (
    <div className="relative">
      <div className="mx-auto max-w-4xl">
        {/* Building shell */}
        <div className="rounded-2xl border bg-gradient-to-b from-white to-slate-50 p-4 shadow-md">
          <div className="mb-3 flex items-center justify-between">
            <div className="flex items-center gap-2 text-slate-700">
              <Building2 className="h-5 w-5" />
              <span className="font-semibold">Smart Building</span>
            </div>
            <span className="text-xs text-muted-foreground">Departments</span>
          </div>
          <div className="space-y-3">
            {floors.map((row, idx) => (
              <div key={idx} className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {row.map(([key, value]) => (
                  <DepartmentCard key={key} name={key} info={value as any} />
                ))}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

export function RoadmapsTab({ projectStatus }: { projectStatus: ProjectStatus | null }) {
  const systems = projectStatus?.systems;
  const versionSummary = useMemo(() => {
    if (!systems) return null;
    const total = Object.keys(systems).length;
    const done = Object.values(systems).filter((s) => s.status === 'Done').length;
    const inProgress = Object.values(systems).filter((s) => s.status === 'In Progress').length;
    const notStarted = total - done - inProgress;
    return { total, done, inProgress, notStarted };
  }, [systems]);

  return (
    <TabsContent value="roadmaps" className="space-y-4">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Roadmap • Smart Building</CardTitle>
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
            <div className="space-y-6">
              {versionSummary ? (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <StatusPill status="Done" />
                  <span className="mr-3">{versionSummary.done}</span>
                  <StatusPill status="In Progress" />
                  <span className="mr-3">{versionSummary.inProgress}</span>
                  <StatusPill status="Not Started" />
                  <span>{versionSummary.notStarted}</span>
                </div>
              ) : null}
              <SmartBuilding systems={systems} />
            </div>
          )}
        </CardContent>
      </Card>
    </TabsContent>
  );
}
