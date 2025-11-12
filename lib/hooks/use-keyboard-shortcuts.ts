// lib/hooks/use-keyboard-shortcuts.ts
// Compatibility layer for keyboard shortcuts - registers with unified provider

import { useRegisterShortcut, GLOBAL_SCOPE } from '@/lib/shortcuts/keyboard-shortcuts-provider';

interface KeyboardShortcutsProps {
  onOpenTaskModal?: () => void;
  onOpenItemModal?: () => void;
  onOpenFinancialModal?: () => void;
  onOpenSalesModal?: () => void;
  onOpenSiteModal?: () => void;
  onOpenCharacterModal?: () => void;
  onOpenPlayerModal?: () => void;
  onNavigateToControlRoom?: () => void;
  onNavigateToInventory?: () => void;
  onNavigateToFinances?: () => void;
  onNavigateToSales?: () => void;
  onNavigateToMap?: () => void;
  onNavigateToPlayer?: () => void;
  onNavigateToPersonas?: () => void;
  onNavigateToSettings?: () => void;
  onMoveSelectionUp?: (options: { alt: boolean }) => void;
  onMoveSelectionDown?: (options: { alt: boolean }) => void;
  scope?: string; // Optional scope override (defaults to GLOBAL_SCOPE)
}

export function useKeyboardShortcuts({
  onOpenTaskModal,
  onOpenItemModal,
  onOpenFinancialModal,
  onOpenSalesModal,
  onOpenSiteModal,
  onOpenCharacterModal,
  onOpenPlayerModal,
  onNavigateToControlRoom,
  onNavigateToInventory,
  onNavigateToFinances,
  onNavigateToSales,
  onNavigateToMap,
  onNavigateToPlayer,
  onNavigateToPersonas,
  onNavigateToSettings,
  onMoveSelectionUp,
  onMoveSelectionDown,
  scope = GLOBAL_SCOPE,
}: KeyboardShortcutsProps) {
  const insertTextAtSelection = (event: KeyboardEvent, text: string) => {
    const target = event.target as HTMLElement | null;
    if (!target) return;

    if (target instanceof HTMLInputElement || target instanceof HTMLTextAreaElement) {
      const start = target.selectionStart ?? target.value.length;
      const end = target.selectionEnd ?? target.value.length;
      const value = target.value;
      const newValue = value.substring(0, start) + text + value.substring(end);
      target.value = newValue;
      const caretPosition = start + text.length;
      target.setSelectionRange(caretPosition, caretPosition);
      target.dispatchEvent(new Event('input', { bubbles: true }));
      event.preventDefault();
      return;
    }

    if (target instanceof HTMLElement && target.isContentEditable) {
      const selection = window.getSelection();
      if (!selection || selection.rangeCount === 0) return;

      const range = selection.getRangeAt(0);
      range.deleteContents();
      const textNode = document.createTextNode(text);
      range.insertNode(textNode);
      range.setStartAfter(textNode);
      range.collapse(true);
      selection.removeAllRanges();
      selection.addRange(range);

      target.dispatchEvent(new Event('input', { bubbles: true }));
      event.preventDefault();
    }
  };

  const registerTextInsertionShortcut = (combo: string, insertion: string) => {
    useRegisterShortcut({
      scope,
      combo,
      allowInInputs: true,
      priority: 100,
      handler: (event) => insertTextAtSelection(event, insertion),
    });
  };

  registerTextInsertionShortcut('alt+d', '• ');
  registerTextInsertionShortcut('alt+y', '✅ ');
  registerTextInsertionShortcut('alt+n', '❌ ');

  // Arrow Key Navigation (ArrowUp/ArrowDown for task reordering)
  // Register handlers that check for Alt key in the event
  useRegisterShortcut({
    scope,
    match: (event) => {
      const key = event.key.toLowerCase();
      return (key === 'arrowup' || key === 'arrowdown') && !event.ctrlKey && !event.shiftKey && !event.metaKey;
    },
    allowInInputs: false,
    priority: 50,
    throttleMs: 200, // Throttle arrow keys to prevent rapid-fire
    handler: (event) => {
      const key = event.key.toLowerCase();
      if (key === 'arrowup' && onMoveSelectionUp) {
        onMoveSelectionUp({ alt: event.altKey });
      } else if (key === 'arrowdown' && onMoveSelectionDown) {
        onMoveSelectionDown({ alt: event.altKey });
      }
    },
  });

  // Entity Modal Shortcuts (Ctrl + Key) - only when not in inputs
  useRegisterShortcut({
    scope,
    combo: 'ctrl+t',
    allowInInputs: false,
    priority: 30,
    handler: () => {
      if (onOpenTaskModal) onOpenTaskModal();
    },
  });

  useRegisterShortcut({
    scope,
    combo: 'ctrl+i',
    allowInInputs: false,
    priority: 30,
    handler: () => {
      if (onOpenItemModal) onOpenItemModal();
    },
  });

  useRegisterShortcut({
    scope,
    combo: 'ctrl+f',
    allowInInputs: false,
    priority: 30,
    handler: () => {
      if (onOpenFinancialModal) onOpenFinancialModal();
    },
  });

  useRegisterShortcut({
    scope,
    combo: 'ctrl+m',
    allowInInputs: false,
    priority: 30,
    handler: () => {
      if (onOpenSiteModal) onOpenSiteModal();
    },
  });

  useRegisterShortcut({
    scope,
    combo: 'ctrl+r',
    allowInInputs: false,
    priority: 30,
    handler: () => {
      if (onOpenCharacterModal) onOpenCharacterModal();
    },
  });

  useRegisterShortcut({
    scope,
    combo: 'ctrl+p',
    allowInInputs: false,
    priority: 30,
    handler: () => {
      if (onOpenPlayerModal) onOpenPlayerModal();
    },
  });

  // Sales Modal Shortcut (Shift + Ctrl + S)
  useRegisterShortcut({
    scope,
    combo: 'ctrl+shift+s',
    allowInInputs: false,
    priority: 30,
    handler: () => {
      if (onOpenSalesModal) onOpenSalesModal();
    },
  });

  // Section Navigation Shortcuts (Alt + Key) - global scope only
  useRegisterShortcut({
    scope: GLOBAL_SCOPE,
    combo: 'alt+t',
    allowInInputs: false,
    priority: 20,
    handler: () => {
      if (onNavigateToControlRoom) onNavigateToControlRoom();
    },
  });

  useRegisterShortcut({
    scope: GLOBAL_SCOPE,
    combo: 'alt+i',
    allowInInputs: false,
    priority: 20,
    handler: () => {
      if (onNavigateToInventory) onNavigateToInventory();
    },
  });

  useRegisterShortcut({
    scope: GLOBAL_SCOPE,
    combo: 'alt+f',
    allowInInputs: false,
    priority: 20,
    handler: () => {
      if (onNavigateToFinances) onNavigateToFinances();
    },
  });

  useRegisterShortcut({
    scope: GLOBAL_SCOPE,
    combo: 'alt+s',
    allowInInputs: false,
    priority: 20,
    handler: () => {
      if (onNavigateToSales) onNavigateToSales();
    },
  });

  useRegisterShortcut({
    scope: GLOBAL_SCOPE,
    combo: 'alt+m',
    allowInInputs: false,
    priority: 20,
    handler: () => {
      if (onNavigateToMap) onNavigateToMap();
    },
  });

  useRegisterShortcut({
    scope: GLOBAL_SCOPE,
    combo: 'alt+p',
    allowInInputs: false,
    priority: 20,
    handler: () => {
      if (onNavigateToPlayer) onNavigateToPlayer();
    },
  });

  useRegisterShortcut({
    scope: GLOBAL_SCOPE,
    combo: 'alt+r',
    allowInInputs: false,
    priority: 20,
    handler: () => {
      if (onNavigateToPersonas) onNavigateToPersonas();
    },
  });

  useRegisterShortcut({
    scope: GLOBAL_SCOPE,
    combo: 'alt+e',
    allowInInputs: false,
    priority: 20,
    handler: () => {
      if (onNavigateToSettings) onNavigateToSettings();
    },
  });
}

// Helper function to show keyboard shortcuts help
export function showKeyboardShortcutsHelp() {
  const shortcuts = [
    '=== ENTITY MODALS ===',
    'Ctrl + T = Tasks Modal',
    'Ctrl + I = Items Modal', 
    'Ctrl + F = Financials Modal',
    'Ctrl + S = Sales Modal',
    'Ctrl + M = Sites Modal',
    'Ctrl + R = Personas Modal',
    'Ctrl + P = Players Modal',
    '',
    '=== SECTION NAVIGATION ===',
    'Alt + T = Control Room Section',
    'Alt + I = Inventory Section',
    'Alt + F = Finances Section',
    'Alt + S = Sales Section',
    'Alt + M = Map Section',
    'Alt + P = Player Section',
    'Alt + R = Personas Section (Roles)',
    'Alt + E = Settings Section',
    '',
    '=== TEXT INPUT ===',
    'Alt + D = Insert bullet character (•)',
    'Alt + Y = Insert check mark (✅)',
    'Alt + N = Insert cross mark (❌)',
    '',
    '=== TASK REORDERING ===',
    '↑ / ↓ = Move selected task up/down (within siblings)',
    'Alt + ↑ / Alt + ↓ = Reparent task to previous/next parent',
  ];

  alert(shortcuts.join('\n'));
}
