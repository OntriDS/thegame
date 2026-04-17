'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Database, AlertTriangle, CheckCircle2, Loader2, XCircle } from 'lucide-react';
import { initializeItemMedia } from '@/app/actions/media-migration';

export function MediaMigrationCard() {
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState<{ 
    type: 'success' | 'error' | 'idle', 
    message: string,
    totalCount?: number,
    updatedCount?: number 
  }>({ type: 'idle', message: '' });

  const handleMigration = async (dryRun: boolean) => {
    setLoading(true);
    setStatus({ type: 'idle', message: 'Processing...' });
    try {
      const res = await initializeItemMedia(dryRun);
      if (res.success) {
        setStatus({
          type: 'success',
          message: res.message || 'Complete',
          totalCount: res.totalCount,
          updatedCount: res.updatedCount
        });
      } else {
        setStatus({
          type: 'error',
          message: res.message || 'Migration failed'
        });
      }
    } catch (error) {
      setStatus({
        type: 'error',
        message: 'An unexpected error occurred during the request.'
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="border-primary/20 bg-primary/5">
      <CardHeader>
        <div className="flex items-center gap-2">
          <Database className="h-5 w-5 text-primary" />
          <CardTitle>Media Schema Migration</CardTitle>
        </div>
        <CardDescription>
          Initializes the new R2 media schema for all existing items. 
          This adds an empty media object to items that don&apos;t have one to ensure type safety.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="bg-yellow-50 dark:bg-yellow-950/30 border border-yellow-200 dark:border-yellow-900 rounded-md p-3 flex gap-3 text-sm text-yellow-800 dark:text-yellow-200">
          <AlertTriangle className="h-5 w-5 shrink-0" />
          <p>
            <strong>Safe Update:</strong> This only initializes missing fields. It does not touch existing image data. 
            Run a <strong>Dry-run</strong> first to check counts.
          </p>
        </div>

        {status.type === 'success' && (
          <div className="bg-green-50 dark:bg-green-950/30 border border-green-200 dark:border-green-900 rounded-md p-3 flex gap-3 text-sm text-green-800 dark:text-green-200">
            <CheckCircle2 className="h-5 w-5 shrink-0" />
            <div>
              <p className="font-semibold">{status.message}</p>
              {status.totalCount !== undefined && (
                <p className="text-xs opacity-80 mt-1">
                  Total Items: {status.totalCount} | Needing Initialization: {status.updatedCount}
                </p>
              )}
            </div>
          </div>
        )}

        {status.type === 'error' && (
          <div className="bg-destructive/10 border border-destructive/20 rounded-md p-3 flex gap-3 text-sm text-destructive">
            <XCircle className="h-5 w-5 shrink-0" />
            <p className="font-semibold">{status.message}</p>
          </div>
        )}

        <div className="flex gap-2">
          <Button 
            variant="outline" 
            onClick={() => handleMigration(true)} 
            disabled={loading}
            className="h-9"
          >
            {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
            Dry-Run
          </Button>
          <Button 
            onClick={() => handleMigration(false)} 
            disabled={loading}
            className="h-9"
          >
            {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
            Execute Migration
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
