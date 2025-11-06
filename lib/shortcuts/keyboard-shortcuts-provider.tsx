'use client';

// lib/shortcuts/keyboard-shortcuts-provider.tsx
// Unified keyboard shortcuts provider with scoped, deduplicated handling

import React, { createContext, useContext, useEffect, useRef, useState, useCallback } from 'react';
import { ShortcutRegistration, Scope, normalizeCombo, isInputField, matchesCombo } from './types';

interface ShortcutsContextValue {
  registerShortcut: (registration: Omit<ShortcutRegistration, 'id'>) => () => void;
  setActiveScope: (scope: Scope) => void;
  activeScope: Scope;
}

const ShortcutsContext = createContext<ShortcutsContextValue | null>(null);

// Global scope constant
export const GLOBAL_SCOPE = 'global';

interface KeyboardShortcutsProviderProps {
  children: React.ReactNode;
  defaultScope?: Scope;
  enableDebug?: boolean;
}

export function KeyboardShortcutsProvider({
  children,
  defaultScope = GLOBAL_SCOPE,
  enableDebug = process.env.NODE_ENV === 'development',
}: KeyboardShortcutsProviderProps) {
  const [activeScope, setActiveScopeState] = useState<Scope>(defaultScope);
  const registrationsRef = useRef<Map<Scope, ShortcutRegistration[]>>(new Map());
  const throttleTimersRef = useRef<Map<string, number>>(new Map());
  const handlerPromisesRef = useRef<Map<string, Promise<void>>>(new Map());
  const nextIdRef = useRef(0);

  // Initialize global scope
  useEffect(() => {
    if (!registrationsRef.current.has(GLOBAL_SCOPE)) {
      registrationsRef.current.set(GLOBAL_SCOPE, []);
    }
  }, []);

  const setActiveScope = useCallback((scope: Scope) => {
    if (enableDebug) {
      console.log('[Shortcuts] Active scope changed:', scope);
    }
    setActiveScopeState(scope);
  }, [enableDebug]);

  const registerShortcut = useCallback((registration: Omit<ShortcutRegistration, 'id'>): (() => void) => {
    const id = `shortcut-${nextIdRef.current++}`;
    const fullRegistration: ShortcutRegistration = { ...registration, id };

    // Initialize scope if needed
    if (!registrationsRef.current.has(registration.scope)) {
      registrationsRef.current.set(registration.scope, []);
    }

    const scopeRegistrations = registrationsRef.current.get(registration.scope)!;
    scopeRegistrations.push(fullRegistration);

    // Sort by priority (higher priority first)
    scopeRegistrations.sort((a, b) => b.priority - a.priority);

    if (enableDebug) {
      console.log('[Shortcuts] Registered:', {
        id,
        scope: registration.scope,
        combo: registration.combo,
        priority: registration.priority,
      });
    }

    // Return unregister function
    return () => {
      const scopeRegs = registrationsRef.current.get(registration.scope);
      if (scopeRegs) {
        const index = scopeRegs.findIndex(r => r.id === id);
        if (index >= 0) {
          scopeRegs.splice(index, 1);
          if (enableDebug) {
            console.log('[Shortcuts] Unregistered:', id);
          }
        }
      }
    };
  }, [enableDebug]);

  // Main event handler
  useEffect(() => {
    const handleKeyDown = async (event: KeyboardEvent) => {
      // Global deduplication: check if event already handled
      const anyEvent = event as any;
      if (anyEvent.__handled) {
        return;
      }

      // Check if target is input field (will be checked per-handler for allowInInputs)
      const isInput = isInputField(event.target);

      // Get registrations for active scope, then global scope
      const scopesToCheck = [activeScope];
      if (activeScope !== GLOBAL_SCOPE) {
        scopesToCheck.push(GLOBAL_SCOPE);
      }

      const normalizedCombo = normalizeCombo(event);

      // Try each scope in order
      for (const scope of scopesToCheck) {
        const registrations = registrationsRef.current.get(scope) || [];

        // Try each registration in priority order
        for (const registration of registrations) {
          // Skip if input field and handler doesn't allow it
          if (isInput && !registration.allowInInputs) {
            continue;
          }

          // Check if combo matches
          let matches = false;
          if (registration.combo) {
            matches = matchesCombo(event, registration.combo);
          } else if (registration.match) {
            matches = registration.match(event);
          }

          if (!matches) {
            continue;
          }

          // Ignore key repeat for shortcuts without throttle (throttled shortcuts handle repeat via throttle)
          if (event.repeat && !registration.throttleMs) {
            continue;
          }

          // Throttle check (for shortcuts that support repeat via throttle)
          if (registration.throttleMs) {
            const throttleKey = `${registration.id}-${normalizedCombo}`;
            const lastTime = throttleTimersRef.current.get(throttleKey) || 0;
            const now = Date.now();
            if (now - lastTime < registration.throttleMs) {
              if (enableDebug) {
                console.log('[Shortcuts] Throttled:', registration.id);
              }
              continue;
            }
            throttleTimersRef.current.set(throttleKey, now);
          }

          // Prevent default and mark as handled
          event.preventDefault();
          anyEvent.__handled = true;

          if (enableDebug) {
            console.log('[Shortcuts] Handling:', {
              scope,
              id: registration.id,
              combo: normalizedCombo,
            });
          }

          // Execute handler (with reentrancy guard for async handlers)
          const handlerKey = `${registration.id}-${normalizedCombo}`;
          const existingPromise = handlerPromisesRef.current.get(handlerKey);
          
          if (existingPromise) {
            // Handler already running, skip
            if (enableDebug) {
              console.log('[Shortcuts] Handler already running, skipping:', registration.id);
            }
            return;
          }

          try {
            const promise = Promise.resolve(registration.handler(event));
            handlerPromisesRef.current.set(handlerKey, promise);
            
            await promise;
            
            // Clear promise after a short delay to allow for rapid but distinct keypresses
            setTimeout(() => {
              handlerPromisesRef.current.delete(handlerKey);
            }, 100);
          } catch (error) {
            console.error('[Shortcuts] Handler error:', error);
            handlerPromisesRef.current.delete(handlerKey);
          }

          // Stop after first handler consumes the event
          return;
        }
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [activeScope, enableDebug]);

  const value: ShortcutsContextValue = {
    registerShortcut,
    setActiveScope,
    activeScope,
  };

  return (
    <ShortcutsContext.Provider value={value}>
      {children}
    </ShortcutsContext.Provider>
  );
}

export function useShortcutsContext(): ShortcutsContextValue {
  const context = useContext(ShortcutsContext);
  if (!context) {
    throw new Error('useShortcutsContext must be used within KeyboardShortcutsProvider');
  }
  return context;
}

/**
 * Hook to register a keyboard shortcut
 */
export function useRegisterShortcut(options: {
  scope: Scope;
  combo?: string;
  match?: (event: KeyboardEvent) => boolean;
  handler: (event: KeyboardEvent) => void | Promise<void>;
  priority?: number;
  allowInInputs?: boolean;
  throttleMs?: number;
}) {
  const { registerShortcut } = useShortcutsContext();

  useEffect(() => {
    const unregister = registerShortcut({
      scope: options.scope,
      combo: options.combo,
      match: options.match,
      handler: options.handler,
      priority: options.priority ?? 0,
      allowInInputs: options.allowInInputs ?? false,
      throttleMs: options.throttleMs,
    });

    return unregister;
  }, [
    registerShortcut,
    options.scope,
    options.combo,
    options.match,
    options.handler,
    options.priority,
    options.allowInInputs,
    options.throttleMs,
  ]);
}

/**
 * Hook to manage active scope
 */
export function useShortcutScope() {
  const { setActiveScope, activeScope } = useShortcutsContext();
  return { setActiveScope, activeScope };
}

