// lib/constants/item-taxonomy-labels.ts
// Human-readable labels for canonical ItemType / subtype IDs (storage uses lowercase / kebab).

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

export const ITEM_TYPE_LABEL: Record<ItemType, string> = {
  [ItemType.DIGITAL]: 'Digital',
  [ItemType.ARTWORK]: 'Artwork',
  [ItemType.PRINT]: 'Print',
  [ItemType.STICKER]: 'Sticker',
  [ItemType.MERCH]: 'Merch',
  [ItemType.CRAFT]: 'Craft',
  [ItemType.BUNDLE]: 'Bundle',
  [ItemType.MATERIAL]: 'Material',
  [ItemType.EQUIPMENT]: 'Equipment',
};

export const SUBTYPE_LABEL: Record<string, string> = {
  [DigitalSubType.DIGITAL_ART]: 'Digital Art',
  [DigitalSubType.DIGITIZATION]: 'Digitization',
  [DigitalSubType.ANIMATION]: 'Animation',
  [DigitalSubType.NFT]: 'NFT',
  [DigitalSubType.THREE_D_MODEL]: '3D Model',
  [ArtworkSubType.ACRYLIC_CANVAS]: 'Acrylic on Canvas',
  [ArtworkSubType.ACRYLIC_WOOD]: 'Acrylic on Wood',
  [ArtworkSubType.ASSEMBLAGE]: 'Assemblage',
  [ArtworkSubType.MURAL]: 'Mural',
  [ArtworkSubType.FURNITURE_ART]: 'Furniture Art',
  [PrintSubType.GICLEE_PRINT]: 'Giclee Print',
  [PrintSubType.POSTER_PRINT]: 'Poster Print',
  [PrintSubType.PRINT_ON_FRAME]: 'Print on Frame',
  [StickerSubType.BRILLIANT_WHITE]: 'Brilliant White',
  [StickerSubType.REFLECTIVE]: 'Reflective',
  [StickerSubType.MATE]: 'Mate',
  [MerchSubType.T_SHIRT]: 'T-Shirt',
  [MerchSubType.BAG]: 'Bag',
  [MerchSubType.SHOES]: 'Shoes',
  [MerchSubType.RASHGUARD]: 'Rashguard',
  [MerchSubType.SPORTS_BRA]: 'Sports Bra',
  [MerchSubType.T_SHIRT_ALLOVER]: 'T-Shirt AllOver',
  [MerchSubType.T_SHIRT_TANKTOP]: 'Tank Top',
  [MerchSubType.BACKPACK]: 'Backpack',
  [MerchSubType.STICKERS_INT_KISSCUT]: 'Kiss-Cut Sticker (Int)',
  [MerchSubType.PRINTS_INT_GICLEE_BACKFRAMED]: 'Giclee Print Backframed (Int)',
  [MerchSubType.OTHER_MERCHANDISE]: 'Other Merchandise',
  [CraftSubType.FRAME]: 'Frame',
  [CraftSubType.FURNITURE]: 'Furniture',
  [CraftSubType.STANDS]: 'Stands',
  [BundleSubType.STICKERS]: 'Sticker',
  [BundleSubType.PRINTS]: 'Print',
  [MaterialSubType.ART_MATERIAL]: 'Art Material',
  [MaterialSubType.DESIGN_MATERIAL]: 'Design Material',
  [MaterialSubType.WORKSHOP_MATERIAL]: 'Workshop Material',
  [EquipmentSubType.ART_EQUIPMENT]: 'Art Equipment',
  [EquipmentSubType.DESIGN_EQUIPMENT]: 'Design Equipment',
  [EquipmentSubType.WORKSHOP_EQUIPMENT]: 'Workshop Equipment',
  [EquipmentSubType.SALES_EQUIPMENT]: 'Store Equipment',
  [EquipmentSubType.PERSONAL_EQUIPMENT]: 'Personal Equipment',
  [EquipmentSubType.VEHICLE]: 'Vehicle',
};

export function getItemTypeLabel(type: ItemType | string | undefined | null): string {
  if (!type) return '';
  if (type in ITEM_TYPE_LABEL) return ITEM_TYPE_LABEL[type as ItemType];
  return String(type);
}

export function getSubItemTypeLabel(canonical: string | undefined | null): string {
  if (!canonical) return '';
  return SUBTYPE_LABEL[canonical] ?? canonical;
}
