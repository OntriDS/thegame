'use client';

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { AlertTriangle, CheckCircle2, Clock, Database, Loader2, XCircle } from 'lucide-react';

type MigrationResponse = {
  success: boolean;
  dryRun?: boolean;
  message?: string;
  summary?: unknown;
};

export function UnifiedMonthIndexMigrationCard() {
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState<{
    type: 'success' | 'error' | 'idle';
    message: string;
    payload?: unknown;
  }>({ type: 'idle', message: '' });

  const run = async (dryRun: boolean) => {
    setLoading(true);
    setStatus({ type: 'idle', message: dryRun ? 'Dry-run in progress…' : 'Applying migration…' });

    try {
      const res = await fetch('/api/admin/migrate-unified-month-indexes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ dryRun }),
      });

      const body = (await res.json()) as MigrationResponse;

      if (body.success) {
        setStatus({
          type: 'success',
          message: body.message || 'Unified month index migration completed',
          payload: body.summary ?? body,
        });
      } else {
        setStatus({
          type: 'error',
          message: body.message || 'Migration failed',
        });
      }
    } catch {
      setStatus({ type: 'error', message: 'Request failed. Check network and admin session.' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="border-indigo-500/25 bg-indigo-500/5">
      <CardHeader>
        <div className="flex items-center gap-2">
          <Database className="h-5 w-5 text-indigo-600 dark:text-indigo-400" />
          <CardTitle>Unified month index migration</CardTitle>
        </div>
        <CardDescription>
          Moves legacy <code className="text-xs">thegame:index:&lt;entity&gt;:collected:MM-YY</code> IDs into canonical
          <code className="text-xs"> thegame:index:&lt;entity&gt;:by-month:MM-YY</code> buckets and removes the legacy sets.
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-4">
        <div className="rounded-md border border-indigo-200 bg-indigo-50 p-3 text-sm text-indigo-950 dark:border-indigo-900 dark:bg-indigo-950/30 dark:text-indigo-100 flex gap-3">
          <AlertTriangle className="h-5 w-5 shrink-0" />
          <p>Safe to run multiple times. Run dry-run first to review migration counts before deleting legacy keys.</p>
        </div>

        {status.type === 'success' && (
          <div className="rounded-md border border-green-200 bg-green-50 p-3 text-sm text-green-900 dark:border-green-900 dark:bg-green-950/30 dark:text-green-100 flex gap-3">
            <CheckCircle2 className="h-5 w-5 shrink-0" />
            <div className="min-w-0 flex-1 space-y-2">
              <p className="font-semibold">{status.message}</p>
              {status.payload != null && (
                <pre className="max-h-64 overflow-auto rounded bg-black/5 p-2 text-xs dark:bg-white/10">
                  {JSON.stringify(status.payload, null, 2)}
                </pre>
              )}
            </div>
          </div>
        )}

        {status.type === 'error' && (
          <div className="rounded-md border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive flex gap-3">
            <XCircle className="h-5 w-5 shrink-0" />
            <p className="font-semibold">{status.message}</p>
          </div>
        )}

        <div className="flex flex-wrap gap-2">
          <Button variant="outline" onClick={() => run(true)} disabled={loading} className="h-9">
            {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Clock className="mr-2 h-4 w-4" />}
            Dry-run
          </Button>

          <Button onClick={() => run(false)} disabled={loading} className="h-9">
            {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Database className="mr-2 h-4 w-4" />}
            Execute migration
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
