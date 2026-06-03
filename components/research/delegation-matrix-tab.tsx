'use client';

import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';

export interface MatrixTask {
  id: string;
  area: string;
  station: string;
  task: string;
  f: number;
  a: number;
  i: number;
  s: number;
  currentOwner: string;
  idealOwner: string;
  doc: 'Y' | 'N';
  feed: 'Y' | 'N';
  delegation: string;
  reasons: string;
  notes: string;
}

const INITIAL_MOCK_DATA: MatrixTask[] = [
  { id: '1', area: 'ADMIN', station: 'strategy', task: 'plans-roadmaps', f: 1, a: 1, i: 2, s: 1, currentOwner: 'Founder', idealOwner: 'Founder', doc: 'N', feed: 'N', delegation: 'Keep', reasons: 'Low DPS', notes: 'Impact Growth, Complex' },
  { id: '2', area: 'ADMIN', station: 'strategy', task: 'program-schedule', f: 3, a: 4, i: 2, s: 3, currentOwner: 'Founder', idealOwner: 'Co-Pixelbrain', doc: 'N', feed: 'N', delegation: 'Co-Automate', reasons: 'High DPS, S=3+', notes: 'Pixelbrain not Ready' },
  { id: '3', area: 'ADMIN', station: 'finances', task: 'business-admin', f: 5, a: 2, i: 1, s: 1, currentOwner: 'Founder', idealOwner: 'Founder', doc: 'N', feed: 'N', delegation: 'Keep', reasons: 'Mid DPS, S=1', notes: 'Daily (TheGame)' },
  { id: '4', area: 'ADMIN', station: 'finances', task: 'budgets-negotiations', f: 2, a: 3, i: 3, s: 3, currentOwner: 'Founder', idealOwner: 'Co-Pixelbrain', doc: 'N', feed: 'N', delegation: 'Co-Automate', reasons: 'S=3+', notes: 'Pixelbrain not Ready' },
  { id: '5', area: 'ADMIN', station: 'inventory', task: 'stock-count', f: 3, a: 4, i: 2, s: 3, currentOwner: 'Founder', idealOwner: 'Assistant', doc: 'N', feed: 'N', delegation: 'Delegate', reasons: 'High DPS, S=3+', notes: 'Frustrating (Time), Impact Growth, Assistant Not Ready' },
  { id: '6', area: 'RESEARCH', station: 'classes', task: 'teach', f: 4, a: 4, i: 2, s: 2, currentOwner: 'Founder', idealOwner: 'Teachers', doc: 'N', feed: 'N', delegation: 'Keep-Until', reasons: 'High DPS, High F+A', notes: 'Frequent, Frustrating' },
];

export function DelegationMatrixTab() {
  const [tasks, setTasks] = useState<MatrixTask[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  React.useEffect(() => {
    const fetchMatrix = async () => {
      try {
        const res = await fetch('/api/research/delegation-matrix');
        if (res.ok) {
          const data = await res.json();
          if (data.success && data.tasks) {
            setTasks(data.tasks);
          }
        }
      } catch (err) {
        console.error('Error fetching delegation matrix:', err);
      } finally {
        setIsLoading(false);
      }
    };
    fetchMatrix();
  }, []);

  const calculateStatus = (task: MatrixTask) => {
    let score = 100;
    if (task.doc === 'N') score -= 20;
    if (task.feed === 'N') score -= 10;
    
    const hasCurrent = task.currentOwner && task.currentOwner.trim() !== '';
    const hasIdeal = task.idealOwner && task.idealOwner.trim() !== '';

    if (!hasCurrent) {
      score -= 10; // No Current Owner = -10%
    }
    
    // Mismatch rules
    if ((hasCurrent || hasIdeal) && task.currentOwner !== task.idealOwner) {
      score -= 20;
      if (task.f >= 4) score -= 10;
      if (task.a >= 4) score -= 10;
      if (task.i <= 2) score -= 10;
      if (task.s <= 2) score -= 10;
    }
    
    return Math.max(0, score);
  };

  const getStatusColor = (score: number) => {
    if (score >= 90) return 'text-cyan-500 font-bold';
    if (score >= 70) return 'text-green-500 font-bold';
    if (score >= 50) return 'text-yellow-500 font-bold';
    if (score >= 30) return 'text-orange-500 font-bold';
    if (score >= 10) return 'text-red-500 font-bold';
    return 'text-gray-500 font-bold';
  };

  const updateTask = (id: string, field: keyof MatrixTask, value: any) => {
    setTasks(prev => prev.map(t => t.id === id ? { ...t, [field]: value } : t));
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Task Delegation Matrix</CardTitle>
          <CardDescription>
            Identify and evaluate tasks to determine if they should be Kept, Delegated, or Automated.
          </CardDescription>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          {isLoading ? (
            <div className="p-8 text-center text-muted-foreground animate-pulse">Loading Matrix Data...</div>
          ) : (
            <table className="w-full text-sm border-collapse">
            <thead>
              <tr className="border-b bg-muted/50">
                <th className="p-2 text-left font-medium">Area &gt; Station &gt; Task</th>
                <th className="p-2 text-center font-medium w-12" title="Frequency">F</th>
                <th className="p-2 text-center font-medium w-12" title="Annoyance">A</th>
                <th className="p-2 text-center font-medium w-12" title="Impact">I</th>
                <th className="p-2 text-center font-medium w-12" title="Simplicity">S</th>
                <th className="p-2 text-center font-medium w-16 bg-muted/80">DPS</th>
                <th className="p-2 text-left font-medium w-32">Current Owner</th>
                <th className="p-2 text-left font-medium w-32">Ideal Owner</th>
                <th className="p-2 text-center font-medium w-12">Doc?</th>
                <th className="p-2 text-center font-medium w-12">Feed?</th>
                <th className="p-2 text-left font-medium">Delegation</th>
                <th className="p-2 text-left font-medium">Reasons</th>
                <th className="p-2 text-center font-medium w-20">Status</th>
                <th className="p-2 text-left font-medium min-w-[200px]">Notes</th>
              </tr>
            </thead>
            <tbody>
              {tasks.map(task => {
                const dps = task.f + task.a + task.i + task.s;
                const statusScore = calculateStatus(task);
                const statusColor = getStatusColor(statusScore);

                return (
                  <tr key={task.id} className="border-b hover:bg-muted/20 transition-colors">
                    <td className="p-1 align-top">
                      <div className="flex gap-1 text-xs mb-1">
                        <span className="font-semibold">{task.area}</span>
                        <span className="text-muted-foreground">&gt;</span>
                        <span className="italic">{task.station}</span>
                        <span className="text-muted-foreground">&gt;</span>
                      </div>
                      <Input 
                        value={task.task} 
                        onChange={(e) => updateTask(task.id, 'task', e.target.value)}
                        className="h-7 px-2 border-transparent hover:border-input focus:border-input text-sm"
                      />
                    </td>
                    <td className="p-1 align-top">
                      <Input type="number" min={0} max={5} value={task.f} onChange={(e) => updateTask(task.id, 'f', parseInt(e.target.value) || 0)} className="h-7 w-12 px-1 text-center border-transparent hover:border-input" />
                    </td>
                    <td className="p-1 align-top">
                      <Input type="number" min={0} max={5} value={task.a} onChange={(e) => updateTask(task.id, 'a', parseInt(e.target.value) || 0)} className="h-7 w-12 px-1 text-center border-transparent hover:border-input" />
                    </td>
                    <td className="p-1 align-top">
                      <Input type="number" min={0} max={5} value={task.i} onChange={(e) => updateTask(task.id, 'i', parseInt(e.target.value) || 0)} className="h-7 w-12 px-1 text-center border-transparent hover:border-input" />
                    </td>
                    <td className="p-1 align-top">
                      <Input type="number" min={0} max={5} value={task.s} onChange={(e) => updateTask(task.id, 's', parseInt(e.target.value) || 0)} className="h-7 w-12 px-1 text-center border-transparent hover:border-input" />
                    </td>
                    <td className="p-1 align-top text-center font-bold bg-muted/30">
                      <div className="mt-1">{dps}</div>
                    </td>
                    <td className="p-1 align-top">
                      <Input value={task.currentOwner} onChange={(e) => updateTask(task.id, 'currentOwner', e.target.value)} className="h-7 px-2 border-transparent hover:border-input text-sm" />
                    </td>
                    <td className="p-1 align-top">
                      <Input value={task.idealOwner} onChange={(e) => updateTask(task.id, 'idealOwner', e.target.value)} className="h-7 px-2 border-transparent hover:border-input text-sm" />
                    </td>
                    <td className="p-1 align-top">
                      <select 
                        value={task.doc} 
                        onChange={(e) => updateTask(task.id, 'doc', e.target.value as 'Y'|'N')}
                        className="w-full h-7 text-center bg-transparent border border-transparent hover:border-input rounded px-1 outline-none focus:ring-1 focus:ring-ring"
                      >
                        <option value="Y">Y</option>
                        <option value="N">N</option>
                      </select>
                    </td>
                    <td className="p-1">
                      <select 
                        value={task.feed} 
                        onChange={(e) => updateTask(task.id, 'feed', e.target.value as 'Y'|'N')}
                        className="w-full h-7 text-center bg-transparent border border-transparent hover:border-input rounded px-1 outline-none focus:ring-1 focus:ring-ring"
                      >
                        <option value="Y">Y</option>
                        <option value="N">N</option>
                      </select>
                    </td>
                    <td className="p-1 align-top">
                      <Input value={task.delegation} onChange={(e) => updateTask(task.id, 'delegation', e.target.value)} className="h-7 px-2 border-transparent hover:border-input text-sm font-semibold italic" />
                    </td>
                    <td className="p-1 align-top">
                      <Input value={task.reasons} onChange={(e) => updateTask(task.id, 'reasons', e.target.value)} className="h-7 px-2 border-transparent hover:border-input text-sm" />
                    </td>
                    <td className="p-1 align-top text-center">
                      <div className="mt-1"><span className={statusColor}>{statusScore}%</span></div>
                    </td>
                    <td className="p-1 align-top">
                      <Input value={task.notes} onChange={(e) => updateTask(task.id, 'notes', e.target.value)} className="h-7 px-2 border-transparent hover:border-input text-sm" />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          )}
          
          <div className="mt-4 flex justify-end">
             <button 
                onClick={() => setTasks([...tasks, { id: Date.now().toString(), area: 'NEW', station: 'station', task: 'new-task', f: 0, a: 0, i: 0, s: 0, currentOwner: '', idealOwner: '', doc: 'N', feed: 'N', delegation: 'Keep', reasons: '', notes: '' }])}
                className="px-4 py-2 text-sm font-medium border rounded-md hover:bg-muted transition-colors"
             >
                + Add Task Row
             </button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Legend & Math</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 text-sm">
            
            <div className="space-y-2">
              <h4 className="font-semibold border-b pb-1">Points Legend (0-5)</h4>
              <p><strong>F (Frequency):</strong> 5=Daily, 4=Frequent, 3=Weekly, 2=Bi-Weekly, 1=Monthly, 0=Never</p>
              <p><strong>A (Annoyance):</strong> 5=Soul-Crushing, 4=Frustrating, 3=Neutral, 2=Fine, 1=Love it, 0=Mind-Blowing</p>
              <p><strong>I (Impact):</strong> 5=Terrible, 4=Supportive, 3=Necessary, 2=Growth, 1=Critical, 0=Highest Priority</p>
              <p><strong>S (Simplicity):</strong> 5=No-Brainer, 4=Easy, 3=Procedural (SOP), 2=Difficult, 1=Complex, 0=Hardest</p>
            </div>

            <div className="space-y-2">
              <h4 className="font-semibold border-b pb-1">Status Calculation</h4>
              <p>Base is 100%. Penalties apply cumulatively:</p>
              <ul className="list-disc pl-4 space-y-1">
                <li>No Doc: <strong>-20%</strong></li>
                <li>No Feed: <strong>-10%</strong></li>
                <li>No Current Owner: <strong>-10%</strong></li>
                <li>Ideal != Current: <strong>-20%</strong></li>
                <li>+ Mismatch & F≥4: <strong>-10%</strong></li>
                <li>+ Mismatch & A≥4: <strong>-10%</strong></li>
                <li>+ Mismatch & I≤2: <strong>-10%</strong></li>
                <li>+ Mismatch & S≤2: <strong>-10%</strong></li>
              </ul>
            </div>

            <div className="space-y-2">
              <h4 className="font-semibold border-b pb-1">Color Status</h4>
              <div className="flex flex-col gap-1 mt-2">
                <span className="text-cyan-500 font-bold">90-100% (Cyan)</span>
                <span className="text-green-500 font-bold">70-80% (Green)</span>
                <span className="text-yellow-500 font-bold">50-60% (Yellow)</span>
                <span className="text-orange-500 font-bold">30-40% (Orange)</span>
                <span className="text-red-500 font-bold">10-20% (Red)</span>
                <span className="text-gray-500 font-bold">0% (Grey)</span>
              </div>
            </div>

            <div className="space-y-2">
              <h4 className="font-semibold border-b pb-1">Delegation Rules</h4>
              <p><strong>Low DPS (7-):</strong> Keep</p>
              <p><strong>Mid DPS (8-11) + Low A (2+):</strong> Keep</p>
              <p><strong>High DPS (12+):</strong> Delegate</p>
              <p><strong>S=3+ (Procedural):</strong> Automate</p>
            </div>

          </div>
        </CardContent>
      </Card>
    </div>
  );
}
