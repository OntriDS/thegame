'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useThemeColors } from '@/lib/hooks/use-theme-colors';
import { ClientAPI } from '@/lib/client-api';
import { Item, Site } from '@/types/entities';
import { ItemType, ItemStatus, Collection, SiteType, PhysicalBusinessType } from '@/types/enums';
import { getSubTypesForItemType } from '@/lib/utils/item-utils';
import type { Station, Area, SubItemType } from '@/types/type-aliases';
import { CM_TO_M2_CONVERSION } from '@/lib/constants/app-constants';
import { FileReference } from '@/types/entities';
import { calculateTotalQuantity } from '@/lib/utils/business-utils';
import { getAllStations } from '@/lib/utils/business-structure-utils';
import { getSiteByName } from '@/lib/utils/site-options-utils';

type ImportMode = 'replace' | 'merge' | 'add-only';

interface CSVImportProps {
  onImportComplete?: () => void;
  onImportStart?: () => void;
}

export function CSVImport({ onImportComplete, onImportStart }: CSVImportProps) {
  const { activeBg } = useThemeColors();
  const [csvData, setCsvData] = useState<string>('');
  const [importMode, setImportMode] = useState<ImportMode>('add-only');
  const [isImporting, setIsImporting] = useState(false);
  const [importResult, setImportResult] = useState<{ success: number; errors: string[] } | null>(null);
  const [sites, setSites] = useState<Site[]>([]);

  // Load sites when component mounts
  useEffect(() => {
    const loadSites = async () => {
      try {
        const allSites = await ClientAPI.getSites();
        setSites(allSites);
      } catch (error) {
        console.error('Failed to load sites:', error);
      }
    };
    loadSites();
  }, []);

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target?.result as string;
      setCsvData(text);
    };
    reader.readAsText(file);
  };

  const parseCSV = (csvText: string): any[] => {
    const lines = csvText.trim().split('\n');
    const headers = lines[0].split(',').map(h => h.trim());
    const data = [];

    for (let i = 1; i < lines.length; i++) {
      const line = lines[i];
      const values: string[] = [];
      let current = '';
      let inQuotes = false;
      
      for (let j = 0; j < line.length; j++) {
        const char = line[j];
        
        if (char === '"') {
          inQuotes = !inQuotes;
        } else if (char === ',' && !inQuotes) {
          values.push(current.trim());
          current = '';
        } else {
          current += char;
        }
      }
      values.push(current.trim()); // Add the last value
      
      const row: any = {};
      headers.forEach((header, index) => {
        let value = values[index] || '';
        // Remove surrounding quotes if present
        if (value.startsWith('"') && value.endsWith('"')) {
          value = value.slice(1, -1);
        }
        row[header] = value;
      });
      
      data.push(row);
    }

    return data;
  };

        // Validate that a subtype is valid for a given item type
      const isValidSubItemType = (itemType: ItemType, subType: string): boolean => {
        // Get valid subtypes from enums (this ensures consistency when enums change)
        const validSubtypes = getSubTypesForItemType(itemType);
        
        // Type assertion to handle the string to SubItemType conversion
        const isValid = validSubtypes.includes(subType as SubItemType);
        
        return isValid;
      };

      // Validate that a station is valid
      const isValidStation = (station: string): boolean => {
        const validStations = getAllStations();
        return validStations.includes(station as Station);
      };

  const convertToItems = async (csvData: any[]): Promise<(Item | null)[]> => {
    const items = await Promise.all(csvData.map(async (row, index) => {
      // Parse dimensions if they exist
      const width = parseFloat(row.Width || row.width || '0');
      const height = parseFloat(row.Height || row.height || '0');
      const area = width > 0 && height > 0 ? (width * height) / CM_TO_M2_CONVERSION : 0; // Convert cm² to m²

      // Parse size field
      const size = row.Size || row.size || undefined;

                           // Parse quantities - allow 0 for items that exist but aren't in stock
        const quantity = parseInt(row.TotalQuantity || row.totalQuantity || row.Quantity || row.quantity || '0'); // Default to 0 if no quantity specified

       // Parse financial values with better locale handling
       const parsePrice = (value: string): number => {
         if (!value || value.trim() === '') return 0;
         // Handle comma as decimal separator (European format)
         const cleanValue = value.replace(',', '.');
         return parseFloat(cleanValue) || 0;
       };
       
       const unitCost = parsePrice(row.UnitCost || '0');
       const additionalCost = parsePrice(row.AdditionalCost || '0');
       const price = parsePrice(row.Price || '0');
       const value = parsePrice(row.Value || '0');
       const quantitySold = parseInt(row.QuantitySold || row.quantitySold || '0');
       const targetAmount = row.TargetAmount ? parseInt(row.TargetAmount) : undefined;
       const soldThisMonth = row.SoldThisMonth ? parseInt(row.SoldThisMonth) : undefined;
       const lastRestockDate = row.LastRestockDate ? new Date(row.LastRestockDate) : undefined;
       const sourceTaskId = row.SourceTaskId || null;
       
                            // Parse site from CSV - simple and clean approach
          let stock: { siteId: string; quantity: number }[] = [];
         
                   // Get site from Site field (correct field name)
          const siteName = row.Site || row.site || row.Locations || row.locations || row.Location || row.location || '';
        
        if (siteName && siteName.trim() !== '') {
          // Find matching site using proper site validation
          let matchingSite = getSiteByName(sites, siteName);
          
          if (!matchingSite) {
            // Site doesn't exist - create it
            console.log(`Creating new site: "${siteName}"`);
            const newSite: Site = {
              id: `site-${siteName.toLowerCase().replace(/[^a-z0-9]/g, '-')}`,
              name: siteName,
              description: `Site created from CSV import`,
              createdAt: new Date(),
              updatedAt: new Date(),
              links: [],
              metadata: {
                type: SiteType.PHYSICAL, // Default to physical site
                isActive: true,
                businessType: PhysicalBusinessType.STORAGE,
                settlementId: 'default-settlement', // Default settlement
                googleMapsAddress: 'TBD'
              },
              isActive: true,
              status: 'ACTIVE'
            };
            
            try {
              // Create the site via API
              const createdSite = await ClientAPI.upsertSite(newSite);
              matchingSite = createdSite;
              // Add to local sites array
              setSites(prev => [...prev, createdSite]);
              console.log(`Successfully created site: "${siteName}"`);
            } catch (error) {
              console.error(`Failed to create site "${siteName}":`, error);
              // Fallback: use the site name as ID for now
              matchingSite = { ...newSite, id: siteName };
            }
          }
          
          stock = [{ siteId: matchingSite.id, quantity: quantity }];
        } else {
          // No site specified - create item without stock (for ideation items)
          stock = [];
        }
      
      // Stock is already properly set above based on site validation

      // Determine item type from CSV or use selected type
      const itemTypeFromCSV = row.ItemType || row.itemType || ItemType.DIGITAL;
      
      // Validate that the item type exists in our enums
      if (!Object.values(ItemType).includes(itemTypeFromCSV as ItemType)) {
        console.error(`Invalid item type in CSV: "${itemTypeFromCSV}" at row ${index + 1}`);
        console.error(`Valid types are:`, Object.values(ItemType));
        throw new Error(`Invalid item type: "${itemTypeFromCSV}" at row ${index + 1}. Valid types are: ${Object.values(ItemType).join(', ')}`);
      }
      
      const finalItemType = itemTypeFromCSV as ItemType;

      // Handle collection - if empty, set to "No Collection"
      const collection = row.Collection || row.collection;
      const finalCollection = collection && collection.trim() !== '' ? collection : 'No Collection';

      // Determine status - Digital Art defaults to "Idle", others to "For Sale"
      const status = row.Status || row.status;
      const finalStatus = status || (finalItemType === ItemType.DIGITAL ? ItemStatus.IDLE : ItemStatus.FOR_SALE);

      // Parse file attachments
      const parseFileReferences = (field: string): FileReference[] => {
        if (!field || field.trim() === '') return [];
        
        return field.split(';').map(fileRef => {
          const parts = fileRef.split(':');
          if (parts.length >= 2) {
            return {
              url: parts[0] === 'symbolic' ? undefined : parts[0],
              type: parts[1]
            };
          }
          return { type: fileRef.trim() }; // Fallback for simple types
        });
      };

      const originalFiles = parseFileReferences(row.OriginalFiles || row.originalFiles);
      const accessoryFiles = parseFileReferences(row.AccessoryFiles || row.accessoryFiles);

      return {
        id: `imported-${Date.now()}-${index}`,
        name: row.Name || row.name || `Imported ${finalItemType} ${index + 1}`,
        type: finalItemType,
        collection: finalCollection,
        status: finalStatus,
        station: (row.Station || row.station || 'Strategy') as Station,
        area: 'ADMIN' as Area, // Default area for imported items
        stock,
        dimensions: width > 0 || height > 0 ? { width, height, area } : undefined,
        size,
        unitCost,
        additionalCost,
        price,
        value,
        quantitySold,
        targetAmount,
        soldThisMonth,
        lastRestockDate,
        year: parseInt(row.Year || row.year) || new Date().getFullYear(),
        subItemType: (row.SubItemType || row.subItemType) as SubItemType | undefined,
        imageUrl: row.ImageUrl || undefined,
        originalFiles: originalFiles.length > 0 ? originalFiles : undefined,
        accessoryFiles: accessoryFiles.length > 0 ? accessoryFiles : undefined,
        sourceTaskId,
        createdAt: new Date(),
        updatedAt: new Date(),
        isCollected: false,
        links: [] // ✅ Initialize links array (The Rosetta Stone)
      };
    }));
    
    return items;
  };

  const handleImport = async () => {
    if (!csvData.trim()) return;

    // Signal import start - this prevents status modals from interfering with import
    onImportStart?.();
    
    setIsImporting(true);
    setImportResult(null);

    try {
      const parsedData = parseCSV(csvData);
      const itemsWithNulls = await convertToItems(parsedData);
      const items = itemsWithNulls.filter((item): item is Item => item !== null);
      
      // Validate items before import
      const validationErrors: string[] = [];
      
      items.forEach((item, index) => {
        if (!item.name || item.name.trim() === '') {
          validationErrors.push(`Row ${index + 1}: Missing name`);
        }
        if (!item.type || !Object.values(ItemType).includes(item.type)) {
          validationErrors.push(`Row ${index + 1}: Missing or invalid type "${item.type}"`);
        }
        // Allow items without stock (ideation - only validate if stock exists
        if (item.stock && item.stock.length > 0) {
          item.stock.forEach((stockPoint, stockIndex) => {
            // Note: Sites will be created automatically if they don't exist, so no validation needed
            if (stockPoint.quantity < 0) {
              validationErrors.push(`Row ${index + 1}, Stock ${stockIndex + 1}: Quantity cannot be negative`);
            }
            // Note: quantity 0 is now valid (items that exist but aren't in stock)
          });
        }
        if (item.status && !Object.values(ItemStatus).includes(item.status)) {
          validationErrors.push(`Row ${index + 1}: Invalid status "${item.status}". Valid statuses are: ${Object.values(ItemStatus).join(', ')}`);
        }
        if (item.collection && !Object.values(Collection).includes(item.collection)) {
          validationErrors.push(`Row ${index + 1}: Invalid collection "${item.collection}"`);
        }
                 if (item.subItemType && !isValidSubItemType(item.type, item.subItemType)) {
           const validSubtypes = getSubTypesForItemType(item.type);
           validationErrors.push(`Row ${index + 1}: Invalid subtype "${item.subItemType}" for type "${item.type}". Valid subtypes are: ${validSubtypes.join(', ')}`);
         }
      });
      
      if (validationErrors.length > 0) {
        setImportResult({
          success: 0,
          errors: validationErrors
        });
        return;
      }
      
      // Handle different import modes
      let success = false;
      let importedCount = 0;
      
      try {
        switch (importMode) {
          case 'replace':
            success = await ClientAPI.bulkImportItems(items);
            importedCount = items.length;
            break;
            
          case 'merge':
            success = await ClientAPI.bulkMergeItems(items);
            importedCount = items.length;
            break;
            
          case 'add-only':
            const result = await ClientAPI.bulkAddItemsOnly(items);
            success = result.success;
            importedCount = result.addedCount;
            break;
        }
        
        if (success) {
          setImportResult({
            success: importedCount,
            errors: []
          });
          setCsvData('');
          
          // Ensure the UI refreshes by adding a small delay
          setTimeout(() => {
            onImportComplete?.();
          }, 100);
        } else {
          setImportResult({
            success: 0,
            errors: ['Import operation failed - check console for details']
          });
        }
      } catch (operationError) {
        setImportResult({
          success: 0,
          errors: [`Import operation failed: ${operationError instanceof Error ? operationError.message : 'Unknown error'}`]
        });
      }
    } catch (error) {
      setImportResult({
        success: 0,
        errors: [error instanceof Error ? error.message : 'Unknown error']
      });
    } finally {
      setIsImporting(false);
    }
  };

    const getCSVTemplate = () => {
    // Get valid subtypes from enums to ensure template examples are always current
    const digitalSubtypes = getSubTypesForItemType(ItemType.DIGITAL);
    const artworkSubtypes = getSubTypesForItemType(ItemType.ARTWORK);
    const printSubtypes = getSubTypesForItemType(ItemType.PRINT);
    const stickerSubtypes = getSubTypesForItemType(ItemType.STICKER);
    const bundleSubtypes = getSubTypesForItemType(ItemType.BUNDLE);
    const merchSubtypes = getSubTypesForItemType(ItemType.MERCH);
    const materialSubtypes = getSubTypesForItemType(ItemType.MATERIAL);
    const equipmentSubtypes = getSubTypesForItemType(ItemType.EQUIPMENT);
    
    // Get valid collections from enums to ensure template examples are always current
    const collections = Object.values(Collection);
    
            const template = `ItemType,SubItemType,Name,TotalQuantity,Site,Status,Collection,UnitCost,Price,Year,ImageUrl,OriginalFiles,AccessoryFiles,Width,Height,Size
    "Digital","${digitalSubtypes[0]}","Organic Imaginary Digital",0,"Digital Space","Idle","${collections[1]}",0.00,25.00,2024,https://example.com/organic-imaginary-digital.jpg,,,,,,
    "Artwork","${artworkSubtypes[0]}","Organic Imaginary Canvas",1,"Home","For Sale","${collections[1]}",5.00,150.00,2024,https://example.com/organic-imaginary-canvas.jpg,,,,30,40,
    "Print","${printSubtypes[0]}","Organic Imaginary Print",0,"World","To Order","${collections[1]}",5.00,25.00,2024,https://example.com/organic-imaginary-canvas.jpg,,,,30,40,
    "Sticker","${stickerSubtypes[0]}","Red Dope Crew Sticker",100,"Feria Box","For Sale","${collections[6]}",0.30,2.50,2024,https://example.com/red-dope-crew-sticker.jpg,,,,5,5,
    "Bundle","${bundleSubtypes[0]}","Smoking Lounge Stickers",80,"Smoking Lounge","For Sale","${collections[6]}",0.30,2.50,2024,https://example.com/smoking-lounge-bundle.jpg,,,,,,
    "Merch","${merchSubtypes[0]}","Dope Crew T-Shirt",35,"Home","For Sale","${collections[6]}",8.00,25.00,2024,https://example.com/dope-crew-tshirt.jpg,,,,,M,
    "Merch","${merchSubtypes[2]}","Dope Crew Shoes",20,"Home","For Sale","${collections[6]}",15.00,45.00,2024,https://example.com/dope-crew-tshirt.jpg,,,,,7.5,
    "Material","${materialSubtypes[0]}","Acrylic Paint Set",10,"Home","For Sale","Art Supplies",15.00,25.00,2024,https://example.com/acrylic-paint-set.jpg,,,,,,
    "Equipment","${equipmentSubtypes[0]}","Canvas Stretcher",2,"Home","For Sale","Art Tools",45.00,75.00,2024,https://example.com/acrylic-paint-set.jpg,,,,,`;
    
    const blob = new Blob([template], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `inventory-template.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Import Inventory from CSV</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Row 1: Upload File */}
        <div className="space-y-2">
          <Label htmlFor="csv-file">Upload CSV File</Label>
          <Input
            id="csv-file"
            type="file"
            accept=".csv"
            onChange={handleFileUpload}
            placeholder="Select CSV file"
          />
        </div>

        {/* Row 2: Import Mode Selection */}
        <div className="space-y-2">
          <Label htmlFor="import-mode">Import Mode</Label>
          <Select value={importMode} onValueChange={(value: ImportMode) => setImportMode(value)}>
            <SelectTrigger>
              <SelectValue placeholder="Select import mode" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="add-only">Add Only - Skip existing items</SelectItem>
              <SelectItem value="merge">Merge - Update existing, add new</SelectItem>
              <SelectItem value="replace">Replace All - Clear inventory first</SelectItem>
            </SelectContent>
          </Select>
          
          {importMode === 'replace' && (
            <div className="text-amber-600 text-sm bg-amber-50 border border-amber-200 rounded-md p-2">
              ⚠️ Warning: This will delete ALL existing inventory and replace it with the CSV data!
            </div>
          )}
        </div>

        {/* Row 3: CSV Data Input */}
        <div className="space-y-2">
          <Label htmlFor="csv-data">Or Paste CSV Data</Label>
          <Input
            id="csv-data"
            className="w-full"
            placeholder="Paste CSV data here (one line per item)..."
            value={csvData}
            onChange={(e) => setCsvData(e.target.value)}
          />
        </div>



        {/* Row 4: Action Buttons */}
        <div className="flex gap-2">
          <Button
            onClick={getCSVTemplate}
            variant="outline"
            size="sm"
          >
            Download Template
          </Button>
          <Button
            onClick={handleImport}
            disabled={!csvData.trim() || isImporting}
            className="flex-1"
          >
            {isImporting ? 'Importing...' : 'Import Items'}
          </Button>
        </div>

        {importResult && (
          <div className={`p-3 rounded-md ${
            importResult.success > 0 
              ? 'bg-green-50 border border-green-200 text-green-800' 
              : 'bg-red-50 border border-red-200 text-red-800'
          }`}>
            {importResult.success > 0 ? (
              <p>Successfully imported {importResult.success} items!</p>
            ) : (
              <div>
                <p>Import failed:</p>
                <ul className="list-disc list-inside mt-1">
                  {importResult.errors.map((error, index) => (
                    <li key={index}>{error}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
