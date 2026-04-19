'use client';

import { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { 
  DAY_IN_MS, 
  STATUS_DISPLAY_LONG, 
  STATUS_DISPLAY_SHORT 
} from '@/lib/constants/app-constants';
import { ThemeSelector } from '@/components/theme/theme-selector';
import { 
  Palette, 
  Bell, 
  User, 
  Wrench, 
  Trash2, 
  RotateCcw, 
  Download, 
  Upload, 
  RefreshCw, 
  AlertTriangle, 
  CheckCircle, 
  XCircle, 
  ChevronRight
} from 'lucide-react';
import { UtcArchiveIndexMigrationCard } from '@/components/settings/utc-archive-index-migration-card';
import { UnifiedMonthIndexMigrationCard } from '@/components/settings/unified-month-index-migration-card';

export function SystemSettingsTab() {
  const [status, setStatus] = useState<string>('');
  const [isLoading, setIsLoading] = useState(false);
  
  const [showClearLogsModal, setShowClearLogsModal] = useState(false);
  const [clearLogsConfirmed, setClearLogsConfirmed] = useState(false);
  const [showResetDefaultsModal, setShowResetDefaultsModal] = useState(false);
  const [resetDefaultsConfirmed, setResetDefaultsConfirmed] = useState(false);
  const [showClearCacheModal, setShowClearCacheModal] = useState(false);
  const [clearCacheConfirmed, setClearCacheConfirmed] = useState(false);

  const updateStatus = (message: string, isError: boolean = false) => {
    setStatus(message);
    const timeout = isError ? STATUS_DISPLAY_SHORT : STATUS_DISPLAY_LONG;
    setTimeout(() => {
      setStatus('');
    }, DAY_IN_MS / 24 / 60 / 60 * timeout);
  };

  const handleClearLogs = async () => {
    if (!clearLogsConfirmed) {
      setShowClearLogsModal(true);
      return;
    }
    
    setShowClearLogsModal(false);
    setClearLogsConfirmed(false);
    setIsLoading(true);
    
    try {
      const response = await fetch('/api/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'clear-logs' })
      });
      
      const result = await response.json();
      
      if (result.success) {
        updateStatus(`✅ ${result.message}`);
      } else {
        updateStatus(`❌ ${result.message}`, true);
      }
    } catch (error) {
      updateStatus('❌ Failed to clear logs. Please try again.', true);
    } finally {
      setIsLoading(false);
    }
  };

  const handleResetDefaults = async () => {
    if (!resetDefaultsConfirmed) {
      setShowResetDefaultsModal(true);
      return;
    }
    
    setShowResetDefaultsModal(false);
    setResetDefaultsConfirmed(false);
    setIsLoading(true);
    
    try {
      const response = await fetch('/api/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          action: 'reset-data',
          parameters: { mode: 'defaults' }
        })
      });
      
      const result = await response.json();

      if (result.success) {
        updateStatus(`✅ ${result.message}`);
        setTimeout(() => {
          window.location.reload();
        }, 1000);
      } else {
        updateStatus(`❌ ${result.message}`, true);
      }
    } catch (error) {
      updateStatus('❌ Failed to reset to defaults. Please try again.', true);
    } finally {
      setIsLoading(false);
    }
  };

  const handleClearCache = async () => {
    if (!clearCacheConfirmed) {
      setShowClearCacheModal(true);
      return;
    }
    
    setShowClearCacheModal(false);
    setClearCacheConfirmed(false);
    setIsLoading(true);
    
    try {
      const response = await fetch('/api/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'clear-cache' })
      });
      
      const result = await response.json();
      
      if (result.success) {
        updateStatus(`✅ ${result.message}`);
      } else {
        updateStatus(`❌ ${result.message}`, true);
      }
    } catch (error) {
      updateStatus('❌ Failed to clear cache. Please try again.', true);
    } finally {
      setIsLoading(false);
    }
  };

  const handleExportData = async () => {
    setIsLoading(true);
    
    try {
      const response = await fetch('/api/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'export-data' })
      });
      
      const result = await response.json();
      
      if (result.success) {
        const blob = new Blob([JSON.stringify(result.data, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `thegame-export-${new Date().toISOString().split('T')[0]}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        
        updateStatus(`✅ ${result.message}`);
      } else {
        updateStatus(`❌ ${result.message}`, true);
      }
    } catch (error) {
      updateStatus('❌ Failed to export data. Please try again.', true);
    } finally {
      setIsLoading(false);
    }
  };

  const handleImportData = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    
    setIsLoading(true);
    
    try {
      const text = await file.text();
      const data = JSON.parse(text);
      
      const response = await fetch('/api/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          action: 'import-data',
          parameters: { data }
        })
      });
      
      const result = await response.json();
      
      if (result.success) {
        updateStatus(`✅ ${result.message}`);
        setTimeout(() => window.location.reload(), 1000);
      } else {
        updateStatus(`❌ ${result.message}`, true);
      }
    } catch (error) {
      updateStatus('❌ Failed to import data. Please check the file format.', true);
    } finally {
      setIsLoading(false);
      event.target.value = '';
    }
  };

  return (
    <TabsContent value="system" className="space-y-4">
      <Tabs defaultValue="theme" className="space-y-4">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="theme" className="flex items-center gap-2">
            <Palette className="h-4 w-4" />
            Theme
          </TabsTrigger>
          <TabsTrigger value="notifications" className="flex items-center gap-2">
            <Bell className="h-4 w-4" />
            Notifications
          </TabsTrigger>
          <TabsTrigger value="account" className="flex items-center gap-2">
            <User className="h-4 w-4" />
            Account
          </TabsTrigger>
          <TabsTrigger value="maintenance" className="flex items-center gap-2">
            <Wrench className="h-4 w-4" />
            Maintenance
          </TabsTrigger>
        </TabsList>

        <TabsContent value="theme" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Theme Settings</CardTitle>
            </CardHeader>
            <CardContent>
              <ThemeSelector />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="notifications" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Notification Settings</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-center py-8 text-muted-foreground">
                <Bell className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>Notification preferences will be configured here</p>
                <p className="text-sm">Email alerts, system notifications, and reminder settings</p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="account" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Account Settings</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-center py-8 text-muted-foreground">
                <User className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>Account management will be configured here</p>
                <p className="text-sm">Profile settings, security preferences, and account information</p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="maintenance" className="space-y-4">
          <Card className="overflow-hidden">
            <CardContent className="p-0">
              <details className="group">
                <summary className="list-none flex cursor-pointer items-center justify-between gap-2 px-6 py-4">
                  <span className="flex items-center gap-2 font-medium">
                    <Wrench className="h-4 w-4" />
                    Data Management
                  </span>
                  <ChevronRight className="h-4 w-4 text-muted-foreground transition-transform duration-200 group-open:rotate-90" />
                </summary>
                <div className="border-t px-6 py-4 space-y-4">
                  <CardDescription>
                    export/import data, clear logs, reset settings.
                  </CardDescription>

                  {status && (
                    <div className={`p-3 rounded-md text-sm flex items-center gap-2 ${
                      status.includes('✅') 
                        ? 'bg-green-50 text-green-700 border border-green-200' 
                        : 'bg-red-50 text-red-700 border border-red-200'
                    }`}>
                      {status.includes('✅') ? (
                        <CheckCircle className="h-4 w-4" />
                      ) : (
                        <XCircle className="h-4 w-4" />
                      )}
                      {status}
                    </div>
                  )}

                  <div>
                    <h4 className="font-medium text-sm mb-3">Export & Import Data</h4>
                    <div className="flex flex-wrap gap-2">
                      <Button onClick={handleExportData} variant="outline" disabled={isLoading}>
                        <Download className="h-4 w-4 mr-2" />
                        Export Data
                      </Button>
                      
                      <div className="relative">
                        <input
                          type="file"
                          accept=".json"
                          onChange={handleImportData}
                          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                          disabled={isLoading}
                        />
                        <Button variant="outline" disabled={isLoading}>
                          <Upload className="h-4 w-4 mr-2" />
                          {isLoading ? 'Importing...' : 'Import Data'}
                        </Button>
                      </div>
                    </div>
                  </div>

                  <div className="border-t pt-4 space-y-4">
                    <UtcArchiveIndexMigrationCard />
                  </div>

                  <div className="border-t pt-4 space-y-4">
                    <UnifiedMonthIndexMigrationCard />
                  </div>

                  <div className="border-t pt-4">
                    <h4 className="font-medium text-sm mb-3">Clear Logs & Cache</h4>
                    <div className="flex flex-wrap gap-2">
                      <Button onClick={handleClearLogs} variant="outline" disabled={isLoading}>
                        <Trash2 className="h-4 w-4 mr-2" />
                        Clear Logs
                      </Button>

                      <Button onClick={handleClearCache} variant="outline" disabled={isLoading}>
                        <RefreshCw className="h-4 w-4 mr-2" />
                        Clear Cache
                      </Button>
                    </div>
                  </div>

                  <div className="border-t pt-4">
                    <h4 className="font-medium text-sm mb-3 text-destructive">Reset to Defaults</h4>
                    <div className="flex flex-wrap gap-2">
                      <Button 
                        onClick={handleResetDefaults} 
                        className="bg-red-600 hover:bg-red-700 text-white"
                        disabled={isLoading}
                      >
                        <RotateCcw className="h-4 w-4 mr-2" />
                        Reset to Defaults
                      </Button>
                    </div>
                  </div>

                  <Dialog open={showClearLogsModal} onOpenChange={setShowClearLogsModal}>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                          <AlertTriangle className="h-5 w-5 text-orange-500" />
                          Clear Logs
                        </DialogTitle>
                        <DialogDescription>
                          This will clear all entity logs (tasks, items, financials, etc.) while preserving system logs (dev-log, notes-log).
                        </DialogDescription>
                      </DialogHeader>
                      <div className="flex items-center space-x-2">
                        <Checkbox 
                          id="clear-logs-confirm" 
                          checked={clearLogsConfirmed}
                          onCheckedChange={(checked) => setClearLogsConfirmed(checked === true)}
                        />
                        <Label htmlFor="clear-logs-confirm">
                          I understand this will clear all entity logs
                        </Label>
                      </div>
                      <DialogFooter>
                        <Button variant="outline" onClick={() => setShowClearLogsModal(false)}>
                          Cancel
                        </Button>
                        <Button 
                          onClick={handleClearLogs} 
                          disabled={!clearLogsConfirmed}
                          className="bg-orange-600 hover:bg-orange-700"
                        >
                          Clear Logs
                        </Button>
                      </DialogFooter>
                    </DialogContent>
                  </Dialog>

                  <Dialog open={showResetDefaultsModal} onOpenChange={setShowResetDefaultsModal}>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                          <AlertTriangle className="h-5 w-5 text-red-500" />
                          Reset to Defaults
                        </DialogTitle>
                        <DialogDescription>
                          This will clear ALL data and reset the system to default state. This action cannot be undone.
                        </DialogDescription>
                      </DialogHeader>
                      <div className="flex items-center space-x-2">
                        <Checkbox 
                          id="reset-defaults-confirm" 
                          checked={resetDefaultsConfirmed}
                          onCheckedChange={(checked) => setResetDefaultsConfirmed(checked === true)}
                        />
                        <Label htmlFor="reset-defaults-confirm">
                          I understand this will delete ALL data
                        </Label>
                      </div>
                      <DialogFooter>
                        <Button variant="outline" onClick={() => setShowResetDefaultsModal(false)}>
                          Cancel
                        </Button>
                        <Button 
                          onClick={handleResetDefaults} 
                          disabled={!resetDefaultsConfirmed}
                          className="bg-red-600 hover:bg-red-700 text-white"
                        >
                          Reset to Defaults
                        </Button>
                      </DialogFooter>
                    </DialogContent>
                  </Dialog>

                  <Dialog open={showClearCacheModal} onOpenChange={setShowClearCacheModal}>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                          <AlertTriangle className="h-5 w-5 text-blue-500" />
                          Clear Cache
                        </DialogTitle>
                        <DialogDescription>
                          This will clear all cached data to resolve potential sync issues.
                        </DialogDescription>
                      </DialogHeader>
                      <div className="flex items-center space-x-2">
                        <Checkbox 
                          id="clear-cache-confirm" 
                          checked={clearCacheConfirmed}
                          onCheckedChange={(checked) => setClearCacheConfirmed(checked === true)}
                        />
                        <Label htmlFor="clear-cache-confirm">
                          I understand this will clear all cached data
                        </Label>
                      </div>
                      <DialogFooter>
                        <Button variant="outline" onClick={() => setShowClearCacheModal(false)}>
                          Cancel
                        </Button>
                        <Button 
                          onClick={handleClearCache} 
                          disabled={!clearCacheConfirmed}
                          className="bg-blue-600 hover:bg-blue-700"
                        >
                          Clear Cache
                        </Button>
                      </DialogFooter>
                    </DialogContent>
                  </Dialog>
                </div>
              </details>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </TabsContent>
  );
}
