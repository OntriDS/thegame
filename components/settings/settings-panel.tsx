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
  XCircle,
  Sprout
} from 'lucide-react';
import { 
  DAY_IN_MS, 
  STATUS_DISPLAY_LONG, 
  STATUS_DISPLAY_SHORT 
} from '@/lib/constants/app-constants';
import ItemsImportExport from '@/components/settings/items-import-export';
import { ClientAPI } from '@/lib/client-api';

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
  const [showBackfillModal, setShowBackfillModal] = useState(false);
  const [backfillConfirmed, setBackfillConfirmed] = useState(false);
  const [showSeedModal, setShowSeedModal] = useState(false);
  const [availableBackups, setAvailableBackups] = useState<Array<{
    entityType: string;
    count: number;
    lastUpdated: string;
  }>>([]);
  const [selectedBackups, setSelectedBackups] = useState<Record<string, boolean>>({});

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

  const handleBackfillLogs = async () => {
    if (!backfillConfirmed) {
      setShowBackfillModal(true);
      return;
    }
    
    setShowBackfillModal(false);
    setBackfillConfirmed(false);
    setIsLoading(true);
    
    try {
      const response = await fetch('/api/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'backfill-logs' })
      });
      
      const result = await response.json();
      
      if (result.success) {
        updateStatus(`✅ ${result.message}`);
      } else {
        updateStatus(`❌ ${result.message}`, true);
      }
    } catch (error) {
      updateStatus('❌ Failed to backfill logs. Please try again.', true);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSeedData = async () => {
    setIsLoading(true);
    
    try {
      // Fetch available backups
      const response = await fetch('/api/backups');
      const result = await response.json();
      
      if (result.success && result.data.backups) {
        setAvailableBackups(result.data.backups);
        // Initialize selected state - all unchecked by default
        const initialSelection: Record<string, boolean> = {};
        result.data.backups.forEach((backup: any) => {
          initialSelection[backup.entityType] = false;
        });
        setSelectedBackups(initialSelection);
        setShowSeedModal(true);
      } else {
        updateStatus('❌ No backups available to seed from', true);
      }
    } catch (error) {
      updateStatus('❌ Failed to load available backups', true);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSeedDataConfirm = async () => {
    setShowSeedModal(false);
    setIsLoading(true);
    
    try {
      // Get selected entity types
      const selectedEntityTypes = Object.keys(selectedBackups).filter(
        entityType => selectedBackups[entityType]
      );

      if (selectedEntityTypes.length === 0) {
        updateStatus('❌ Please select at least one entity type to seed', true);
        setIsLoading(false);
        return;
      }

      // Aggregate results from all entity types
      const results: Array<{
        entityType: string;
        success: boolean;
        counts: { added: number; updated?: number; skipped?: number };
        errors?: string[];
      }> = [];
      const allErrors: string[] = [];

      // Process each selected entity type
      // Note: selectedEntityTypes are already in singular EntityType enum format (e.g., 'task', 'item')
      // because the backup list API returns EntityType enum values
      for (const entityType of selectedEntityTypes) {
        try {
          // Fetch backup data for this entity type
          const backupResponse = await fetch(`/api/backups?entity=${entityType}`);
          const backupResult = await backupResponse.json();

          if (!backupResult.success || !backupResult.data) {
            allErrors.push(`${entityType}: No backup data available`);
            results.push({
              entityType: entityType,
              success: false,
              counts: { added: 0, updated: 0, skipped: 0 },
              errors: ['No backup data available']
            });
            continue;
          }

          // Extract entity records from backup
          // Backup structure: { entityType, data, metadata }
          // data field contains the array of entities (can be direct array or nested)
          const backupData = backupResult.data;
          let records: any[] = [];
          let fullBackupData: any = null; // Store full backup structure for settlements check
          
          if (Array.isArray(backupData.data)) {
            // Direct array format
            records = backupData.data;
            fullBackupData = backupData.data;
          } else if (backupData.data && typeof backupData.data === 'object') {
            // Try nested format: data[entityType] (uses singular enum value)
            fullBackupData = backupData.data;
            if (Array.isArray(backupData.data[entityType])) {
              records = backupData.data[entityType];
            } else {
              // Try to find any array in the data object
              records = Object.values(backupData.data).find(v => Array.isArray(v)) as any[] || [];
            }
          }

          if (!Array.isArray(records) || records.length === 0) {
            allErrors.push(`${entityType}: No records found in backup`);
            results.push({
              entityType: entityType,
              success: false,
              counts: { added: 0, updated: 0, skipped: 0 },
              errors: ['No records found in backup']
            });
            continue;
          }

          // Special handling for sites: import settlements first if they exist in the backup
          if (entityType === 'site' && fullBackupData && typeof fullBackupData === 'object') {
            // Check if backup contains settlements (could be at backupData.data.settlements or backupData.settlements)
            const settlements = fullBackupData.settlements || backupData.settlements;
            if (settlements && Array.isArray(settlements) && settlements.length > 0) {
              console.log(`[SettingsPanel] Found ${settlements.length} settlements in backup, importing first...`);
              
              // Import settlements individually (they're reference data, no workflows)
              let settlementsImported = 0;
              let settlementsSkipped = 0;
              
              for (const settlement of settlements) {
                try {
                  // Check if settlement already exists
                  const existing = await ClientAPI.getSettlementById(settlement.id);
                  
                  if (!existing) {
                    await ClientAPI.upsertSettlement({
                      ...settlement,
                      createdAt: settlement.createdAt ? new Date(settlement.createdAt) : new Date(),
                      updatedAt: settlement.updatedAt ? new Date(settlement.updatedAt) : new Date()
                    });
                    settlementsImported++;
                  } else {
                    settlementsSkipped++;
                  }
                } catch (error) {
                  console.error(`[SettingsPanel] Failed to import settlement ${settlement.id}:`, error);
                }
              }
              
              console.log(`[SettingsPanel] Imported ${settlementsImported} settlements${settlementsSkipped > 0 ? `, skipped ${settlementsSkipped} duplicates` : ''}`);
            }
          }

          // Call unified bulk operation endpoint with merge mode
          const bulkResult = await ClientAPI.bulkOperation({
            entityType: entityType,
            mode: 'merge',
            source: 'backup-seed',
            records
          });

          results.push({
            entityType: entityType,
            success: bulkResult.success,
            counts: bulkResult.counts,
            errors: bulkResult.errors
          });

          if (bulkResult.errors && bulkResult.errors.length > 0) {
            allErrors.push(...bulkResult.errors.map(err => `${entityType}: ${err}`));
          }
        } catch (error) {
          const errorMsg = error instanceof Error ? error.message : 'Unknown error';
          allErrors.push(`${entityType}: ${errorMsg}`);
          results.push({
            entityType: entityType,
            success: false,
            counts: { added: 0, updated: 0, skipped: 0 },
            errors: [errorMsg]
          });
        }
      }

      // Build detailed success message per entity type
      const messages: string[] = [];
      let totalAdded = 0;
      let totalUpdated = 0;
      let totalSkipped = 0;

      for (const result of results) {
        const parts: string[] = [];
        if (result.counts.added > 0) {
          parts.push(`✅ Added ${result.counts.added}`);
          totalAdded += result.counts.added;
        }
        if (result.counts.updated && result.counts.updated > 0) {
          parts.push(`🔄 Updated ${result.counts.updated}`);
          totalUpdated += result.counts.updated || 0;
        }
        if (result.counts.skipped && result.counts.skipped > 0) {
          parts.push(`⏭️ Skipped ${result.counts.skipped}`);
          totalSkipped += result.counts.skipped || 0;
        }

        if (parts.length > 0) {
          messages.push(`${result.entityType}: ${parts.join(', ')}`);
        } else if (result.errors && result.errors.length > 0) {
          messages.push(`${result.entityType}: ❌ ${result.errors[0]}`);
        }
      }

      // Combine summary and errors
      const summaryParts: string[] = [];
      if (totalAdded > 0) summaryParts.push(`Added ${totalAdded}`);
      if (totalUpdated > 0) summaryParts.push(`Updated ${totalUpdated}`);
      if (totalSkipped > 0) summaryParts.push(`Skipped ${totalSkipped}`);

      let finalMessage = '';
      if (summaryParts.length > 0) {
        finalMessage = `✅ Seed completed: ${summaryParts.join(', ')}\n\n${messages.join('\n')}`;
      } else if (allErrors.length > 0) {
        finalMessage = `❌ Seed failed:\n${allErrors.slice(0, 5).join('\n')}${allErrors.length > 5 ? `\n...and ${allErrors.length - 5} more` : ''}`;
      } else {
        finalMessage = '✅ Seed completed (no changes)';
      }

      if (allErrors.length > 0) {
        updateStatus(finalMessage, true);
      } else {
        updateStatus(finalMessage);
      }
    } catch (error) {
      updateStatus(`❌ Failed to seed data: ${error instanceof Error ? error.message : 'Unknown error'}`, true);
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
            
            <Button onClick={handleSeedData} variant="outline" disabled={isLoading}>
              <Sprout className="h-4 w-4 mr-2" />
              Seed Data
            </Button>
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
            
            <Button onClick={handleBackfillLogs} variant="outline" disabled={isLoading}>
              <Database className="h-4 w-4 mr-2" />
              Backfill Logs
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

        <Dialog open={showBackfillModal} onOpenChange={setShowBackfillModal}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <AlertTriangle className="h-5 w-5 text-green-500" />
                Backfill Logs
              </DialogTitle>
              <DialogDescription>
                This will regenerate all logs from existing data to ensure consistency.
              </DialogDescription>
            </DialogHeader>
            <div className="flex items-center space-x-2">
              <Checkbox 
                id="backfill-confirm" 
                checked={backfillConfirmed}
                onCheckedChange={(checked) => setBackfillConfirmed(checked === true)}
              />
              <Label htmlFor="backfill-confirm">
                I understand this will regenerate all logs
              </Label>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowBackfillModal(false)}>
                Cancel
              </Button>
              <Button 
                onClick={handleBackfillLogs} 
                disabled={!backfillConfirmed}
                className="bg-green-600 hover:bg-green-700"
              >
                Backfill Logs
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <Dialog open={showSeedModal} onOpenChange={setShowSeedModal}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Sprout className="h-5 w-5 text-green-500" />
                Seed Data from Backups
              </DialogTitle>
              <DialogDescription>
                Select which entity backups to restore. Only available backups are shown.
              </DialogDescription>
            </DialogHeader>
            
            {availableBackups.length === 0 ? (
              <div className="text-center py-6 text-muted-foreground">
                <Database className="h-12 w-12 mx-auto mb-3 opacity-50" />
                <p>No backups available</p>
                <p className="text-sm">Export some data first to create backups</p>
              </div>
            ) : (
              <div className="space-y-3 max-h-60 overflow-y-auto">
                {availableBackups.map((backup) => (
                  <div key={backup.entityType} className="flex items-center space-x-3 p-3 border rounded-lg">
                    <Checkbox
                      id={`backup-${backup.entityType}`}
                      checked={selectedBackups[backup.entityType] || false}
                      onCheckedChange={(checked) => {
                        setSelectedBackups(prev => ({
                          ...prev,
                          [backup.entityType]: checked as boolean
                        }));
                      }}
                    />
                    <div className="flex-1">
                      <Label htmlFor={`backup-${backup.entityType}`} className="font-medium capitalize">
                        {backup.entityType}
                      </Label>
                      <div className="text-sm text-muted-foreground">
                        {backup.count} items • Last updated: {new Date(backup.lastUpdated).toLocaleDateString()}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
            
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowSeedModal(false)}>
                Cancel
              </Button>
              <Button 
                onClick={handleSeedDataConfirm}
                disabled={availableBackups.length === 0 || Object.values(selectedBackups).every(v => !v)}
              >
                Seed Selected ({Object.values(selectedBackups).filter(Boolean).length})
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
        </CardContent>
      </Card>

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
    </div>
  );
}
