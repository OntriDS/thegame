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
  Target,
  Download
} from 'lucide-react';
import { SYNC_STRATEGIES, SyncResult } from '@/workflows/settings/research-sync';
import { ClientAPI } from '@/lib/client-api';

interface SyncStatus {
  needsSync: string[];
  upToDate: string[];
  conflicts: string[];
}

export function ResearchSyncTab() {
  const [syncStatus, setSyncStatus] = useState<SyncStatus>({ needsSync: [], upToDate: [], conflicts: [] });
  const [isLoading, setIsLoading] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const [lastSync, setLastSync] = useState<Record<string, string>>({});
  const [syncResults, setSyncResults] = useState<Record<string, SyncResult>>({});
  const [strategyOverrides, setStrategyOverrides] = useState<Record<string, 'replace' | 'merge'>>({});

  // Load sync status on mount
  useEffect(() => {
    loadSyncStatus();
  }, []);

  const loadSyncStatus = async () => {
    try {
      const data = await ClientAPI.getResearchSyncStatus();
      setSyncStatus(data.status);
    } catch (error) {
      console.error('Failed to load sync status:', error);
    }
  };

  const handleSync = async (logType: string) => {
    setIsLoading(true);
    try {
      const result = await ClientAPI.syncResearchLogs(logType, strategyOverrides[logType]);
      
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

  const handleDownloadProjectStatus = async () => {
    setIsDownloading(true);
    try {
      const response = await fetch('/api/project-status');
      if (response.ok) {
        const data = await response.json();
        
        // Create a blob with the JSON data
        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
        const url = window.URL.createObjectURL(blob);
        
        // Create a temporary link and trigger download
        const link = document.createElement('a');
        link.href = url;
        link.download = `project-status-${new Date().toISOString().split('T')[0]}.json`;
        document.body.appendChild(link);
        link.click();
        
        // Cleanup
        document.body.removeChild(link);
        window.URL.revokeObjectURL(url);
      } else {
        console.error('Failed to download project status');
      }
    } catch (error) {
      console.error('Download error:', error);
    } finally {
      setIsDownloading(false);
    }
  };

  const handleDownloadDevLog = async () => {
    setIsDownloading(true);
    try {
      const response = await fetch('/api/dev-log');
      if (response.ok) {
        const data = await response.json();
        
        // Create a blob with the JSON data
        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
        const url = window.URL.createObjectURL(blob);
        
        // Create a temporary link and trigger download
        const link = document.createElement('a');
        link.href = url;
        link.download = `dev-log-${new Date().toISOString().split('T')[0]}.json`;
        document.body.appendChild(link);
        link.click();
        
        // Cleanup
        document.body.removeChild(link);
        window.URL.revokeObjectURL(url);
      } else {
        console.error('Failed to download dev log');
      }
    } catch (error) {
      console.error('Download error:', error);
    } finally {
      setIsDownloading(false);
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
    const displayName = logType.replace('-', ' ').replace(/\b\w/g, l => l.toUpperCase());
    switch (strategy.type) {
      case 'replace': return `Replace ${displayName}`;
      case 'merge': return `Merge ${displayName}`;
      default: return `Sync ${displayName}`;
    }
  };

  const isButtonDisabled = (logType: string) => {
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
                        
                        {/* Download button for project-status */}
                        {logType === 'project-status' && (
                          <Button
                            onClick={handleDownloadProjectStatus}
                            disabled={isDownloading}
                            size="sm"
                            variant="outline"
                          >
                            {isDownloading ? (
                              <RefreshCw className="h-4 w-4 animate-spin" />
                            ) : (
                              <>
                                <Download className="h-4 w-4 mr-2" />
                                Download
                              </>
                            )}
                          </Button>
                        )}
                        
                        {/* Download button for dev-log */}
                        {logType === 'dev-log' && (
                          <Button
                            onClick={handleDownloadDevLog}
                            disabled={isDownloading}
                            size="sm"
                            variant="outline"
                          >
                            {isDownloading ? (
                              <RefreshCw className="h-4 w-4 animate-spin" />
                            ) : (
                              <>
                                <Download className="h-4 w-4 mr-2" />
                                Download
                              </>
                            )}
                          </Button>
                        )}
                        
                        <Button
                          onClick={() => handleSync(logType)}
                          disabled={isButtonDisabled(logType)}
                          size="sm"
                          variant={strategy.type === 'replace' ? 'default' : 'outline'}
                        >
                          {isLoading ? (
                            <RefreshCw className="h-4 w-4 animate-spin" />
                          ) : (
                            getSyncButtonText(logType)
                          )}
                        </Button>
                      </div>
                    </div>

                    {/* Sync Strategy Radio Buttons */}
                    <div className="flex items-center gap-4 mt-3">
                      <span className="text-sm text-muted-foreground">Sync Mode:</span>
                      <div className="flex gap-4">
                        <label className="flex items-center gap-2 cursor-pointer">
                          <input
                            type="radio"
                            name={`strategy-${logType}`}
                            value="replace"
                            checked={(strategyOverrides[logType] || SYNC_STRATEGIES[logType].type) === 'replace'}
                            onChange={(e) => setStrategyOverrides(prev => ({ ...prev, [logType]: 'replace' }))}
                            className="cursor-pointer"
                          />
                          <span className="text-sm">Replace</span>
                        </label>
                        <label className="flex items-center gap-2 cursor-pointer">
                          <input
                            type="radio"
                            name={`strategy-${logType}`}
                            value="merge"
                            checked={(strategyOverrides[logType] || SYNC_STRATEGIES[logType].type) === 'merge'}
                            onChange={(e) => setStrategyOverrides(prev => ({ ...prev, [logType]: 'merge' }))}
                            className="cursor-pointer"
                          />
                          <span className="text-sm">Merge</span>
                        </label>
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
                <span><strong>Project Status:</strong> Replace sync - overwrites KV with deployed files (version controlled)</span>
              </div>
              <div className="flex items-center gap-2">
                <Code className="h-4 w-4 text-orange-500" />
                <span><strong>Dev Log:</strong> Replace sync - overwrites KV with deployed files (version controlled)</span>
              </div>
              <div className="flex items-center gap-2">
                <FileText className="h-4 w-4 text-green-500" />
                <span><strong>Notes:</strong> Merge sync - combines deployed files with existing KV data</span>
              </div>
            </CardContent>
          </Card>
        </CardContent>
      </Card>
    </TabsContent>
  );
}
