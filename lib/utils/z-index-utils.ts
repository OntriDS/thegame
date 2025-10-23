// lib/utils/z-index-utils.ts
// Centralized z-index management using the layer system
import { Z_INDEX_LAYERS } from '@/lib/constants/app-constants';

/**
 * Get the z-index value for a specific layer
 * @param layer - The layer name from Z_INDEX_LAYERS
 * @returns The z-index value as a Tailwind class string
 */
export function getZIndexClass(layer: keyof typeof Z_INDEX_LAYERS): string {
  const value = Z_INDEX_LAYERS[layer];
  return `z-[${value}]`;
}

/**
 * Build a Tailwind class applying a z-index on a pseudo-class (e.g., focus-within:z-[200])
 */
export function getPseudoZIndexClass(
  pseudo: string,
  layer: keyof typeof Z_INDEX_LAYERS
): string {
  return `${pseudo}:${getZIndexClass(layer)}`;
}

/**
 * Get the z-index value as a number for inline styles
 * @param layer - The layer name from Z_INDEX_LAYERS
 * @returns The z-index value as a number
 */
export function getZIndexValue(layer: keyof typeof Z_INDEX_LAYERS): number {
  return Z_INDEX_LAYERS[layer];
}

/**
 * Get the z-index class for modals (Layer 2)
 * @returns z-[100] class string
 */
export function getModalZIndex(): string {
  return getZIndexClass('MODALS');
}

/**
 * Get the z-index class for modal tabs (Layer 2)
 * @returns z-[200] class string
 */
export function getModalTabsZIndex(): string {
  return getZIndexClass('MODALS');
}

/**
 * Get the z-index class for inner modals like calendars and dropdowns (Layer 2)
 * @returns z-[200] class string
 */
export function getInnerModalZIndex(): string {
  return getZIndexClass('MODALS');
}

/**
 * Get the z-index class for sub-modals and nested dropdowns (Layer 4)
 * @returns z-[400] class string
 */
export function getSubModalZIndex(): string {
  return getZIndexClass('SUB_MODALS');
}

/**
 * Get the z-index class for dropdowns and popovers (Layer 5)
 * @returns z-[500] class string
 */
export function getDropdownZIndex(): string {
  return getZIndexClass('SUPRA_FIELDS');
}

/**
 * Get the z-index class for tooltips (Layer 6)
 * @returns z-[600] class string
 */
export function getTooltipZIndex(): string {
  return getZIndexClass('TOOLTIPS');
}

/**
 * Get the z-index class for notifications (Layer 7)
 * @returns z-[800] class string
 */
export function getNotificationZIndex(): string {
  return getZIndexClass('NOTIFICATIONS');
}

/**
 * Get the z-index class for critical modals like delete confirmations (Layer 20)
 * @returns z-[1000] class string
 */
export function getCriticalZIndex(): string {
  return getZIndexClass('CRITICAL');
}

/**
 * Get the z-index class with pointer-events-auto for proper interaction
 * @param layer - The layer name from Z_INDEX_LAYERS
 * @returns Combined z-index and pointer-events class string
 */
export function getInteractiveZIndex(layer: keyof typeof Z_INDEX_LAYERS): string {
  return `${getZIndexClass(layer)} pointer-events-auto`;
}

/**
 * Get the z-index class for inner modals with proper interaction
 * @returns z-[200] pointer-events-auto class string
 */
export function getInteractiveInnerModalZIndex(): string {
  return getInteractiveZIndex('MODALS');
}

/**
 * Get the z-index class for sub-modals with proper interaction
 * @returns z-[400] pointer-events-auto class string
 */
export function getInteractiveSubModalZIndex(): string {
  return getInteractiveZIndex('SUB_MODALS');
}
