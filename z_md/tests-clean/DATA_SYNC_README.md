# Data Sync System - Cross-Device Synchronization

## Overview
The Data Sync system allows you to export and import your mission data between different devices, solving the cross-device development problem while keeping the localStorage approach simple.

## How It Works

### Export Process
1. **Click Export** - Downloads a JSON backup file with all your current data
2. **File Format** - `akiles-ecosystem-backup-YYYY-MM-DD.json`
3. **Data Included** - Tasks, site settings, and future collections

### Import Process
1. **Click Import** - Select a backup JSON file
2. **Smart Merging** - New data is merged with existing data
3. **Conflict Resolution** - Imported tasks override existing ones with same ID
4. **Auto-Update** - All timestamps are updated appropriately

## Access Points

### Quick Access (Admin Header)
- **Export Button** - One-click export from any admin page
- **Import Button** - Quick import with file picker
- **Location** - Top-right of admin interface, next to theme toggle

### Full Interface (Settings Page)
- **Detailed View** - `/admin/settings` → General tab
- **Data Summary** - Shows current task count and last update
- **Instructions** - Step-by-step sync guide
- **Status Messages** - Success/error feedback

## Usage Workflow

### Sync Between Devices
1. **On Device A** (e.g., Desktop PC)
   - Work on missions, create tasks
   - Click "Export" to download backup file
   
2. **Transfer File**
   - Move the .json file to Device B (e.g., Laptop)
   - Use USB, cloud storage, or email
   
3. **On Device B**
   - Click "Import" and select the backup file
   - Data is automatically merged
   - Continue working with all your missions

### Development Workflow
- **Local Development** - Work on one device
- **Export Before Switch** - Always export before changing devices
- **Import on New Device** - Import to continue where you left off
- **Repeat as Needed** - Export/import whenever switching devices

## Technical Details

### Data Structure
```json
{
  "version": "1.0.0",
  "exportedAt": "2024-01-15T10:30:00.000Z",
  "data": {
    "tasks": [...],
    "items": [...], // Complete inventory with unified stock management
    "financialRecords": [...],
    "siteSettings": {...},
    "companyAssets": {...},
    "personalAssets": {...},
    "pointsConversionRates": {...}
  }
}
```

### Merge Strategy
- **ID-Based Matching** - Tasks and items with same ID are updated
- **New Items** - Added to existing collection
- **Stock Management** - Preserves unified stock array structure
- **Settings** - Completely replaced (not merged)
- **Timestamps** - Automatically updated on import

### File Size
- **Typical Export** - 5-50 KB depending on task count
- **Compression** - JSON is already compressed
- **Transfer** - Easy to email or use cloud storage

## Benefits

✅ **Simple** - No database setup required  
✅ **Fast** - Instant export/import  
✅ **Reliable** - JSON format is universal  
✅ **Safe** - Never loses existing data  
✅ **Portable** - Works on any device  
✅ **Versioned** - Backup files include timestamps  

## Future Enhancements

- **Auto-Sync** - Cloud storage integration
- **Conflict Resolution** - Manual merge options
- **Backup History** - Multiple backup versions
- **Selective Export** - Choose specific data types
- **Encryption** - Secure backup files

## Troubleshooting

### Import Fails
- Check file format (.json extension)
- Verify file isn't corrupted
- Try exporting fresh data first

### Data Missing
- Ensure export completed successfully
- Check file size (should be > 1 KB)
- Verify import showed success message

### Performance Issues
- Large exports (> 1000 tasks) may take longer
- Close other browser tabs during import
- Refresh page after successful import

---

**Remember**: Always export before switching devices to avoid losing work!
