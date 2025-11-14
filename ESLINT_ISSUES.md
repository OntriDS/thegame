# ESLint Issues Tracking

This file tracks remaining ESLint warnings and documents the fixes applied to prior errors. Use it to plan incremental cleanup without blocking builds.

## Fixed Errors

- React quotes/apostrophes escaping
  - `components/modals/submodals/cascade-status-confirmation-submodal.tsx` lines 99–121: Escaped `"..."` to `&quot;...&quot;` (components/modals/submodals/cascade-status-confirmation-submodal.tsx:99).
  - `components/modals/modals-tabs/player-progression-tab.tsx` lines 88 and 239: Escaped apostrophes to `&apos;` (components/modals/modals-tabs/player-progression-tab.tsx:88, components/modals/modals-tabs/player-progression-tab.tsx:239).
  - `components/modals/site-modal.tsx` lines 269 and 485: Escaped `"None"` to `&quot;None&quot;` (components/modals/site-modal.tsx:269, components/modals/site-modal.tsx:485).

- Rules of Hooks
  - `lib/hooks/use-keyboard-shortcuts.ts`: Removed hook calls inside non-hook functions; registered shortcuts via top-level hook calls instead (lib/hooks/use-keyboard-shortcuts.ts:82–95).
  - `lib/hooks/use-entity-updates.ts`: Rewrote `useMultipleEntityUpdates` to attach event listeners inside a single `useEffect` instead of calling hooks in a loop (lib/hooks/use-entity-updates.ts:59–74).

- Invalid ESLint rule reference
  - `lib/client-api.ts`: Removed invalid `eslint-disable @typescript-eslint/ban-ts-comment` (lib/client-api.ts:1012–1015).

- Exhaustive deps: missing dependencies
  - `components/modals/submodals/character-inventory-submodal.tsx`: Memoized `loadInventory` with `useCallback` and moved effect after declaration (components/modals/submodals/character-inventory-submodal.tsx:89–93).
  - `components/modals/submodals/owner-submodal.tsx`: Memoized `loadData` with `useCallback` and moved effect after declaration (components/modals/submodals/owner-submodal.tsx:46–51, 88).

## Remaining Warnings (from latest build)

- `react-hooks/exhaustive-deps`
  - `app/admin/dashboards/page.tsx:111:6` useCallback with unnecessary dep `refreshKey`.
  - `app/admin/finances/page.tsx:258:6` useCallback with unnecessary dep `refreshKey`.
  - `app/admin/research/page.tsx:218:6` useEffect missing deps `getPreference`, `setPreference`.
  - `components/control-room/control-room.tsx:265:6` useCallback unnecessary dep `refreshKey`.
  - `components/data-center/player-log-tab.tsx:114:6` useEffect missing dep `sourceNameCache`.
  - `components/inventory/inventory-display.tsx:99:6` useEffect missing dep `loadItems`.
  - `components/inventory/inventory-display.tsx:125:6` useEffect missing dep `getPreference`.
  - `components/inventory/inventory-display.tsx:191:6` useEffect missing dep `getPreference`.
  - `components/modals/financials-modal.tsx:315:6` useEffect missing dep `getLastUsedStation`.
  - `components/modals/item-modal.tsx:375:6` useCallback unnecessary dep `dispatchEntityUpdated`.
  - `components/modals/item-modal.tsx:491:6` useCallback unnecessary dep `onOpenChange`.
  - `components/modals/item-modal.tsx:621:6` useEffect missing deps `defaultItemType`, `getLastUsedStation`.

## Recommendations

- Prefer `useCallback` only when a function is passed as a prop or used in a dependency-sensitive effect; otherwise a plain function is fine.
- When `react-hooks/exhaustive-deps` flags “unnecessary dependency”: remove values that don’t affect rendering. E.g., `refreshKey` if only used to trigger reloads.
- For missing dependencies:
  - Include stable functions like `getPreference`, `setPreference` if they come from hooks, or wrap them in `useCallback` and include the callback.
  - For derived constants like `defaultItemType`, compute inside the effect or include them in the dependency array.
- Consider adopting `eslint-config-next/core-web-vitals` and `eslint-config-next/typescript` (already in `eslint.config.mjs`) and `eslint-config-prettier` to avoid style-rule conflicts.
- Note: Current TypeScript is `5.9.3`. `@typescript-eslint/typescript-estree` warns for versions `>=4.7.4 <5.5.0`. Monitor for parser updates or pin TS to a supported range if warnings become noisy.

## Status

- Build: passing
- Lint: passing with warnings