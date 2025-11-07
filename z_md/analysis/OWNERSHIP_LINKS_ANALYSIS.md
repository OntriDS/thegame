# Ownership Links — Analysis and Roadmap

Date: 2025-11-06
Status: Proposal and Plan
Owner: THEGAME Links System

## Executive Summary

- Items and Sites must support multiple character owners.
- Ownership relationships should be represented via canonical, unidirectional links:
  - ITEM_CHARACTER (Item → Character)
  - SITE_CHARACTER (Site → Character)
- Reverse links (CHARACTER_ITEM, CHARACTER_SITE) are semantically equivalent at query time and must not be created if the canonical link exists (to prevent duplicates).
- Site creation/editing should allow setting owners (just like Item owner), and Character views should include “Owned Items” and “Owned Sites” tabs.
- For legacy compatibility, Item has `ownerCharacterId` (primary owner). We will keep this as optional “primary owner” while enabling multi-owner via Links.

## Detailed Analysis

### Current State (Verified)

- Items
  - Field: `ownerCharacterId?: string | null` (primary owner)
  - Workflow: `processItemEffects` creates ITEM_CHARACTER link when `ownerCharacterId` is set and appends character log (OWNS_ITEM).
  - Limitation: Only one direct owner via field; multiple owners require manual link creation elsewhere (limited UI).

- Sites
  - No `ownerCharacterId` field.
  - Link types exist: `SITE_CHARACTER` (canonical), `CHARACTER_SITE` (reverse).
  - `processLinkEntity` notes Sites are link targets only; no owner link creation is wired from Site save.
  - Limitation: No way to set Site owner directly in Site modal; ownership links must be created elsewhere.

- Directionality Policy (Docs)
  - Already specifies canonical unidirectional links and equivalence at query-time.
  - Needs explicit examples for Site ownership and “do not create both edges” guidance.

### Requirements

1) Multi-Owner Support
   - Items can be owned by many Characters.
   - Sites can be owned by many Characters.
   - Canonical links only; prevent reverse duplicates.

2) Site Owner UX
   - Site modal should allow selecting one or more owners (using existing Character selector submodal).
   - Creating/updating Site should synthesize SITE_CHARACTER links.

3) Character Ownership Views
   - Character UI: “Owned Items” and “Owned Sites” panels/tabs using link queries.
   - Query via `getLinksFor({ type: CHARACTER, id })` and filter by `CHARACTER_ITEM`/`CHARACTER_SITE` (reverse query on canonical SITE_CHARACTER/ITEM_CHARACTER works too).

4) Consistency & Safety
   - Idempotent link creation (no duplicates).
   - Validation: Do not allow creating reverse duplicates for the same pair.
   - Logging: Append concise ownership logs (OWNS_ITEM, OWNS_SITE) on the character side only.

### Design Decisions

- Canonical link types:
  - Item ownership: `ITEM_CHARACTER` (Item → Character)
  - Site ownership: `SITE_CHARACTER` (Site → Character)

- Reverse link types remain query-semantic equivalents, not created by workflows to avoid duplication.

- Item `ownerCharacterId` remains as optional “primary owner” for convenience and backward-compat. Multi-owner achieved via additional `ITEM_CHARACTER` links.

### Data Flow

- Create/Update Item with `ownerCharacterId`:
  - `processItemEffects` → ensure single `ITEM_CHARACTER` link to that character (dedupe), remove old owner link if `ownerCharacterId` cleared.

- Create/Update Site with `ownerCharacterId` (NEW) and/or selected owners:
  - `processSiteEffects` (NEW) → create `SITE_CHARACTER` links for selected owners; remove when cleared.

- Character ownership views:
  - Use `getLinksFor` and filter on link types; resolve targets to show owned Items/Sites lists.

## Roadmap (Action Items)

1) Entity & Workflow Wiring
- Add `ownerCharacterId?: string | null` to `Site` (primary owner).
- Implement `processSiteEffects(site)`:
  - Create/delete `SITE_CHARACTER` links based on `ownerCharacterId`.
  - Idempotency: check existing links before creating; remove when cleared.
  - Append `OWNS_SITE` log on the character entity when created.

2) Site Modal UX
- Add “Owner” selector (reuse `owner-character-selector-submodal`).
- Display current owner name; allow clearing.

3) Multi-Owner Support (Phase 2)
- Enhance Site modal to manage multiple owners:
  - Add Owners list with “Add Owner” button (Character selector) and remove controls.
  - Internally create/remove `SITE_CHARACTER` links for each owner.

- Enhance Item modal for multiple owners (optional phase):
  - Keep `ownerCharacterId` as primary; add “Additional Owners” list using links.

4) Validation & Idempotency
- Ensure `link-validation` prevents reverse duplicates:
  - If `SITE_CHARACTER` exists for (siteId, characterId), block `CHARACTER_SITE` creation of same pair (and vice versa).
- Add tests for duplicate prevention and idempotent `processSiteEffects`/`processItemEffects`.

5) Character UI
- Character modal/page:
  - Add “Ownership” tab with two panels: Owned Items, Owned Sites.
  - Use `getLinksFor({ type: CHARACTER, id })`; filter and resolve targets; paginate if needed.

6) Documentation
- Update `ROSSETTA_STONE_LINKS_SYSTEM.md` and `rosetta-stone-links-system-compact.md`:
  - Explicit examples for Item/Site ownership canonical links.
  - Clarify “do not create both directions” with concrete do/don’t lists and examples.

## Risks & Mitigations

- Duplicate links: Mitigate via `getLinksFor` dedupe checks and link validation rules.
- Legacy assumptions on single owner: Keep `ownerCharacterId` as primary while enabling multiple via links to avoid breaking existing flows.
- UI complexity for multiple owners: Phase in multi-owner UI after single-owner flow works; reuse existing character selector.

## Success Criteria

- Items/Sites can have multiple owners via links; UI supports selection.
- No reverse duplicate links; link graphs remain clean.
- Character views correctly display owned Items and Sites.
- Documentation clearly communicates canonical link policy with examples.


