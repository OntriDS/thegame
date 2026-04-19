'use client';

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { AlertTriangle, CheckCircle2, Clock, Database, Loader2, XCircle } from 'lucide-react';

type MigrationResponse = {
  success: boolean;
  message?: string;
  data?: unknown;
};

export function UtcArchiveIndexMigrationCard() {
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState<{
    type: 'success' | 'error' | 'idle';
    message: string;
    payload?: unknown;
  }>({ type: 'idle', message: '' });

  const run = async (dryRun: boolean) => {
    setLoading(true);
    setStatus({ type: 'idle', message: dryRun ? 'Dry-run in progress…' : 'Writing Redis indexes…' });
    try {
      const res = await fetch('/api/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'utc-archive-index-migration',
          parameters: { dryRun },
        }),
      });
      const body = (await res.json()) as MigrationResponse;
      if (body.success) {
        setStatus({
          type: 'success',
          message: body.message || 'Complete',
          payload: body.data,
        });
      } else {
        setStatus({
          type: 'error',
          message: (body as { message?: string }).message || 'Migration failed',
        });
      }
    } catch {
      setStatus({ type: 'error', message: 'Request failed. Check network and admin session.' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="border-amber-500/25 bg-amber-500/5">
      <CardHeader>
        <div className="flex items-center gap-2">
          <Database className="h-5 w-5 text-amber-600 dark:text-amber-400" />
          <CardTitle>UTC month index migration</CardTitle>
        </div>
        <CardDescription>
          Rebuilds all <code className="text-xs">MM-yy</code> Redis sets (tasks collected archive, entity month indexes,
          items/sales/financials archive collections) and the <strong>task active index</strong> from stored records using
          UTC calendar keys only. Run dry-run first; execute only after reviewing the diff counts.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="rounded-md border border-amber-200 bg-amber-50 p-3 text-sm text-amber-950 dark:border-amber-900 dark:bg-amber-950/30 dark:text-amber-100 flex gap-3">
          <AlertTriangle className="h-5 w-5 shrink-0" />
          <p>
            This rewrites many Redis keys. Dashboard summaries are not recalculated here; if counters look wrong after a
            UTC fix, rebuild summaries from the existing admin tools if you have them.
          </p>
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
