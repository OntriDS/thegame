'use client';

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { AlertTriangle, Database, CheckCircle, Play, Eye, RotateCcw } from 'lucide-react';

interface MigrationSummary {
  totalFound: number;
  migrated: number;
  skipped: number;
  failed: number;
}

interface MigrationResponse {
  success: boolean;
  dryRun: boolean;
  summary: MigrationSummary;
  logs: string[];
}

export default function RedisMigrationPage() {
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<MigrationResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  const runMigration = async (dryRun: boolean) => {
    if (!dryRun && !confirm('CRITICAL: This will rename ALL keys in your database. Are you sure?')) {
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const resp = await fetch(`/api/admin/redis-migration?action=migrate&dryRun=${dryRun}`, {
        method: 'POST'
      });
      const data = await resp.json();
      if (data.success) {
        setResults(data);
      } else {
        setError(data.error || 'Migration failed');
      }
    } catch (err: any) {
      setError(err.message || 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold flex items-center gap-2">
          <Database className="h-8 w-8 text-primary" />
          Redis Namespacing Migration
        </h1>
        <Badge variant="outline" className="text-xs">Phase 1 / Step 1</Badge>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="md:col-span-1 border-warning/50 bg-warning/5">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-warning">
              <AlertTriangle className="h-5 w-5" />
              Safety Instructions
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 text-sm">
            <p>This tool migrates all keys to the <code>thegame:</code> namespace prefix.</p>
            <ul className="list-disc list-inside space-y-2 text-muted-foreground">
              <li>Always run a <strong>Dry Run</strong> first.</li>
              <li>Verify the logs for unexpected key names.</li>
              <li>Ensure you have the Vercel Dashboard open for quick rollback if needed.</li>
              <li>The migration is performed using atomic RENAME logic.</li>
            </ul>
          </CardContent>
        </Card>

        <Card className="md:col-span-2">
          <CardHeader>
            <CardTitle>Migration Control</CardTitle>
            <CardDescription>Execute namespacing operations on the live Redis instance.</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-wrap gap-4">
            <Button 
              variant="outline" 
              onClick={() => runMigration(true)} 
              disabled={loading}
              className="flex items-center gap-2"
            >
              <Eye className="h-4 w-4" />
              {loading ? 'Processing...' : 'Run Dry Run'}
            </Button>
            
            <Button 
              variant="default" 
              onClick={() => runMigration(false)} 
              disabled={loading}
              className="flex items-center gap-2 bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              <Play className="h-4 w-4" />
              {loading ? 'Migrating...' : 'Execute Live Migration'}
            </Button>

            {results && (
              <Button 
                variant="ghost" 
                onClick={() => setResults(null)}
                className="flex items-center gap-2"
              >
                <RotateCcw className="h-4 w-4" />
                Clear Results
              </Button>
            )}
          </CardContent>
        </Card>
      </div>

      {error && (
        <Card className="border-destructive/50 bg-destructive/5">
          <CardContent className="pt-6 flex items-center gap-2 text-destructive">
            <AlertTriangle className="h-5 w-5" />
            <p>{error}</p>
          </CardContent>
        </Card>
      )}

      {results && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              Migration Results
              <Badge variant={results.dryRun ? 'secondary' : 'default'}>
                {results.dryRun ? 'DRY RUN' : 'LIVE'}
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="p-4 rounded-lg bg-muted/50">
                <p className="text-xs text-muted-foreground uppercase">Found</p>
                <p className="text-2xl font-mono">{results.summary.totalFound}</p>
              </div>
              <div className="p-4 rounded-lg bg-primary/10 border border-primary/20">
                <p className="text-xs text-primary uppercase">To Migrate</p>
                <p className="text-2xl font-mono">{results.summary.migrated}</p>
              </div>
              <div className="p-4 rounded-lg bg-muted/50">
                <p className="text-xs text-muted-foreground uppercase">Skipped</p>
                <p className="text-2xl font-mono">{results.summary.skipped}</p>
              </div>
              <div className="p-4 rounded-lg bg-destructive/10 border border-destructive/20">
                <p className="text-xs text-destructive uppercase">Failed</p>
                <p className="text-2xl font-mono">{results.summary.failed}</p>
              </div>
            </div>

            <div className="space-y-2">
              <h3 className="font-semibold flex items-center gap-2">
                <CheckCircle className="h-4 w-4 text-primary" />
                Operation Logs (Last 500)
              </h3>
              <ScrollArea className="h-96 w-full rounded-md border bg-black/5 p-4">
                <div className="space-y-1 font-mono text-xs">
                  {results.logs.map((log, i) => (
                    <div key={i} className={log.includes('FAILED') || log.includes('Error') ? 'text-destructive' : ''}>
                      {log}
                    </div>
                  ))}
                  {results.logs.length === 0 && <p className="text-muted-foreground italic">No logs generated.</p>}
                </div>
              </ScrollArea>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
