/**
 * UI Events System - Centralized, type-safe event dispatching
 * 
 * This module provides a single source of truth for entity update events.
 * All modals dispatch events here, all parents subscribe via useEntityUpdates hook.
 * 
 * Architecture: Modal dispatches → Parent listens → UI refreshes immediately
 */

export type EntityKind = 'task' | 'item' | 'financial' | 'sale' | 'site' | 'character' | 'player';

const EVENT_MAP: Record<EntityKind, string> = {
  task: 'tasksUpdated',
  item: 'itemsUpdated',
  financial: 'financialsUpdated',
  sale: 'salesUpdated',
  site: 'sitesUpdated',
  character: 'charactersUpdated',
  player: 'playersUpdated',
} as const;

/**
 * Dispatches entity-specific update event and linksUpdated event
 * 
 * @param kind - The entity type that was updated
 * 
 * Usage in modals:
 * ```typescript
 * onSave(entity);
 * dispatchEntityUpdated('task');
 * onOpenChange(false);
 * ```
 */
export function dispatchEntityUpdated(kind: EntityKind): void {
  if (typeof window === 'undefined') return;
  
  // Dispatch entity-specific event
  const eventName = EVENT_MAP[kind];
  window.dispatchEvent(new Event(eventName));
  
  // Always dispatch linksUpdated for relationship updates
  window.dispatchEvent(new Event('linksUpdated'));
}

/**
 * Gets the event name for a given entity kind
 * 
 * @param kind - The entity type
 * @returns The event name string
 */
export function getEventName(kind: EntityKind): string {
  return EVENT_MAP[kind];
}

/**
 * All available event names for reference
 */
export const EVENT_NAMES = {
  TASKS_UPDATED: 'tasksUpdated',
  ITEMS_UPDATED: 'itemsUpdated',
  FINANCIALS_UPDATED: 'financialsUpdated',
  SALES_UPDATED: 'salesUpdated',
  SITES_UPDATED: 'sitesUpdated',
  CHARACTERS_UPDATED: 'charactersUpdated',
  PLAYERS_UPDATED: 'playersUpdated',
  LINKS_UPDATED: 'linksUpdated',
} as const;
