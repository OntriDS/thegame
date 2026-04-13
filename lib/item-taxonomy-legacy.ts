// lib/item-taxonomy-legacy.ts
// Pre-migration string values -> canonical ItemType / subtype IDs (kebab / lowercase).

import {
  ItemType,
  DigitalSubType,
  ArtworkSubType,
  PrintSubType,
  StickerSubType,
  MerchSubType,
  CraftSubType,
  BundleSubType,
  MaterialSubType,
  EquipmentSubType,
} from '@/types/enums';

/** Legacy item `type` strings (and common variants) -> canonical ItemType value */
export const LEGACY_ITEM_TYPE_TO_CANONICAL: Record<string, ItemType> = {
  Digital: ItemType.DIGITAL,
  Artwork: ItemType.ARTWORK,
  Print: ItemType.PRINT,
  Sticker: ItemType.STICKER,
  Merch: ItemType.MERCH,
  Craft: ItemType.CRAFT,
  Bundle: ItemType.BUNDLE,
  Material: ItemType.MATERIAL,
  Equipment: ItemType.EQUIPMENT,
};

/** Per ItemType: legacy subtype string -> canonical subtype */
export const LEGACY_SUBTYPE_BY_ITEM_TYPE: Record<ItemType, Record<string, string>> = {
  [ItemType.DIGITAL]: {
    'Digital Art': DigitalSubType.DIGITAL_ART,
    Digitization: DigitalSubType.DIGITIZATION,
    Animation: DigitalSubType.ANIMATION,
    NFT: DigitalSubType.NFT,
  },
  [ItemType.ARTWORK]: {
    'Acrylic on Canvas': ArtworkSubType.ACRYLIC_CANVAS,
    'Acrylic on Wood': ArtworkSubType.ACRYLIC_WOOD,
    Assemblage: ArtworkSubType.ASSEMBLAGE,
    Mural: ArtworkSubType.MURAL,
    'Furniture Art': ArtworkSubType.FURNITURE_ART,
  },
  [ItemType.PRINT]: {
    'Giclee Print': PrintSubType.GICLEE_PRINT,
    'Poster Print': PrintSubType.POSTER_PRINT,
    'Print on Frame': PrintSubType.PRINT_ON_FRAME,
  },
  [ItemType.STICKER]: {
    'Brilliant White': StickerSubType.BRILLIANT_WHITE,
    Reflective: StickerSubType.REFLECTIVE,
    Mate: StickerSubType.MATE,
  },
  [ItemType.MERCH]: {
    'T-Shirt': MerchSubType.T_SHIRT,
    Bag: MerchSubType.BAG,
    Shoes: MerchSubType.SHOES,
    Rashguard: MerchSubType.RASHGUARD,
    'Sports Bra': MerchSubType.SPORTS_BRA,
    'T-Shirt AllOver': MerchSubType.T_SHIRT_ALLOVER,
    Merchandise: MerchSubType.MERCHANDISE,
  },
  [ItemType.CRAFT]: {
    Frame: CraftSubType.FRAME,
    Furniture: CraftSubType.FURNITURE,
    Stands: CraftSubType.STANDS,
  },
  [ItemType.BUNDLE]: {
    Sticker: BundleSubType.STICKERS,
    Print: BundleSubType.PRINTS,
  },
  [ItemType.MATERIAL]: {
    'Art Material': MaterialSubType.ART_MATERIAL,
    'Design Material': MaterialSubType.DESIGN_MATERIAL,
    'Workshop Material': MaterialSubType.WORKSHOP_MATERIAL,
  },
  [ItemType.EQUIPMENT]: {
    'Art Equipment': EquipmentSubType.ART_EQUIPMENT,
    'Design Equipment': EquipmentSubType.DESIGN_EQUIPMENT,
    'Workshop Equipment': EquipmentSubType.WORKSHOP_EQUIPMENT,
    'Store Equipment': EquipmentSubType.SALES_EQUIPMENT,
    'Personal Equipment': EquipmentSubType.PERSONAL_EQUIPMENT,
    Vehicle: EquipmentSubType.VEHICLE,
  },
};
