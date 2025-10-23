## Executive Summary

We observed submodals appearing behind their parent modals despite higher z-index values. Root cause is stacking context confinement caused by the modal overlay/content trees created by the dialog library (Radix) and our mixed layering taxonomy (MODAL_TABS vs INNER_MODALS vs DROPDOWNS). Some submodals worked only when assigned DROPDOWNS, which was an accidental fix due to a higher numeric layer and, in certain cases, different portal mounting.

This plan unifies the z-index system into a single, predictable scale and removes mixed categories. Elevate submodals to SUB_MODALS with guaranteed higher z-index than their parents. We also ensure submodals are independent components mounted at the document portal root to avoid parent stacking contexts.

## Root Cause Analysis

- Stacking Contexts: The parent dialog/overlay forms its own stacking context. Children cannot escape this regardless of z-index if mounted under the same context tree.
- Mixed Taxonomy: Coexistence of `MODAL_TABS`, `INNER_MODALS`, and `DROPDOWNS` led to inconsistent application and confusion. Some components used `DROPDOWNS` (500) to overpower parents rather than using a dedicated submodal layer.
- Inconsistent Mounting: Some submodals may be mounted inside the parent modal subtree rather than a top-level portal, amplifying stacking issues.

## New Unified Z-Index Layers

- BASE: 0
- SUBTABS: 100 (tabs at parent sections)
- MODALS: 200 (first-level modals - includes fields and tabs within modals)
- INNER_FIELDS: 300 (reserved for special cases above modals but below submodals - not used regularly)
- SUB_MODALS: 400 (submodals; mounted as independent components via Portal)
- SUPRA_FIELDS: 500 (dropdowns, popovers, calendar, over-fields UI)
- TOOLTIPS: 600
- NOTIFICATIONS: 800
- CRITICAL: 1000
- DRAG: 1500
- MAX: 9999

## Implementation Strategy

1) Constants Update (backward-compatible):
   - Update `Z_INDEX_LAYERS` to the new mapping.
   - Provide temporary aliases: `MODAL_TABS -> INNER_FIELDS`, `INNER_MODALS -> INNER_FIELDS`, `DROPDOWNS -> SUPRA_FIELDS` to avoid breakage during migration.

2) Utils Update:
   - Keep `getZIndexClass`, `getZIndexValue`, and helpers intact.
   - Add deprecated helper aliases returning the new layers to support existing code during transition.

3) Component Migration:
   - Ensure all submodals are defined as independent components and rendered with their own `Dialog` at app root (Radix Portal) — not nested under parent modal content.
   - Replace usages:
     - `MODAL_TABS` and `INNER_MODALS` -> `MODALS` (fields and tabs stay at modal level)
     - `DROPDOWNS` -> `SUPRA_FIELDS`
     - Confirm primary modals use `MODALS` (200) and submodals use `SUB_MODALS` (400).
     - Keep `INNER_FIELDS` (300) as fallback for special edge cases only.

4) CSS/Portal Verification:
   - Validate `components/ui/dialog.tsx` uses `Dialog.Portal` for overlay/content so each dialog mounts at document body.
   - For submodals triggered from modals, render them as siblings (not children) in React tree if necessary, or rely on Portal correctly.

5) Tests and Linting:
   - Open all main modals and submodals to verify stacking visually.
   - Run lints and fix any type or import issues.

## Rollout Plan

- Phase 1: constants + utils with aliasing.
- Phase 2: migrate high-traffic modals (player, sales, item, site).
- Phase 3: migrate remaining submodals.
- Phase 4: remove deprecated aliases after verification.

## Success Criteria

- Any submodal renders above its parent modal without resorting to CRITICAL.
- Dropdowns/popovers within modals render above fields consistently using SUPRA_FIELDS.
- Modal fields and tabs stay at MODALS level (200) for proper hierarchy.
- No regressions in keyboard focus or overlay interactions.

## Notes on Radix Stacking

Radix Dialog mounts overlay/content into a Portal. If subdialogs are also Portaled, z-index alone determines order as long as both are siblings under `body`. If a submodal is included inside a parent modal's content tree but still uses a Portal, it will mount to `body` and not be constrained — z-index will apply correctly. Problems arise if custom wrappers impose transforms/positioning that create unexpected stacking contexts with lower z-index.


