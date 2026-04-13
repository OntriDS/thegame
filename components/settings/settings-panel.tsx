'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { 
  Trash2, 
  RotateCcw, 
  Database, 
  Download, 
  Upload, 
  RefreshCw,
  AlertTriangle,
  CheckCircle,
  XCircle
} from 'lucide-react';
import { 
  DAY_IN_MS, 
  STATUS_DISPLAY_LONG, 
  STATUS_DISPLAY_SHORT 
} from '@/lib/constants/app-constants';
import ItemsImportExport from '@/components/settings/items-import-export';
import { TimezoneSettingsCard } from '@/components/settings/timezone-settings-card';
import { ITEM_TAXONOMY_SCOPES } from '@/lib/item-taxonomy-migrate-scopes';
interface SettingsPanelProps {
  onStatusUpdate?: (status: string) => void;
}

export function SettingsPanel({ onStatusUpdate }: SettingsPanelProps) {
  const [status, setStatus] = useState<string>('');
  const [isLoading, setIsLoading] = useState(false);
  // Modal states
  const [showClearLogsModal, setShowClearLogsModal] = useState(false);
  const [clearLogsConfirmed, setClearLogsConfirmed] = useState(false);
  const [showResetDefaultsModal, setShowResetDefaultsModal] = useState(false);
  const [resetDefaultsConfirmed, setResetDefaultsConfirmed] = useState(false);
  const [showClearCacheModal, setShowClearCacheModal] = useState(false);
  const [clearCacheConfirmed, setClearCacheConfirmed] = useState(false);
  const [taxonomyScopes, setTaxonomyScopes] = useState<string[]>(['all']);
  const [taxonomyReportText, setTaxonomyReportText] = useState<string>('');
  const [showTaxonomyApplyModal, setShowTaxonomyApplyModal] = useState(false);
  const [taxonomyApplyConfirmed, setTaxonomyApplyConfirmed] = useState(false);

  const updateStatus = (message: string, isError: boolean = false) => {
    setStatus(message);
    if (onStatusUpdate) {
      onStatusUpdate(message);
    }
    const timeout = isError ? STATUS_DISPLAY_SHORT : STATUS_DISPLAY_LONG;
    setTimeout(() => {
      setStatus('');
      if (onStatusUpdate) {
        onStatusUpdate('');
      }
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
        // Force page refresh to show updated data
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
        // Create and download the export file
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

  const TAXONOMY_SCOPE_LABELS: Record<string, string> = {
    all: 'All (types + subtypes)',
    'item-type': 'Item types only',
    digital: 'Digital subtypes',
    artwork: 'Artwork subtypes',
    print: 'Print subtypes',
    sticker: 'Sticker subtypes',
    merch: 'Merch subtypes',
    craft: 'Craft subtypes',
    bundle: 'Bundle subtypes',
    material: 'Material subtypes',
    equipment: 'Equipment subtypes',
  };

  const toggleTaxonomyScope = (scope: string, checked: boolean) => {
    if (scope === 'all') {
      setTaxonomyScopes(checked ? ['all'] : []);
      return;
    }
    setTaxonomyScopes((prev) => {
      let next = prev.filter((s) => s !== 'all');
      if (checked) next = [...next.filter((s) => s !== scope), scope];
      else next = next.filter((s) => s !== scope);
      return next.length === 0 ? ['all'] : next;
    });
  };

  const runNormalizeItemTaxonomy = async (dryRun: boolean) => {
    const scopes = taxonomyScopes.includes('all') ? ['all'] : taxonomyScopes.length > 0 ? taxonomyScopes : ['all'];
    setIsLoading(true);
    setTaxonomyReportText('');
    try {
      const response = await fetch('/api/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'normalize-item-taxonomy',
          parameters: { dryRun, scopes },
        }),
      });
      const result = await response.json();
      const data = result.data;
      const reportJson =
        data != null
          ? JSON.stringify(
              {
                message: result.message,
                report: data.report,
                items: data.items,
                tasks: data.tasks,
                financials: data.financials,
                sales: data.sales,
                errors: data.errors,
              },
              null,
              2
            )
          : JSON.stringify(result, null, 2);
      setTaxonomyReportText(reportJson);
      if (result.success) {
        updateStatus(`✅ ${result.message}`);
      } else {
        updateStatus(`❌ ${result.message}`, true);
      }
    } catch {
      updateStatus('❌ Item taxonomy migration failed.', true);
    } finally {
      setIsLoading(false);
      setShowTaxonomyApplyModal(false);
      setTaxonomyApplyConfirmed(false);
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
        // Reload the page to reflect changes
        setTimeout(() => window.location.reload(), 1000);
      } else {
        updateStatus(`❌ ${result.message}`, true);
      }
    } catch (error) {
      updateStatus('❌ Failed to import data. Please check the file format.', true);
    } finally {
      setIsLoading(false);
      event.target.value = ''; // Reset file input
    }
  };


  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* System Management Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Database className="h-5 w-5" />
            System Management
          </CardTitle>
          <CardDescription>
            Manage your data, clear logs, reset settings, and perform system maintenance operations.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
        {/* Status Display */}
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

        {/* Data Management Section */}
        <div>
          <h4 className="font-medium text-sm mb-3">Data Management</h4>
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

        {/* System Maintenance Section */}
        <div className="border-t pt-4">
          <h4 className="font-medium text-sm mb-3">System Maintenance</h4>
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

        {/* Danger Zone */}
        <div className="border-t pt-4">
          <h4 className="font-medium text-sm mb-3 text-destructive">Danger Zone</h4>
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

        {/* Confirmation Modals */}
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

        </CardContent>
      </Card>

      <TimezoneSettingsCard />
      
      {/* CSV Import/Export Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Database className="h-5 w-5" />
            CSV Import/Export
          </CardTitle>
          <CardDescription>
            Import and export items using CSV files for bulk operations.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ItemsImportExport />
        </CardContent>
      </Card>

      <Card className="lg:col-span-2">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Database className="h-5 w-5" />
            Item type and subtype migration
          </CardTitle>
          <CardDescription>
            Normalize legacy item <code className="text-xs">type</code> / <code className="text-xs">subItemType</code> and
            matching output fields on tasks, sales (service lines), and financial records. Run a dry run first; apply writes
            to the database.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap gap-4">
            {ITEM_TAXONOMY_SCOPES.map((scope) => (
              <div key={scope} className="flex items-center space-x-2">
                <Checkbox
                  id={`taxonomy-scope-${scope}`}
                  checked={taxonomyScopes.includes(scope)}
                  onCheckedChange={(c) => toggleTaxonomyScope(scope, c === true)}
                />
                <Label htmlFor={`taxonomy-scope-${scope}`} className="text-sm font-normal cursor-pointer">
                  {TAXONOMY_SCOPE_LABELS[scope] ?? scope}
                </Label>
              </div>
            ))}
          </div>
          <div className="flex flex-wrap gap-2">
            <Button
              variant="outline"
              disabled={isLoading}
              onClick={() => runNormalizeItemTaxonomy(true)}
            >
              Dry run
            </Button>
            <Button
              variant="destructive"
              disabled={isLoading}
              onClick={() => setShowTaxonomyApplyModal(true)}
            >
              Apply migration
            </Button>
          </div>
          {taxonomyReportText ? (
            <pre className="text-xs bg-muted p-3 rounded-md max-h-80 overflow-auto border whitespace-pre-wrap">
              {taxonomyReportText}
            </pre>
          ) : null}

          <Dialog open={showTaxonomyApplyModal} onOpenChange={setShowTaxonomyApplyModal}>
            <DialogContent>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <AlertTriangle className="h-5 w-5 text-red-500" />
                  Apply item taxonomy migration
                </DialogTitle>
                <DialogDescription>
                  This will update stored item types and subtypes (and related output fields) according to the selected
                  scopes. Run a dry run first and keep a backup export.
                </DialogDescription>
              </DialogHeader>
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="taxonomy-apply-confirm"
                  checked={taxonomyApplyConfirmed}
                  onCheckedChange={(checked) => setTaxonomyApplyConfirmed(checked === true)}
                />
                <Label htmlFor="taxonomy-apply-confirm">I understand this will modify production data</Label>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setShowTaxonomyApplyModal(false)}>
                  Cancel
                </Button>
                <Button
                  disabled={!taxonomyApplyConfirmed}
                  className="bg-red-600 hover:bg-red-700"
                  onClick={() => runNormalizeItemTaxonomy(false)}
                >
                  Apply
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </CardContent>
      </Card>
    </div>
  );
}
