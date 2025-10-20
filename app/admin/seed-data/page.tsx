'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Upload, Download, CheckCircle, FileJson, Database } from 'lucide-react';
import { ClientAPI } from '@/lib/client-api';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';


interface EntityStats {
  entityType: string;
  count: number;
  breakdown: Record<string, number>;
}

export default function SeedDataPage() {
  const [isSeeding, setIsSeeding] = useState(false);
  const [status, setStatus] = useState<string>('');
  const [entityStats, setEntityStats] = useState<EntityStats[]>([]);
  const [selectedEntity, setSelectedEntity] = useState<string>('');
  const [storageMode, setStorageMode] = useState<string>('');
  const [showImportModal, setShowImportModal] = useState(false);
  const [importMode, setImportMode] = useState<'add' | 'merge' | 'replace'>('merge');
  const [pendingImport, setPendingImport] = useState<{ entityType: string; data: any[]; count: number; filename: string } | null>(null);
  const [showExportModal, setShowExportModal] = useState(false);
  const [pendingExport, setPendingExport] = useState<string | null>(null);

  // Load current entity statistics and storage mode
  useEffect(() => {
    loadEntityStats();
    loadStorageMode();
  }, []);

  const loadStorageMode = async () => {
    // In KV-only system, we're always using Vercel KV
    setStorageMode('kv');
  };

  const loadEntityStats = async () => {
    try {
      const stats: EntityStats[] = [];
      
      // Load tasks
      const tasks = await ClientAPI.getTasks();
      const taskBreakdown = tasks.reduce((acc: Record<string, number>, task: any) => {
        const type = task.type || task.taskType || task.category || task.status || 'No Type';
        acc[type] = (acc[type] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);
      stats.push({ entityType: 'tasks', count: tasks.length, breakdown: taskBreakdown });

      // Load items
      const items = await ClientAPI.getItems();
      const itemBreakdown = items.reduce((acc: Record<string, number>, item: any) => {
        const type = item.itemType || item.type || item.category || item.status || 'No Type';
        acc[type] = (acc[type] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);
      stats.push({ entityType: 'items', count: items.length, breakdown: itemBreakdown });

      // Load financials
      const financials = await ClientAPI.getFinancialRecords();
      const financialBreakdown = financials.reduce((acc: Record<string, number>, record: any) => {
        const type = record.type || record.category || record.status || record.accountType || 'No Type';
        acc[type] = (acc[type] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);
      stats.push({ entityType: 'financials', count: financials.length, breakdown: financialBreakdown });

      // Load sites
      const sites = await ClientAPI.getSites();
      const siteBreakdown = sites.reduce((acc: Record<string, number>, site: any) => {
        // Use metadata.type for sites (like PHYSICAL, CLOUD, SPECIAL)
        const type = site.metadata?.type || site.type || site.status || 'No Type';
        acc[type] = (acc[type] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);
      stats.push({ entityType: 'sites', count: sites.length, breakdown: siteBreakdown });

      // Load characters
      const characters = await ClientAPI.getCharacters();
      const characterBreakdown = characters.reduce((acc: Record<string, number>, character: any) => {
        const type = character.role || character.type || character.category || character.status || 'No Role';
        acc[type] = (acc[type] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);
      stats.push({ entityType: 'characters', count: characters.length, breakdown: characterBreakdown });

      // Load players
      const players = await ClientAPI.getPlayers();
      const playerBreakdown = players.reduce((acc: Record<string, number>, player: any) => {
        const type = player.type || player.role || player.category || player.status || 'No Type';
        acc[type] = (acc[type] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);
      stats.push({ entityType: 'players', count: players.length, breakdown: playerBreakdown });

      // Load sales
      const sales = await ClientAPI.getSales();
      const salesBreakdown = sales.reduce((acc: Record<string, number>, sale: any) => {
        const type = sale.status || sale.type || sale.category || sale.saleType || 'No Type';
        acc[type] = (acc[type] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);
      stats.push({ entityType: 'sales', count: sales.length, breakdown: salesBreakdown });

      setEntityStats(stats);
    } catch (error) {
      console.error('Failed to load entity stats:', error);
    }
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>, entityType: string) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      const text = await file.text();
      const data = JSON.parse(text);
      
      // Handle different file formats:
      // 1. Array directly: [item1, item2, ...]
      // 2. Object with entityType key: { items: [...], metadata: {...} }
      // 3. Object with entries key: { entries: [...] }
      let actualData = data;
      let count = 0;
      
      if (Array.isArray(data)) {
        actualData = data;
        count = data.length;
      } else if (data[entityType]) {
        actualData = data[entityType];
        count = actualData.length;
      } else if (data.entries) {
        actualData = data.entries;
        count = actualData.length;
      }

      // Set pending import and show modal
      setPendingImport({ entityType, data: actualData, count, filename: file.name });
      setShowImportModal(true);
      
    } catch (error) {
      setStatus(`❌ Failed to load ${entityType} file`);
      setTimeout(() => setStatus(''), 3000);
    }

    event.target.value = '';
  };

  const handleExportData = async (entityType: string) => {
    // Show confirmation modal first
    setPendingExport(entityType);
    setShowExportModal(true);
  };

  const confirmExportData = async () => {
    if (!pendingExport) return;

    try {
      let data: any[] = [];
      
      if (pendingExport === 'tasks') {
        data = await ClientAPI.getTasks();
      } else if (pendingExport === 'items') {
        data = await ClientAPI.getItems();
      } else if (pendingExport === 'financials') {
        data = await ClientAPI.getFinancialRecords();
      } else if (pendingExport === 'sites') {
        data = await ClientAPI.getSites();
      } else if (pendingExport === 'characters') {
        data = await ClientAPI.getCharacters();
      } else if (pendingExport === 'players') {
        data = await ClientAPI.getPlayers();
      } else if (pendingExport === 'sales') {
        data = await ClientAPI.getSales();
      }

      const exportData = {
        metadata: {
          exportDate: new Date().toISOString(),
          version: '1.0',
          totalEntities: data.length,
          entityType: pendingExport
        },
        [pendingExport]: data
      };

      // 1. Save to backup folder (like Sites export does)
      try {
        await fetch('/api/backup-export', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            dataType: pendingExport,
            data: exportData,
            useFixedFilename: true
          })
        });
        console.log(`✅ Saved to backup/${pendingExport}/${pendingExport}-db.json`);
      } catch (apiError) {
        console.warn('⚠️ Could not save to backup/ folder:', apiError);
      }

      // 2. ALSO trigger browser download (with date for user's Downloads folder)
      const downloadFilename = `${pendingExport}-export-${new Date().toISOString().split('T')[0]}.json`;
      const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = downloadFilename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      // Log the bulk export operation
      await ClientAPI.logBulkExport(pendingExport, {
        count: data.length,
        exportFormat: 'json'
      });

      setStatus(`✅ Exported ${data.length} ${pendingExport} to backup/ folder + Downloads`);
      setTimeout(() => setStatus(''), 3000);
    } catch (error) {
      setStatus(`❌ Export failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
      setTimeout(() => setStatus(''), 3000);
    } finally {
      setShowExportModal(false);
      setPendingExport(null);
    }
  };


  const handleImportData = async () => {
    if (!pendingImport) return;

    setIsSeeding(true);
    setShowImportModal(false);
    
    try {
      const { entityType, data, count, filename } = pendingImport;
      
      // Handle replace mode - clear existing data first
      if (importMode === 'replace') {
        // Get all existing entities and delete them
        let existingData: any[] = [];
        if (entityType === 'tasks') existingData = await ClientAPI.getTasks();
        else if (entityType === 'items') existingData = await ClientAPI.getItems();
        else if (entityType === 'financials') existingData = await ClientAPI.getFinancialRecords();
        else if (entityType === 'sites') existingData = await ClientAPI.getSites();
        else if (entityType === 'characters') existingData = await ClientAPI.getCharacters();
        else if (entityType === 'players') existingData = await ClientAPI.getPlayers();
        else if (entityType === 'sales') existingData = await ClientAPI.getSales();
        
        // Delete existing entities
        for (const entity of existingData) {
          if (entityType === 'tasks') await ClientAPI.deleteTask(entity.id);
          else if (entityType === 'items') await ClientAPI.deleteItem(entity.id);
          else if (entityType === 'financials') await ClientAPI.deleteFinancialRecord(entity.id);
          else if (entityType === 'sites') await ClientAPI.deleteSite(entity.id);
          else if (entityType === 'characters') await ClientAPI.deleteCharacter(entity.id);
          else if (entityType === 'players') await ClientAPI.deletePlayer(entity.id);
          else if (entityType === 'sales') await ClientAPI.deleteSale(entity.id);
        }
      }
      
      // Import the data using ClientAPI - Links creation is handled server-side automatically
      for (const entity of data) {
        if (entityType === 'tasks') {
          await ClientAPI.upsertTask(entity);
        } else if (entityType === 'items') {
          await ClientAPI.upsertItem(entity);
        } else if (entityType === 'financials') {
          await ClientAPI.upsertFinancialRecord(entity);
        } else if (entityType === 'sites') {
          await ClientAPI.upsertSite(entity);
        } else if (entityType === 'characters') {
          await ClientAPI.upsertCharacter(entity);
        } else if (entityType === 'players') {
          await ClientAPI.upsertPlayer(entity);
        } else if (entityType === 'sales') {
          await ClientAPI.upsertSale(entity);
        }
      }

      // Log the bulk import operation
      await ClientAPI.logBulkImport(entityType, {
        count,
        source: filename,
        importMode
      });

      setStatus(`✅ Successfully imported ${count} ${entityType} (${importMode} mode)!`);
      loadEntityStats(); // Refresh stats
    } catch (error) {
      setStatus(`❌ Import failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setIsSeeding(false);
      setPendingImport(null);
    }
  };

  const entityTypes = [
    { key: 'tasks', label: 'Tasks', icon: '📋' },
    { key: 'items', label: 'Items', icon: '📦' },
    { key: 'financials', label: 'Financial Records', icon: '💰' },
    { key: 'sites', label: 'Sites', icon: '📍' },
    { key: 'characters', label: 'Characters', icon: '👤' },
    { key: 'players', label: 'Players', icon: '🎮' },
    { key: 'sales', label: 'Sales', icon: '🛒' },
  ];

  return (
    <div className="container mx-auto px-6 space-y-6">


      {/* Status Message */}
      {status && (
        <Card className={
          status.includes('✅') ? 'border-green-500 bg-green-50 dark:bg-green-950' :
          status.includes('❌') ? 'border-red-500 bg-red-50 dark:bg-red-950' :
          'border-yellow-500 bg-yellow-50 dark:bg-yellow-950'
        }>
          <CardContent className="py-4">
            <p className="text-sm font-medium">{status}</p>
          </CardContent>
        </Card>
      )}

      {/* Current Data Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Database className="h-5 w-5" />
            Current Database
          </CardTitle>
          <CardDescription>
            Click on an entity to see detailed breakdown
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {entityTypes.map(({ key, label, icon }) => {
              const stats = entityStats.find(s => s.entityType === key);
              const isSelected = selectedEntity === key;
              
              return (
                <div 
                  key={key} 
                  className={`border rounded-lg p-4 cursor-pointer transition-colors ${
                    isSelected ? 'bg-primary/10 border-primary' : 'hover:bg-accent'
                  }`}
                  onClick={() => setSelectedEntity(isSelected ? '' : key)}
                >
                  <div className="flex items-center gap-3 mb-3">
                    <span className="text-2xl">{icon}</span>
                    <div>
                      <h3 className="font-medium text-sm">{label}</h3>
                      <p className="text-xs text-muted-foreground">
                        Total: {stats?.count || 0}
                      </p>
                    </div>
                  </div>
                  
                  
                  <div className="flex gap-2">
                    <label className="cursor-pointer flex-1">
                      <input
                        type="file"
                        accept=".json"
                        className="hidden"
                        onChange={(e) => handleFileUpload(e, key)}
                      />
                      <div className="flex items-center justify-center gap-2 px-3 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-colors text-sm">
                        <Upload className="h-4 w-4" />
                        Upload
                      </div>
                    </label>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleExportData(key);
                      }}
                      className="flex-1"
                    >
                      <Download className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>


      {/* Entity System Data - Detailed view of selected entity */}
      {selectedEntity && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Database className="h-5 w-5" />
              Entity System Data
            </CardTitle>
            <CardDescription>
              Detailed breakdown of {selectedEntity} data stored in {storageMode === 'local' ? 'localStorage' : storageMode === 'kv' ? 'Vercel KV Database' : `Unknown (${storageMode || 'undefined'})`}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {(() => {
              const stats = entityStats.find(s => s.entityType === selectedEntity);
              const entityType = entityTypes.find(e => e.key === selectedEntity);
              
              if (!stats || !entityType) return null;
              
              return (
                <div className="space-y-4">
                  <div className="flex items-center gap-3 p-4 bg-accent rounded-lg">
                    <span className="text-3xl">{entityType.icon}</span>
                    <div>
                      <h3 className="text-lg font-semibold">{entityType.label}</h3>
                      <p className="text-sm text-muted-foreground">
                        Total: {stats.count} entities
                      </p>
                    </div>
                  </div>
                  
                  {Object.keys(stats.breakdown).length > 0 ? (
                    <div className="space-y-2">
                      {Object.entries(stats.breakdown).map(([type, count]) => (
                        <div key={type} className="flex justify-between items-center text-sm">
                          <span className="font-medium">{type}:</span>
                          <span className="text-muted-foreground">{count}</span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-8 text-muted-foreground">
                      No detailed breakdown available for {entityType.label}
                    </div>
                  )}
                  
                  <div className="pt-4 border-t">
                    <p className="text-sm text-muted-foreground">
                      Data location: {storageMode === 'local' ? 'Browser localStorage (Development)' : storageMode === 'kv' ? 'Vercel KV Database (Production)' : `Unknown (${storageMode || 'undefined'})`}
                    </p>
                  </div>
                </div>
              );
            })()}
          </CardContent>
        </Card>
      )}

      {/* Import Modal */}
      <Dialog open={showImportModal} onOpenChange={setShowImportModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Import {pendingImport?.entityType}</DialogTitle>
            <DialogDescription>
              Import {pendingImport?.count} {pendingImport?.entityType} from {pendingImport?.filename}
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium">Import Mode</label>
              <Select value={importMode} onValueChange={(value: 'add' | 'merge' | 'replace') => setImportMode(value)}>
                <SelectTrigger className="mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="add">Add Only - Skip existing items</SelectItem>
                  <SelectItem value="merge">Merge - Update existing, add new</SelectItem>
                  <SelectItem value="replace">Replace - Clear all existing and import new</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div className="p-3 bg-accent rounded-lg">
              <div className="flex items-center gap-2 text-sm">
                <FileJson className="h-4 w-4" />
                <span className="font-medium">{pendingImport?.count} entries</span>
                <span className="text-muted-foreground">•</span>
                <span className="text-muted-foreground">{pendingImport?.filename}</span>
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setShowImportModal(false);
                setPendingImport(null);
              }}
            >
              Cancel
            </Button>
            <Button
              onClick={handleImportData}
              disabled={isSeeding}
              className="bg-green-600 hover:bg-green-700 text-white"
            >
              {isSeeding ? (
                <>
                  <span className="animate-spin mr-2">⏳</span>
                  Importing...
                </>
              ) : (
                `Import ${pendingImport?.entityType} (${importMode})`
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Export Confirmation Modal */}
      <Dialog open={showExportModal} onOpenChange={setShowExportModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Export {pendingExport}</DialogTitle>
            <DialogDescription>
              This will export all {pendingExport} data to both the backup folder and your Downloads.
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            <div className="p-3 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg">
              <div className="flex items-start gap-2">
                <span className="text-yellow-600 dark:text-yellow-400 text-sm">⚠️</span>
                <div className="text-sm text-yellow-800 dark:text-yellow-200">
                  <p className="font-medium">Backup folder will be overwritten</p>
                  <p className="mt-1">This will replace the existing backup/{pendingExport}/{pendingExport}-db.json file.</p>
                </div>
              </div>
            </div>
            
            <div className="p-3 bg-accent rounded-lg">
              <div className="flex items-center gap-2 text-sm">
                <Download className="h-4 w-4" />
                <span className="font-medium">Export destinations:</span>
              </div>
              <div className="mt-2 text-sm text-muted-foreground space-y-1">
                <div>• backup/{pendingExport}/{pendingExport}-db.json</div>
                <div>• Downloads folder (with date)</div>
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setShowExportModal(false);
                setPendingExport(null);
              }}
            >
              Cancel
            </Button>
            <Button
              onClick={confirmExportData}
              className="bg-blue-600 hover:bg-blue-700 text-white"
            >
              Export {pendingExport}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

    </div>
  );
}

