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

import { useEffect, useCallback, useRef } from 'react';
import type { EntityKind } from '@/lib/ui/ui-events';
import { getEventName } from '@/lib/ui/ui-events';

export function useEntityUpdates(kind: EntityKind, onUpdate: () => void | Promise<void>) {
  // Keep the latest callback in a ref so the event handler can remain stable
  const callbackRef = useRef(onUpdate);

  // Always update the ref when the callback changes
  useEffect(() => {
    callbackRef.current = onUpdate;
  }, [onUpdate]);

  // Stable event handler that calls the latest callback from the ref
  const stableHandler = useCallback(() => {
    void callbackRef.current();
  }, []);

  useEffect(() => {
    const eventName = getEventName(kind);

    window.addEventListener(eventName, stableHandler);
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
  const callbacksRef = useRef(new Map<EntityKind, () => void | Promise<void>>());

  useEffect(() => {
    callbacksRef.current.clear();
    subscriptions.forEach(({ kind, onUpdate }) => {
      callbacksRef.current.set(kind, onUpdate);
    });

    const handlers = subscriptions.map(({ kind }) => {
      const handler = () => {
        const cb = callbacksRef.current.get(kind);
        if (cb) void cb();
      };
      const eventName = getEventName(kind);
      window.addEventListener(eventName, handler);
      return { kind, handler };
    });

    return () => {
      handlers.forEach(({ kind, handler }) => {
        const eventName = getEventName(kind);
        window.removeEventListener(eventName, handler);
      });
    };
  }, [subscriptions]);
}
