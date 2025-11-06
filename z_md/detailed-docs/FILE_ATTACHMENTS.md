# 📎 File Attachment System

## **Overview**
The file attachment system allows items to have additional files beyond the main display image. This is particularly useful for:
- **Stickers**: Print PDFs and cutting vectors
- **Artworks**: Sketches and frame references
- **Digital Art**: Source files and templates
- **Any Item**: Additional documentation or assets

## **How It Works**

### **Two File Categories**
1. **Original Files**: Main source files (PDFs for stickers, sketches for artworks)
2. **Accessory Files**: Supporting files (vectors for cutting, frame types, etc.)

### **File Reference Structure**
```typescript
interface FileReference {
  url?: string;           // File path (optional for symbolic types)
  type: string;           // File type identifier
}
```

## **CSV Format**

### **New Fields Added**
The CSV now includes two new fields after `imageUrl`:
```csv
ItemType,SubItemType,Name,TotalQuantity,Site,Status,Collection,UnitCost,Price,Year,ImageUrl,OriginalFiles,AccessoryFiles,Width,Height,Size
```

### **File Attachment Format**
```
"url:type;url:type"
```

**Examples:**
- **Single file**: `"/stickers/bitcoin.pdf:pdf"`
- **Symbolic type**: `"framed"`
- **Multiple files**: `"/sketch1.jpg:sketch;/sketch2.jpg:sketch"`

## **Use Cases & Examples**

### **1. Stickers**
```csv
Sticker,Reflective,Bitcoin Sticker,100,Home,For Sale,Bitcoin,0.5,2,2024,/stickers/bitcoin-preview.png,"/stickers/bitcoin-print.pdf:pdf","/stickers/bitcoin-vector.pdf:vector",5,5,
```
- **ImageUrl**: PNG preview for browser display
- **OriginalFiles**: PDF for printing company
- **AccessoryFiles**: Vector PDF for cutting plotter

### **2. Artworks with Frames**
```csv
Artwork,Acrylic on Canvas,Mushland Canvas,1,Home,For Sale,Mushland,50,200,2024,/artworks/mushland.jpg,"/sketches/sketch1.jpg:sketch;/sketches/sketch2.jpg:sketch","framed",60,40,
```
- **ImageUrl**: Main artwork image
- **OriginalFiles**: Multiple sketch files (process documentation)
- **AccessoryFiles**: Frame type (symbolic, no file needed)

### **3. Simple Items (No Change)**
```csv
Digital Art,Digital Art,Code of Life,1,Digital Space,For Sale,Organic Imaginary,0,50,2024,/digital/code-of-life.png,,,,,
```
- **ImageUrl**: Main image (no additional files needed)
- **OriginalFiles**: Empty
- **AccessoryFiles**: Empty

## **File Types**

### **Original File Types**
- `pdf` - Print files, source documents
- `sketch` - Process sketches, studies
- `template` - Design templates
- `source` - Source files (AI, PSD, etc.)

### **Accessory File Types**
- `vector` - Cutting vectors, paths
- `framed` - Framed artwork indicator
- `backframe` - Back frame only indicator
- `on-wood` - Wood-mounted indicator
- `template` - Additional templates

## **Implementation Details**

### **Backward Compatibility**
- ✅ Existing items continue working unchanged
- ✅ Missing file fields are ignored (graceful degradation)
- ✅ CSV import handles missing fields automatically

### **Data Storage**
- Files are stored as arrays in the Item interface
- Empty arrays are not stored (undefined)
- Symbolic types don't require actual files

### **UI Integration**
- File attachment fields in Item Modal
- CSV import/export support
- Template includes examples

## **CSV Template**

Download the updated template from the CSV Import component. It includes:
- All existing fields (unchanged)
- New `OriginalFiles` and `AccessoryFiles` columns
- Example data showing different use cases
- Proper formatting for file attachments

## **Best Practices**

### **File Naming**
- Use descriptive file names
- Include file type in description
- Use consistent path structures

### **Symbolic Types**
- Use for frame types, mounting styles
- No file URL needed
- Keep descriptions clear and consistent

### **Multiple Files**
- Separate with semicolons
- Order logically (chronological, importance)
- Include descriptions for clarity

## **Future Enhancements**

- **File Preview**: View attached files in inventory
- **File Management**: Upload/delete files directly
- **Type Validation**: Enforce valid file types
- **Icon Display**: Show file type indicators in UI

---

**Note**: This system maintains your existing inventory structure while adding powerful file attachment capabilities. All existing CSV files will continue to work, and you can gradually add file attachments as needed.
