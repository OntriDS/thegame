// lib/utils/item-utils.ts
// Item-related helper functions

import { ItemType, ItemCategory } from '@/types/enums';
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
      return ["Digital Art", "Digitization", "Animation", "NFT"];
    case ItemType.ARTWORK:
      return ["Acrylic on Canvas", "Acrylic on Wood", "Assemblages", "Mural", "Furniture Art"];
    case ItemType.PRINT:
      return ["Giclee Print", "Standard Print", "Consignment"];
    case ItemType.STICKER:
      return ["Brilliant White", "Reflective", "Mate"];
    case ItemType.MERCH:
      return ["T-Shirt", "Bag", "Shoes", "Rashguard", "Sports Bra", "T-Shirt AllOver"];
    case ItemType.STICKER_BUNDLE:
    case ItemType.PRINT_BUNDLE:
      return ["Consignment", "Stored", "Direct Sale", "Tracking"];
    case ItemType.MATERIAL:
      return ["Art Material", "Design Material", "Workshop Material"];
    case ItemType.EQUIPMENT:
      return ["Art Equipment", "Design Equipment", "Workshop Equipment", "Store Equipment", "Vehicle"];
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
