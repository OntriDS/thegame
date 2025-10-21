// lib/utils/item-utils.ts
// Item-related helper functions

import { 
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
} from '@/types/enums';
import type { SubItemType } from '@/types/type-aliases';

/** Helper function to get the category for a given ItemType */
export function getItemCategory(itemType: ItemType): ItemCategory {
  switch (itemType) {
    case ItemType.DIGITAL:
    case ItemType.ARTWORK:
    case ItemType.PRINT:
    case ItemType.STICKER:
    case ItemType.MERCH:
      return ItemCategory.MODEL_ITEM;
    case ItemType.STICKER_BUNDLE:
    case ItemType.PRINT_BUNDLE:
      return ItemCategory.BUNDLE_ITEM;
    case ItemType.MATERIAL:
    case ItemType.EQUIPMENT:
      return ItemCategory.RESOURCE_ITEM;
    default:
      return ItemCategory.MODEL_ITEM;
  }
}

/** Helper function to get valid subtypes for a given ItemType */
export function getSubTypesForItemType(itemType: ItemType): SubItemType[] {
  switch (itemType) {
    case ItemType.DIGITAL:
      return Object.values(DigitalSubType);
    case ItemType.ARTWORK:
      return Object.values(ArtworkSubType);
    case ItemType.PRINT:
      return Object.values(PrintSubType);
    case ItemType.STICKER:
      return Object.values(StickerSubType);
    case ItemType.MERCH:
      return Object.values(MerchSubType);
    case ItemType.STICKER_BUNDLE:
      return Object.values(StickerBundleSubType);
    case ItemType.PRINT_BUNDLE:
      return Object.values(PrintBundleSubType);
    case ItemType.MATERIAL:
      return Object.values(MaterialSubType);
    case ItemType.EQUIPMENT:
      return Object.values(EquipmentSubType);
    default:
      return [];
  }
}

/** Helper function to get all ItemTypes for a given category */
export function getItemTypesForCategory(category: ItemCategory): ItemType[] {
  switch (category) {
    case ItemCategory.MODEL_ITEM:
      return [ItemType.DIGITAL, ItemType.ARTWORK, ItemType.PRINT, ItemType.STICKER, ItemType.MERCH];
    case ItemCategory.BUNDLE_ITEM:
      return [ItemType.STICKER_BUNDLE, ItemType.PRINT_BUNDLE];
    case ItemCategory.RESOURCE_ITEM:
      return [ItemType.MATERIAL, ItemType.EQUIPMENT];
    default:
      return [];
  }
}
