'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Upload, Download, CheckCircle, FileJson, Database } from 'lucide-react';
import { ClientAPI } from '@/lib/client-api';
import { pluralToEntityType } from '@/lib/utils/entity-type-utils';
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
  const [showImportModal, setShowImportModal] = useState(false);
  const [importMode, setImportMode] = useState<'add' | 'merge' | 'replace'>('merge');
  const [pendingImport, setPendingImport] = useState<{ entityType: string; data: any[]; count: number; filename: string; fullParsedData?: any } | null>(null);
  const [showExportModal, setShowExportModal] = useState(false);
  const [pendingExport, setPendingExport] = useState<string | null>(null);

  // Load current entity statistics and storage mode
  useEffect(() => {
    loadEntityStats();
  }, []);


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
      // Store full parsed data to allow access to settlements when importing sites
      setPendingImport({ entityType, data: actualData, count, filename: file.name, fullParsedData: data });
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

      // 1. Save to backup KV key
      try {
        await fetch('/api/backups', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            entityType: pendingExport,
            data: exportData
          })
        });
        console.log(`✅ Saved backup for ${pendingExport} to KV`);
      } catch (apiError) {
        console.warn('⚠️ Could not save to backup KV:', apiError);
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

      setStatus(`✅ Exported ${data.length} ${pendingExport} entities and saved backup`);
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
    if (!pendingImport || isSeeding) return;

    setIsSeeding(true);
    setShowImportModal(false);
    setStatus('⏳ Importing... Please wait.');
    
    try {
      const { entityType, data, count, filename, fullParsedData } = pendingImport;
      
      // Special handling for sites: import settlements first if they exist in the backup file
      if (entityType === 'sites' && fullParsedData) {
        // If the backup file contains settlements, import them first
        if (fullParsedData.settlements && Array.isArray(fullParsedData.settlements) && fullParsedData.settlements.length > 0) {
          setStatus(`⏳ Importing ${fullParsedData.settlements.length} settlements first...`);
          
          // Import settlements individually (they're reference data, no workflows)
          let settlementsImported = 0;
          let settlementsSkipped = 0;
          const settlementErrors: string[] = [];
          
          for (const settlement of fullParsedData.settlements) {
            try {
              // Check if settlement already exists
              const existing = await ClientAPI.getSettlementById(settlement.id);
              
              if (!existing || importMode !== 'add') {
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
              const errorMsg = `Settlement ${settlement.id || settlement.name || 'unknown'}: ${error instanceof Error ? error.message : 'Unknown error'}`;
              console.error(`Failed to import settlement:`, errorMsg);
              settlementErrors.push(errorMsg);
            }
          }
          
          const settlementStatus = `⏳ Imported ${settlementsImported} settlements${settlementsSkipped > 0 ? `, skipped ${settlementsSkipped} duplicates` : ''}${settlementErrors.length > 0 ? `, ${settlementErrors.length} errors` : ''}. Now importing sites...`;
          setStatus(settlementStatus);
          
          // Log settlement import errors if any
          if (settlementErrors.length > 0) {
            console.warn('Settlement import errors:', settlementErrors);
          }
        }
      }
      
      // Convert plural UI form to EntityType enum value (uses EntityType enum as source of truth)
      const entityTypeEnum = pluralToEntityType(entityType);
      
      // Map import mode to bulk operation mode
      const mode = importMode === 'add' ? 'add-only' : importMode === 'merge' ? 'merge' : 'replace';
      
      // Use unified bulk operation endpoint
      const result = await ClientAPI.bulkOperation({
        entityType: entityTypeEnum,
        mode,
        source: filename || 'seed-ui',
        records: data
      });

      // Build detailed success message
      const messages: string[] = [];
      if (result.counts.added > 0) {
        messages.push(`✅ Added ${result.counts.added} new record${result.counts.added !== 1 ? 's' : ''}`);
      }
      if (result.counts.updated && result.counts.updated > 0) {
        messages.push(`🔄 Updated ${result.counts.updated} existing record${result.counts.updated !== 1 ? 's' : ''}`);
      }
      if (result.counts.skipped && result.counts.skipped > 0) {
        messages.push(`⏭️ Skipped ${result.counts.skipped} duplicate${result.counts.skipped !== 1 ? 's' : ''}`);
      }

      if (result.errors && result.errors.length > 0) {
        messages.push(`⚠️ ${result.errors.length} error${result.errors.length !== 1 ? 's' : ''} occurred`);
        setStatus(`${messages.join(', ')}\n\nErrors:\n${result.errors.slice(0, 5).join('\n')}${result.errors.length > 5 ? `\n...and ${result.errors.length - 5} more` : ''}`);
      } else {
        setStatus(messages.length > 0 ? messages.join(', ') : '✅ Import completed');
      }

      // Refresh stats after successful import
      await loadEntityStats();
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
      {/* Status Message - Always visible at top */}
      {(status || isSeeding) && (
        <Card className={
          status?.includes('✅') ? 'border-green-500 bg-green-50 dark:bg-green-950' :
          status?.includes('❌') ? 'border-red-500 bg-red-50 dark:bg-red-950' :
          status?.includes('⏳') || isSeeding ? 'border-blue-500 bg-blue-50 dark:bg-blue-950' :
          'border-yellow-500 bg-yellow-50 dark:bg-yellow-950'
        }>
          <CardContent className="py-4">
            <div className="flex items-center gap-3">
              {isSeeding && (
                <span className="animate-spin text-lg">⏳</span>
              )}
              <p className="text-sm font-medium whitespace-pre-line">
                {status || '⏳ Importing... Please wait.'}
              </p>
            </div>
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
                    <label className={`cursor-pointer flex-1 ${isSeeding ? 'pointer-events-none opacity-50' : ''}`}>
                      <input
                        type="file"
                        accept=".json"
                        className="hidden"
                        onChange={(e) => handleFileUpload(e, key)}
                        disabled={isSeeding}
                      />
                      <div className={`flex items-center justify-center gap-2 px-3 py-2 bg-primary text-primary-foreground rounded-md transition-colors text-sm ${
                        isSeeding ? 'opacity-50 cursor-not-allowed' : 'hover:bg-primary/90 cursor-pointer'
                      }`}>
                        {isSeeding ? (
                          <>
                            <span className="animate-spin">⏳</span>
                            Loading...
                          </>
                        ) : (
                          <>
                            <Upload className="h-4 w-4" />
                            Upload
                          </>
                        )}
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
                      disabled={isSeeding}
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
              Detailed breakdown of {selectedEntity} data stored in Vercel KV Database
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
                      Data location: Vercel KV Database (Production)
                    </p>
                  </div>
                </div>
              );
            })()}
          </CardContent>
        </Card>
      )}

      {/* Import Modal */}
      <Dialog open={showImportModal} onOpenChange={(open) => {
        if (!isSeeding) {
          setShowImportModal(open);
          if (!open) {
            setPendingImport(null);
          }
        }
      }}>
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
              <Select 
                value={importMode} 
                onValueChange={(value: 'add' | 'merge' | 'replace') => setImportMode(value)}
                disabled={isSeeding}
              >
                <SelectTrigger className="mt-1" disabled={isSeeding}>
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
                if (!isSeeding) {
                  setShowImportModal(false);
                  setPendingImport(null);
                }
              }}
              disabled={isSeeding}
            >
              Cancel
            </Button>
            <Button
              onClick={handleImportData}
              disabled={isSeeding}
              className="bg-green-600 hover:bg-green-700 text-white disabled:opacity-50 disabled:cursor-not-allowed"
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

