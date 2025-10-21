'use client';

import { useState, useEffect } from 'react';
import { TabsContent } from '@/components/ui/tabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
// import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  RefreshCw, 
  CheckCircle, 
  AlertTriangle, 
  XCircle, 
  Clock,
  Database,
  FileText,
  Code,
  Target
} from 'lucide-react';
import { SYNC_STRATEGIES, SyncResult } from '@/workflows/settings/research-logs-sync';

interface SyncStatus {
  needsSync: string[];
  upToDate: string[];
  conflicts: string[];
}

export function ResearchSyncTab() {
  const [syncStatus, setSyncStatus] = useState<SyncStatus>({ needsSync: [], upToDate: [], conflicts: [] });
  const [isLoading, setIsLoading] = useState(false);
  const [lastSync, setLastSync] = useState<Record<string, string>>({});
  const [syncResults, setSyncResults] = useState<Record<string, SyncResult>>({});

  // Load sync status on mount
  useEffect(() => {
    loadSyncStatus();
  }, []);

  const loadSyncStatus = async () => {
    try {
      const response = await fetch('/api/sync-research-logs');
      if (response.ok) {
        const data = await response.json();
        setSyncStatus(data.status);
      }
    } catch (error) {
      console.error('Failed to load sync status:', error);
    }
  };

  const handleSync = async (logType: string) => {
    setIsLoading(true);
    try {
      const response = await fetch('/api/sync-research-logs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ logType })
      });

      const result = await response.json();
      
      if (result.success) {
        setSyncResults(prev => ({ ...prev, [logType]: result.results }));
        setLastSync(prev => ({ ...prev, [logType]: new Date().toISOString() }));
        await loadSyncStatus(); // Refresh status
      } else {
        console.error('Sync failed:', result.error);
      }
    } catch (error) {
      console.error('Sync error:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const getStatusIcon = (logType: string) => {
    if (syncStatus.conflicts.includes(logType)) return <AlertTriangle className="h-4 w-4 text-yellow-500" />;
    if (syncStatus.needsSync.includes(logType)) return <Clock className="h-4 w-4 text-blue-500" />;
    if (syncStatus.upToDate.includes(logType)) return <CheckCircle className="h-4 w-4 text-green-500" />;
    return <XCircle className="h-4 w-4 text-gray-500" />;
  };

  const getStatusBadge = (logType: string) => {
    if (syncStatus.conflicts.includes(logType)) return <Badge variant="destructive">Conflict</Badge>;
    if (syncStatus.needsSync.includes(logType)) return <Badge variant="secondary">Needs Sync</Badge>;
    if (syncStatus.upToDate.includes(logType)) return <Badge variant="outline">Up to Date</Badge>;
    return <Badge variant="outline">Unknown</Badge>;
  };

  const getFileIcon = (logType: string) => {
    switch (logType) {
      case 'project-status': return <Target className="h-5 w-5" />;
      case 'dev-log': return <Code className="h-5 w-5" />;
      case 'notes-log': return <FileText className="h-5 w-5" />;
      default: return <Database className="h-5 w-5" />;
    }
  };

  const getSyncButtonText = (logType: string) => {
    const strategy = SYNC_STRATEGIES[logType];
    switch (strategy.type) {
      case 'force': return 'Sync Project Status';
      case 'smart': return 'Sync Dev Log';
      case 'migrate-once': return 'Migrate Notes (One-Time)';
      default: return `Sync ${logType}`;
    }
  };

  const isButtonDisabled = (logType: string) => {
    const strategy = SYNC_STRATEGIES[logType];
    if (strategy.type === 'migrate-once' && syncStatus.upToDate.includes(logType)) {
      return true; // Disable after migration
    }
    return isLoading;
  };

  const researchDataTypes = ['project-status', 'dev-log', 'notes-log'];

  return (
    <TabsContent value="research-sync" className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <RefreshCw className="h-5 w-5" />
            Research Data Sync
          </CardTitle>
          <CardDescription>
            Sync research data from local files to KV storage. Different strategies prevent data conflicts.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Status Overview */}
          <div className="grid grid-cols-3 gap-4">
            <div className="text-center p-4 border rounded-lg">
              <div className="text-2xl font-bold text-blue-600">{syncStatus.needsSync.length}</div>
              <div className="text-sm text-muted-foreground">Need Sync</div>
            </div>
            <div className="text-center p-4 border rounded-lg">
              <div className="text-2xl font-bold text-green-600">{syncStatus.upToDate.length}</div>
              <div className="text-sm text-muted-foreground">Up to Date</div>
            </div>
            <div className="text-center p-4 border rounded-lg">
              <div className="text-2xl font-bold text-yellow-600">{syncStatus.conflicts.length}</div>
              <div className="text-sm text-muted-foreground">Conflicts</div>
            </div>
          </div>

          {/* Individual Sync Cards */}
          <div className="space-y-4">
            {researchDataTypes.map((logType) => {
              const strategy = SYNC_STRATEGIES[logType];
              const result = syncResults[logType];
              
              return (
                <Card key={logType} className="border-l-4 border-l-blue-500">
                  <CardContent className="pt-6">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        {getFileIcon(logType)}
                        <div>
                          <h3 className="font-semibold capitalize">
                            {logType.replace('-', ' ')}
                          </h3>
                          <p className="text-sm text-muted-foreground">
                            {strategy.description}
                          </p>
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-3">
                        {getStatusIcon(logType)}
                        {getStatusBadge(logType)}
                        
                        <Button
                          onClick={() => handleSync(logType)}
                          disabled={isButtonDisabled(logType)}
                          size="sm"
                          variant={strategy.type === 'force' ? 'default' : 'outline'}
                        >
                          {isLoading ? (
                            <RefreshCw className="h-4 w-4 animate-spin" />
                          ) : (
                            getSyncButtonText(logType)
                          )}
                        </Button>
                      </div>
                    </div>

                    {/* Last Sync Time */}
                    {lastSync[logType] && (
                      <div className="mt-2 text-xs text-muted-foreground">
                        Last synced: {new Date(lastSync[logType]).toLocaleString()}
                      </div>
                    )}

                    {/* Sync Results */}
                    {result && (
                      <div className="mt-3 space-y-2">
                        {result.synced.length > 0 && (
                          <div className="p-4 border rounded-lg bg-green-50 border-green-200">
                            <div className="flex items-center gap-2">
                              <CheckCircle className="h-4 w-4 text-green-600" />
                              <span className="text-green-800">
                                Successfully synced: {result.synced.join(', ')}
                              </span>
                            </div>
                          </div>
                        )}
                        
                        {result.conflicts.length > 0 && (
                          <div className="p-4 border rounded-lg bg-red-50 border-red-200">
                            <div className="flex items-center gap-2">
                              <AlertTriangle className="h-4 w-4 text-red-600" />
                              <span className="text-red-800">
                                Conflicts detected: {result.conflicts.join(', ')}
                              </span>
                            </div>
                          </div>
                        )}
                        
                        {result.errors.length > 0 && (
                          <div className="p-4 border rounded-lg bg-red-50 border-red-200">
                            <div className="flex items-center gap-2">
                              <XCircle className="h-4 w-4 text-red-600" />
                              <span className="text-red-800">
                                Errors: {result.errors.join(', ')}
                              </span>
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </div>

          {/* Strategy Information */}
          <Card className="bg-muted/50">
            <CardHeader>
              <CardTitle className="text-sm">Sync Strategies</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              <div className="flex items-center gap-2">
                <Target className="h-4 w-4 text-blue-500" />
                <span><strong>Project Status:</strong> Force sync - always overwrites KV (version controlled)</span>
              </div>
              <div className="flex items-center gap-2">
                <Code className="h-4 w-4 text-orange-500" />
                <span><strong>Dev Log:</strong> Smart sync - checks timestamps, warns on conflicts</span>
              </div>
              <div className="flex items-center gap-2">
                <FileText className="h-4 w-4 text-green-500" />
                <span><strong>Notes:</strong> One-time migration - KV becomes source of truth after sync</span>
              </div>
            </CardContent>
          </Card>
        </CardContent>
      </Card>
    </TabsContent>
  );
}
