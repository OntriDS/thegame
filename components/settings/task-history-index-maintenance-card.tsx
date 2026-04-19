'use client';

import { useMemo, useState } from 'react';
import { AlertTriangle, CheckCircle2, Clock, Database, Loader2, XCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

type MaintenanceResponse = {
  success: boolean;
  message?: string;
  data?: unknown;
};

type StatusMessage = {
  type: 'success' | 'error' | 'idle';
  message: string;
  payload?: unknown;
};

export function TaskHistoryIndexMaintenanceCard() {
  const now = useMemo(() => new Date(), []);
  const [loadingRepair, setLoadingRepair] = useState(false);
  const [loadingAudit, setLoadingAudit] = useState(false);
  const [repairStatus, setRepairStatus] = useState<StatusMessage>({ type: 'idle', message: '' });
  const [auditStatus, setAuditStatus] = useState<StatusMessage>({ type: 'idle', message: '' });
  const [month, setMonth] = useState<string>(String(now.getMonth() + 1).padStart(2, '0'));
  const [year, setYear] = useState<string>(String(now.getFullYear()));

  const runRepair = async (dryRun: boolean) => {
    setLoadingRepair(true);
    setRepairStatus({ type: 'idle', message: dryRun ? 'Dry-run in progress…' : 'Rebuilding task month index…' });
    try {
      const response = await fetch('/api/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'repair-task-month-index',
          parameters: { dryRun },
        }),
      });
      const body = (await response.json()) as MaintenanceResponse;

      if (body.success) {
        setRepairStatus({
          type: 'success',
          message: body.message || 'Task month index repair completed',
          payload: body.data,
        });
      } else {
        setRepairStatus({ type: 'error', message: body.message || 'Repair failed' });
      }
    } catch {
      setRepairStatus({ type: 'error', message: 'Repair request failed. Check network and admin session.' });
    } finally {
      setLoadingRepair(false);
    }
  };

  const runAudit = async () => {
    const parsedMonth = parseInt(month, 10);
    const parsedYear = parseInt(year, 10);
    if (!Number.isFinite(parsedMonth) || !Number.isFinite(parsedYear) || parsedMonth < 1 || parsedMonth > 12) {
      setAuditStatus({ type: 'error', message: 'Please enter a valid month and year.' });
      return;
    }

    setLoadingAudit(true);
    setAuditStatus({ type: 'idle', message: 'Running task month index audit…' });
    try {
      const response = await fetch('/api/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'audit-task-month-index-contamination',
          parameters: { month: parsedMonth, year: parsedYear },
        }),
      });
      const body = (await response.json()) as MaintenanceResponse & {
        data?: { success: boolean; data?: unknown };
      };

      if (body.success) {
        setAuditStatus({
          type: 'success',
          message: 'Audit completed',
          payload: body.data,
        });
      } else {
        setAuditStatus({ type: 'error', message: 'Audit failed to run.' });
      }
    } catch {
      setAuditStatus({ type: 'error', message: 'Audit request failed. Check network and admin session.' });
    } finally {
      setLoadingAudit(false);
    }
  };

  return (
    <Card className="border-cyan-500/25 bg-cyan-500/5">
      <CardHeader>
        <div className="flex items-center gap-2">
          <Database className="h-5 w-5 text-cyan-600 dark:text-cyan-400" />
          <CardTitle>Task history month-index maintenance</CardTitle>
        </div>
        <CardDescription>
          Rebuild/inspect <code className="text-xs">thegame:index:task:by-month:MM-YY</code> without touching task history
          API behavior.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="rounded-md border border-cyan-200 bg-cyan-50 p-3 text-sm text-cyan-950 dark:border-cyan-900 dark:bg-cyan-950/30 dark:text-cyan-100 flex gap-3">
          <AlertTriangle className="h-5 w-5 shrink-0" />
          <p>Use after migration/rollback to remove non-terminal task ids from history month buckets.</p>
        </div>

        {repairStatus.type === 'success' && (
          <div className="rounded-md border border-green-200 bg-green-50 p-3 text-sm text-green-900 dark:border-green-900 dark:bg-green-950/30 dark:text-green-100 flex gap-3">
            <CheckCircle2 className="h-5 w-5 shrink-0" />
            <div className="min-w-0 flex-1 space-y-2">
              <p className="font-semibold">{repairStatus.message}</p>
              {repairStatus.payload != null && (
                <pre className="max-h-64 overflow-auto rounded bg-black/5 p-2 text-xs dark:bg-white/10">
                  {JSON.stringify(repairStatus.payload, null, 2)}
                </pre>
              )}
            </div>
          </div>
        )}

        {repairStatus.type === 'error' && (
          <div className="rounded-md border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive flex gap-3">
            <XCircle className="h-5 w-5 shrink-0" />
            <p className="font-semibold">{repairStatus.message}</p>
          </div>
        )}

        <div className="flex flex-wrap gap-2">
          <Button variant="outline" onClick={() => runRepair(true)} disabled={loadingRepair} className="h-9">
            {loadingRepair ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Clock className="mr-2 h-4 w-4" />}
            Dry-run repair
          </Button>
          <Button onClick={() => runRepair(false)} disabled={loadingRepair} className="h-9">
            {loadingRepair ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Database className="mr-2 h-4 w-4" />}
            Repair now
          </Button>
        </div>

        {auditStatus.type === 'success' && (
          <div className="rounded-md border border-green-200 bg-green-50 p-3 text-sm text-green-900 dark:border-green-900 dark:bg-green-950/30 dark:text-green-100 flex gap-3">
            <CheckCircle2 className="h-5 w-5 shrink-0" />
            <div className="min-w-0 flex-1 space-y-2">
              <p className="font-semibold">{auditStatus.message}</p>
              {auditStatus.payload != null && (
                <pre className="max-h-64 overflow-auto rounded bg-black/5 p-2 text-xs dark:bg-white/10">
                  {JSON.stringify(auditStatus.payload, null, 2)}
                </pre>
              )}
            </div>
          </div>
        )}

        {auditStatus.type === 'error' && (
          <div className="rounded-md border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive flex gap-3">
            <XCircle className="h-5 w-5 shrink-0" />
            <p className="font-semibold">{auditStatus.message}</p>
          </div>
        )}

        <div className="rounded-md border p-3 space-y-3">
          <p className="text-sm font-medium">Check a month index for non-completed task rows</p>
          <div className="flex flex-wrap gap-2 items-end">
            <label className="flex flex-col text-sm gap-1">
              Month
              <input
                type="number"
                min={1}
                max={12}
                value={month}
                onChange={(event) => setMonth(event.target.value)}
                className="h-9 w-24 rounded border border-input bg-background px-2 text-sm"
                disabled={loadingAudit}
              />
            </label>
            <label className="flex flex-col text-sm gap-1">
              Year
              <input
                type="number"
                min={2000}
                max={2100}
                value={year}
                onChange={(event) => setYear(event.target.value)}
                className="h-9 w-28 rounded border border-input bg-background px-2 text-sm"
                disabled={loadingAudit}
              />
            </label>
            <Button onClick={runAudit} disabled={loadingAudit} className="h-9">
              {loadingAudit ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Clock className="mr-2 h-4 w-4" />}
              Run contamination audit
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

