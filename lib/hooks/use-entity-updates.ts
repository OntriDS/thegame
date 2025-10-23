/**
 * useEntityUpdates Hook - Universal subscription to entity update events
 * 
 * This hook provides a clean, consistent way for parent components to subscribe
 * to entity update events and refresh their local state accordingly.
 * 
 * @param kind - The entity type to listen for updates
 * @param onUpdate - Callback function to execute when entity is updated
 * 
 * Usage:
 * ```typescript
 * useEntityUpdates('task', () => setRefreshKey(prev => prev + 1));
 * useEntityUpdates('item', loadItems);
 * ```
 */

import { useEffect, useCallback } from 'react';
import type { EntityKind } from '@/lib/ui/ui-events';
import { getEventName } from '@/lib/ui/ui-events';

export function useEntityUpdates(kind: EntityKind, onUpdate: () => void | Promise<void>) {
  // Create a stable handler to prevent unnecessary re-subscriptions
  const stableHandler = useCallback(() => {
    void onUpdate();
  }, [onUpdate]);

  useEffect(() => {
    const eventName = getEventName(kind);
    
    // Subscribe to the entity-specific event
    window.addEventListener(eventName, stableHandler);
    
    // Cleanup on unmount or dependency change
    return () => {
      window.removeEventListener(eventName, stableHandler);
    };
  }, [kind, stableHandler]);
}

/**
 * Hook for listening to multiple entity types
 * 
 * @param subscriptions - Array of { kind, onUpdate } pairs
 * 
 * Usage:
 * ```typescript
 * useMultipleEntityUpdates([
 *   { kind: 'task', onUpdate: loadTasks },
 *   { kind: 'item', onUpdate: loadItems },
 *   { kind: 'financial', onUpdate: loadFinancials }
 * ]);
 * ```
 */
export function useMultipleEntityUpdates(
  subscriptions: Array<{ kind: EntityKind; onUpdate: () => void | Promise<void> }>
) {
  subscriptions.forEach(({ kind, onUpdate }) => {
    useEntityUpdates(kind, onUpdate);
  });
}
