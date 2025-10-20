'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Download, Upload, FileText } from 'lucide-react';
import { CSVImport } from './csv-import';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { ClientAPI } from '@/lib/client-api';
import { ItemType, ItemStatus } from '@/types/enums';
import { calculateTotalQuantity } from '@/lib/utils/business-utils';

export default function ItemsImportExport() {
  const [isImportOpen, setIsImportOpen] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [lastOperation, setLastOperation] = useState<{
    success: boolean;
    message: string;
    count?: number;
  } | null>(null);
  const [summary, setSummary] = useState({
    total: 0,
    byType: {} as Record<ItemType, number>,
    byStatus: {} as Record<string, number>,
  });

  const getItemsSummary = async () => {
    const items = await ClientAPI.getItems();
    const byType = {} as Record<ItemType, number>;
    const byStatus = {} as Record<string, number>;
    
    Object.values(ItemType).forEach(type => {
      byType[type] = items.filter(item => item.type === type).length;
    });
    
    items.forEach(item => {
      byStatus[item.status] = (byStatus[item.status] || 0) + 1;
    });

    return {
      total: items.length,
      byType,
      byStatus,
    };
  };

  // Update summary on mount and when items change
  useEffect(() => {
    const loadSummary = async () => {
      const summaryData = await getItemsSummary();
      setSummary(summaryData);
    };
    loadSummary();
    
    // Listen for item updates
    const handleItemsUpdate = async () => {
      const summaryData = await getItemsSummary();
      setSummary(summaryData);
    };
    
    window.addEventListener('itemsUpdated', handleItemsUpdate);
    return () => window.removeEventListener('itemsUpdated', handleItemsUpdate);
  }, []);

  const handleExport = async () => {
    setIsExporting(true);
    setLastOperation(null);

    try {
      const items = await ClientAPI.getItems();
      const csvContent = convertItemsToCSV(items);
      downloadCSV(csvContent, 'inventory-export.csv');
      
      setLastOperation({
        success: true,
        message: `Exported ${items.length} items successfully`,
        count: items.length
      });
    } catch (error) {
      setLastOperation({
        success: false,
        message: `Export failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      });
    } finally {
      setIsExporting(false);
    }
  };

  const handleImportComplete = () => {
    setIsImportOpen(false);
    setLastOperation({
      success: true,
      message: 'Items imported successfully'
    });
    window.dispatchEvent(new Event('itemsUpdated'));
  };

  const handleImportStart = () => {
    window.dispatchEvent(new CustomEvent('importStarted'));
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FileText className="h-5 w-5" />
          Items Import/Export
        </CardTitle>
        <CardDescription>
          Import inventory items from CSV files or export them for backup and sharing.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Items Summary */}
        <div className="space-y-2">
          <h4 className="text-sm font-medium">Current Items:</h4>
          <div className="grid grid-cols-2 gap-2 text-xs">
            <div className="flex justify-between">
              <span>Total:</span>
              <Badge variant="outline">{summary.total}</Badge>
            </div>
            {Object.entries(summary.byType).slice(0, 6).map(([type, count]) => (
              <div key={type} className="flex justify-between">
                <span>{type}:</span>
                <Badge variant="outline">{count}</Badge>
              </div>
            ))}
          </div>
        </div>

        {/* Action Buttons */}
        <div className="space-y-2">
          <Button 
            onClick={handleExport}
            disabled={isExporting || summary.total === 0}
            className="w-full"
            variant="outline"
          >
            <Download className="h-4 w-4 mr-2" />
            {isExporting ? 'Exporting...' : 'Export Items (CSV)'}
          </Button>
          
          <Dialog open={isImportOpen} onOpenChange={setIsImportOpen}>
            <DialogTrigger asChild>
              <Button 
                className="w-full"
                variant="outline"
              >
                <Upload className="h-4 w-4 mr-2" />
                Import Items (CSV)
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Import Items from CSV</DialogTitle>
              </DialogHeader>
              <CSVImport 
                onImportComplete={handleImportComplete}
                onImportStart={handleImportStart}
              />
            </DialogContent>
          </Dialog>
        </div>

        {/* Last Operation Result */}
        {lastOperation && (
          <div className={`p-3 rounded-md text-sm ${
            lastOperation.success 
              ? 'bg-green-50 text-green-800 border border-green-200' 
              : 'bg-red-50 text-red-800 border border-red-200'
          }`}>
            <div className="font-medium">
              {lastOperation.success ? '✅ Success' : '❌ Error'}
            </div>
            <div className="text-xs mt-1">
              {lastOperation.message}
            </div>
            {lastOperation.count !== undefined && lastOperation.count > 0 && (
              <div className="text-xs mt-1 font-medium">
                Items processed: {lastOperation.count}
              </div>
            )}
          </div>
        )}
        
        <div className="text-xs text-muted-foreground bg-muted/50 p-3 rounded-md">
          <div className="font-medium mb-2">CSV Format:</div>
          <div className="space-y-1">
            <div className="break-all">
              <code className="text-xs">ItemType,SubItemType,Name,TotalQuantity,Site,Status,Collection,UnitCost,AdditionalCost,Price,Value,QuantitySold,TargetAmount,SoldThisMonth,LastRestockDate,SourceTaskId,Year,ImageUrl,OriginalFiles,AccessoryFiles,Width,Height,Size</code>
            </div>
            <div className="mt-2">
              <strong>Note:</strong> Items without a Site field will be imported as ideation items (no stock location).
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// Helper functions for CSV export (same as in inventories page)
function convertItemsToCSV(items: any[]): string {
  const headers = [
    'ItemType', 'SubItemType', 'Name', 'TotalQuantity', 'Site', 'Status', 
    'Collection', 'UnitCost', 'AdditionalCost', 'Price', 'Value', 'QuantitySold', 'TargetAmount',
    'SoldThisMonth', 'LastRestockDate', 'SourceTaskId', 'Year', 'ImageUrl', 
    'OriginalFiles', 'AccessoryFiles', 'Width', 'Height', 'Size'
  ];
  
  const csvRows = [headers.join(',')];
  
  items.forEach(item => {
    // Calculate total quantity across all stock points using the proper utility function
    const totalQuantity = calculateTotalQuantity(item.stock || []);
    
    // Use first site (like import does)
    const firstStock = item.stock?.[0];
    const site = firstStock?.siteId || 'Home';
    
    // Helper function to properly escape CSV fields
    const escapeCSVField = (field: any): string => {
      if (field === null || field === undefined) return '';
      const stringField = String(field);
      // If field contains comma, quote, or newline, wrap in quotes and escape internal quotes
      if (stringField.includes(',') || stringField.includes('"') || stringField.includes('\n')) {
        return `"${stringField.replace(/"/g, '""')}"`;
      }
      return stringField;
    };

    // Create one row per item (like import expects)
    const row = [
      escapeCSVField(item.type),
      escapeCSVField(item.subItemType || ''),
      escapeCSVField(item.name),
      escapeCSVField(totalQuantity),
      escapeCSVField(site),
      escapeCSVField(item.status),
      escapeCSVField(item.collection || 'No Collection'),
      escapeCSVField(item.unitCost || 0),
      escapeCSVField(item.additionalCost || 0),
      escapeCSVField(item.price || 0),
      escapeCSVField(item.value || 0),
      escapeCSVField(item.quantitySold || 0),
      escapeCSVField(item.targetAmount || ''),
      escapeCSVField(item.soldThisMonth || ''),
      escapeCSVField(item.lastRestockDate ? item.lastRestockDate.toISOString().split('T')[0] : ''),
      escapeCSVField(item.sourceTaskId || ''),
      escapeCSVField(item.year || ''),
      escapeCSVField(item.imageUrl || ''),
      escapeCSVField(Array.isArray(item.originalFiles) ? item.originalFiles.map((f: any) => f.name || f).join(';') : ''),
      escapeCSVField(Array.isArray(item.accessoryFiles) ? item.accessoryFiles.map((f: any) => f.name || f).join(';') : ''),
      escapeCSVField(item.dimensions?.width || ''),
      escapeCSVField(item.dimensions?.height || ''),
      escapeCSVField(item.size || '')
    ];
    csvRows.push(row.join(','));
  });
  
  return csvRows.join('\n');
}

function downloadCSV(content: string, filename: string) {
  const blob = new Blob([content], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);
  link.setAttribute('href', url);
  link.setAttribute('download', filename);
  link.style.visibility = 'hidden';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

