'use client';

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, CheckCircle2, XCircle, AlertTriangle } from 'lucide-react';

export default function MigrationsPage() {
  const [backfillStatus, setBackfillStatus] = useState<'idle' | 'running' | 'success' | 'error'>('idle');
  const [backfillResult, setBackfillResult] = useState<any>(null);
  const [remapStatus, setRemapStatus] = useState<'idle' | 'running' | 'success' | 'error'>('idle');
  const [remapResult, setRemapResult] = useState<any>(null);
  const [previewData, setPreviewData] = useState<any>(null);

  const runBackfillSalesChannel = async () => {
    setBackfillStatus('running');
    setBackfillResult(null);
    
    try {
      const response = await fetch('/api/migrations/backfill-sales-channel', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      });
      
      const data = await response.json();
      
      if (data.success) {
        setBackfillStatus('success');
        setBackfillResult(data);
      } else {
        setBackfillStatus('error');
        setBackfillResult(data);
      }
    } catch (error) {
      setBackfillStatus('error');
      setBackfillResult({ error: error instanceof Error ? error.message : 'Unknown error' });
    }
  };

  const previewRemap = async () => {
    try {
      const response = await fetch('/api/migrations/remap-production-stations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ preview: true })
      });
      
      const data = await response.json();
      
      if (data.success) {
        setPreviewData(data.preview);
      } else {
        alert(`Preview failed: ${data.error}`);
      }
    } catch (error) {
      alert(`Preview failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };

  const runRemapProductionStations = async () => {
    setRemapStatus('running');
    setRemapResult(null);
    
    try {
      const response = await fetch('/api/migrations/remap-production-stations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ preview: false })
      });
      
      const data = await response.json();
      
      if (data.success) {
        setRemapStatus('success');
        setRemapResult(data);
      } else {
        setRemapStatus('error');
        setRemapResult(data);
      }
    } catch (error) {
      setRemapStatus('error');
      setRemapResult({ error: error instanceof Error ? error.message : 'Unknown error' });
    }
  };

  return (
    <div className="space-y-6 p-6">
      <div>
        <h1 className="text-3xl font-bold">Data Migrations</h1>
        <p className="text-muted-foreground">
          Run migration scripts to update existing data for the new architecture
        </p>
      </div>

      {/* Sales Channel Backfill */}
      <Card>
        <CardHeader>
          <CardTitle>Backfill Sales Channel</CardTitle>
          <CardDescription>
            Populate the salesChannel field for existing FinancialRecords created from Sales.
            This ensures all sales revenue entries remember which channel they came from.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-4">
            <Button
              onClick={runBackfillSalesChannel}
              disabled={backfillStatus === 'running'}
            >
              {backfillStatus === 'running' ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Running...
                </>
              ) : (
                'Run Backfill'
              )}
            </Button>
          </div>

          {backfillStatus === 'success' && backfillResult && (
            <Alert>
              <CheckCircle2 className="h-4 w-4" />
              <AlertDescription>
                <div className="font-semibold mb-2">Migration completed successfully!</div>
                <div className="text-sm space-y-1">
                  <div>Processed: {backfillResult.stats?.processed || 0} records</div>
                  <div>Updated: {backfillResult.stats?.updated || 0} records</div>
                  <div>Errors: {backfillResult.stats?.errors || 0}</div>
                </div>
              </AlertDescription>
            </Alert>
          )}

          {backfillStatus === 'error' && backfillResult && (
            <Alert variant="destructive">
              <XCircle className="h-4 w-4" />
              <AlertDescription>
                <div className="font-semibold mb-2">Migration failed</div>
                <div className="text-sm">{backfillResult.error || 'Unknown error'}</div>
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>

      {/* Production Station Remap */}
      <Card>
        <CardHeader>
          <CardTitle>Remap Production Stations</CardTitle>
          <CardDescription>
            Update PRODUCTION stations from product names (Artworks, Stickers, etc.) to process names (Buy Orders, Making, Dispatches).
            This affects FinancialRecords, Tasks, and Items.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-4">
            <Button
              onClick={previewRemap}
              variant="outline"
              disabled={remapStatus === 'running'}
            >
              Preview Changes
            </Button>
            <Button
              onClick={runRemapProductionStations}
              disabled={remapStatus === 'running'}
            >
              {remapStatus === 'running' ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Running...
                </>
              ) : (
                'Run Remap'
              )}
            </Button>
          </div>

          {previewData && (
            <Alert>
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                <div className="font-semibold mb-2">Preview Results:</div>
                <div className="text-sm space-y-1">
                  <div>FinancialRecords: {previewData.finrecsToUpdate?.length || 0} would be updated</div>
                  <div>Tasks: {previewData.tasksToUpdate?.length || 0} would be updated</div>
                  <div>Items: {previewData.itemsToUpdate?.length || 0} would be updated</div>
                </div>
                {previewData.finrecsToUpdate?.length > 0 && (
                  <details className="mt-2">
                    <summary className="cursor-pointer text-xs">View sample changes</summary>
                    <pre className="text-xs mt-2 p-2 bg-muted rounded overflow-auto max-h-40">
                      {JSON.stringify(previewData, null, 2)}
                    </pre>
                  </details>
                )}
              </AlertDescription>
            </Alert>
          )}

          {remapStatus === 'success' && remapResult && (
            <Alert>
              <CheckCircle2 className="h-4 w-4" />
              <AlertDescription>
                <div className="font-semibold mb-2">Migration completed successfully!</div>
                <div className="text-sm space-y-1">
                  <div>FinancialRecords: {remapResult.stats?.finrecsUpdated || 0} updated</div>
                  <div>Tasks: {remapResult.stats?.tasksUpdated || 0} updated</div>
                  <div>Items: {remapResult.stats?.itemsUpdated || 0} updated</div>
                  <div>Errors: {remapResult.stats?.errors || 0}</div>
                </div>
              </AlertDescription>
            </Alert>
          )}

          {remapStatus === 'error' && remapResult && (
            <Alert variant="destructive">
              <XCircle className="h-4 w-4" />
              <AlertDescription>
                <div className="font-semibold mb-2">Migration failed</div>
                <div className="text-sm">{remapResult.error || 'Unknown error'}</div>
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Important Notes</CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground space-y-2">
          <p>• These migrations modify your data. It's recommended to backup your data first.</p>
          <p>• Run migrations during low-traffic periods if possible.</p>
          <p>• The Production Station Remap has a preview mode - use it first to see what will change.</p>
          <p>• If you encounter errors, check the browser console and server logs for details.</p>
        </CardContent>
      </Card>
    </div>
  );
}

