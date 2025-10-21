// types/type-aliases.ts
// All TypeScript type aliases - compile-time only, not runtime values

// Import the const structures that these types are derived from
import { 
  BUSINESS_STRUCTURE, 
  LOCATION_STRUCTURE, 
  NOTE_TAGS, 
  ItemType, 
  ItemCategory,
  DigitalSubType, 
  ArtworkSubType, 
  PrintSubType,
  StickerSubType,
  MerchSubType,
  MaterialSubType,
  EquipmentSubType,
  StickerBundleSubType,
  PrintBundleSubType
} from './enums';

// Business Structure Types
export type Area = keyof typeof BUSINESS_STRUCTURE;
export type Station = typeof BUSINESS_STRUCTURE[Area][number];

// Geographic Location Types
export type Continent = keyof typeof LOCATION_STRUCTURE;
export type Country = keyof typeof LOCATION_STRUCTURE[Continent];
export type Region = keyof typeof LOCATION_STRUCTURE[Continent][Country];
// Settlement is now a proper interface in entities.ts, not a type alias

// Re-export SubType enums as types for backward compatibility
export type { DigitalSubType, ArtworkSubType, PrintSubType, StickerSubType, MerchSubType, MaterialSubType, EquipmentSubType, StickerBundleSubType, PrintBundleSubType };

// Union type for all possible SubItemTypes (all Item categories)
export type SubItemType = 
  | DigitalSubType 
  | ArtworkSubType 
  | PrintSubType
  | StickerSubType
  | MerchSubType 
  | MaterialSubType 
  | EquipmentSubType
  | StickerBundleSubType
  | PrintBundleSubType;

// Type aliases for Item types and categories
export type ItemTypeValue = `${ItemType}`;
export type ItemCategoryValue = `${ItemCategory}`;

// File Attachment Types
export type OriginalFileType = 'pdf' | 'sketch' | 'template' | 'source';
export type AccessoryFileType = 'vector' | 'framed' | 'backframe' | 'on-wood' | 'template';

// Union type for all file types
export type FileType = OriginalFileType | AccessoryFileType;

// Note System Types
export type NoteTag = typeof NOTE_TAGS[number];
