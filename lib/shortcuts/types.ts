// lib/shortcuts/types.ts
// Types for unified keyboard shortcuts system

export type Scope = string;

export interface ShortcutRegistration {
  id: string;
  scope: Scope;
  combo?: string;
  match?: (event: KeyboardEvent) => boolean;
  handler: (event: KeyboardEvent) => void | Promise<void>;
  priority: number;
  allowInInputs?: boolean;
  throttleMs?: number;
}

export interface ComboParts {
  ctrl?: boolean;
  alt?: boolean;
  shift?: boolean;
  meta?: boolean;
  key: string;
}

/**
 * Normalize a keyboard event to a combo string for matching
 * Format: "ctrl+alt+shift+key" (modifiers in order: ctrl, alt, shift, meta)
 */
export function normalizeCombo(event: KeyboardEvent): string {
  const parts: string[] = [];
  if (event.ctrlKey) parts.push('ctrl');
  if (event.altKey) parts.push('alt');
  if (event.shiftKey) parts.push('shift');
  if (event.metaKey) parts.push('meta');
  
  const key = event.key.toLowerCase();
  // Normalize arrow keys
  if (key === 'arrowup') parts.push('arrowup');
  else if (key === 'arrowdown') parts.push('arrowdown');
  else if (key === 'arrowleft') parts.push('arrowleft');
  else if (key === 'arrowright') parts.push('arrowright');
  else parts.push(key);
  
  return parts.join('+');
}

/**
 * Parse a combo string into parts
 * Example: "alt+d" -> { alt: true, key: "d" }
 */
export function parseCombo(combo: string): ComboParts {
  const parts = combo.toLowerCase().split('+').map(s => s.trim());
  const result: ComboParts = { key: '' };
  
  for (const part of parts) {
    if (part === 'ctrl') result.ctrl = true;
    else if (part === 'alt') result.alt = true;
    else if (part === 'shift') result.shift = true;
    else if (part === 'meta') result.meta = true;
    else if (part === 'arrowup') result.key = 'arrowup';
    else if (part === 'arrowdown') result.key = 'arrowdown';
    else if (part === 'arrowleft') result.key = 'arrowleft';
    else if (part === 'arrowright') result.key = 'arrowright';
    else result.key = part;
  }
  
  return result;
}

/**
 * Check if a keyboard event matches a combo string
 */
export function matchesCombo(event: KeyboardEvent, combo: string): boolean {
  const parsed = parseCombo(combo);
  const normalized = normalizeCombo(event);
  const comboNormalized = normalizeComboFromParts(parsed);
  
  return normalized === comboNormalized;
}

function normalizeComboFromParts(parts: ComboParts): string {
  const mods: string[] = [];
  if (parts.ctrl) mods.push('ctrl');
  if (parts.alt) mods.push('alt');
  if (parts.shift) mods.push('shift');
  if (parts.meta) mods.push('meta');
  mods.push(parts.key);
  return mods.join('+');
}

/**
 * Check if event target is an input field
 */
export function isInputField(target: EventTarget | null): boolean {
  if (!target) return false;
  const element = target as HTMLElement;
  return (
    element instanceof HTMLInputElement ||
    element instanceof HTMLTextAreaElement ||
    element instanceof HTMLSelectElement ||
    element.contentEditable === 'true'
  );
}

