## Executive Summary

- Items already support a single owner via `ownerCharacterId` + `ITEM_CHARACTER` links. Sites have no owner field and currently do not create any links on save.
- The Link System defines both `SITE_CHARACTER` and `CHARACTER_SITE` link types, but current implementation avoids creating links on site save, leading to missing site↔character relationships from the Site side.
- The docs partially state a “unidirectional canonical type” policy (avoid duplicating both directions) and that `getLinksFor()` is bidirectional in query semantics. Code and docs are inconsistent here.
- Plan: (1) Standardize ownership links as a single canonical direction per relationship, (2) implement Site owners with the same pattern as Items, (3) keep many-to-many ownership exclusively through Links, and (4) update docs to clearly define the unidirectional/canonical rule and equivalence of “SITE_CHARACTER vs CHARACTER_SITE” at the query level.


## Detailed Analysis

### System Architecture
- Entities are pure; relationships are modeled via Links (The Rosetta Stone). Workflows inspect entity properties (Ambassador fields) and create links.
- Items: `ownerCharacterId` Ambassador field generates `ITEM_CHARACTER` links in `links/links-workflows.ts` (processItemEffects). This supports 1-to-1 “primary owner” from the Item entity, with possibility to add more owners through Links UI (many-to-many via Links).
- Sites: `types/entities.ts` defines `Site` without `ownerCharacterId`. `links/links-workflows.ts` explicitly states “Sites don't create links when saved” (no `processSiteEffects`), so there is no ownership link creation from Site save, even though `SITE_CHARACTER` / `CHARACTER_SITE` link types exist.

### Data Integrity
- Items ownership is modeled in two ways: (1) primary owner via `ownerCharacterId`, (2) secondary owners via explicit `ITEM_CHARACTER` links added through Links UI. This is consistent and flexible.
- Sites lack a parallel “owner” control surface: there is no `ownerCharacterId`, no link creation on save, and no clear canonical direction. This prevents consistent owner modeling for Sites.

### Business Logic
- Ownership is inherently many-to-many: multiple characters can co-own an Item or a Site. The Link System already supports this through additional links even if the entity stores a single primary owner field for convenience.
- Canonical direction rule: The compact doc states “single link type per relationship; `getLinksFor()` searches source and target so bidirectional duplicates are redundant.” Current code defines both `SITE_CHARACTER` and `CHARACTER_SITE` and rule tables for each, which can lead to duplicate links if both are created by different flows.

### Performance
- Using a single canonical link type per relationship avoids duplication, simplifies validation, reduces link count and complexity, and improves query performance (less deduping required).

### User Experience
- Site modal currently lacks a way to assign an owner (unlike Items). Adding a familiar Owner selector (reuse `owner-character-selector-submodal`) will align the UX.
- For Characters, showing “Owned Items” and “Owned Sites” is straightforward once links exist. We can introduce a “Ownership” tab in the Character-related submodal using queries over Links.

### Security
- No new security concerns. The plan stays within the KV + Links API structure and reuses existing workflows. Link creation remains controlled by workflows and API routes already in place.

### Technical Debt
- Docs vs code mismatch about unidirectional canonical policy and Sites processing. We will reconcile docs, then code.


## Roadmap (Actionable Steps)

1) Documentation Alignment (Unidirectional Canonical Rule)
- Update `z_md/ROSSETTA_STONE_LINKS_SYSTEM.md` and `.cursor/rosetta-stone-links-system-compact.md` to make explicit:
  - “Links are semantically unidirectional but queried bidirectionally; `getLinksFor()` searches both source and target.”
  - “We select ONE canonical link type per relationship to avoid duplicates. The other ‘reverse’ type is considered legacy/auxiliary and should not be created by workflows for the same relationship.”
  - “`SITE_CHARACTER` and `CHARACTER_SITE` are semantically equivalent at query-time. We will standardize on `SITE_CHARACTER` for Site→Character ownership links (canonical), and avoid creating `CHARACTER_SITE` for the same ownership relationship.”
  - Keep existing reverse types around for backward compatibility and historical logs, but do not create both for the same pair.

2) Site Ownership (Parity with Items)
- Add `ownerCharacterId?: string | null` to `Site` in `types/entities.ts` as an optional Ambassador field (primary owner convenience).
- Implement `processSiteEffects(site)` in `links/links-workflows.ts`:
  - If `site.ownerCharacterId` present → create canonical `SITE_CHARACTER` link.
  - If removed → remove existing `SITE_CHARACTER` links created by ownership.
  - Append appropriate character-side ownership log event (e.g., `OWNS_SITE`) similar to `OWNS_ITEM` for Items.
- Call `processLinkEntity(site, 'site')` in `workflows/entities-workflows/site.workflow.ts` after save (same pattern as other entities).

3) Many-to-Many Ownership (Items and Sites)
- Keep `ownerCharacterId` as primary owner for Items and Sites (fast UI). Additional co-owners should be added via Links UI (extra `ITEM_CHARACTER` or `SITE_CHARACTER` links). This supports many-to-many without schema explosion.
- In the future, we can add a multi-select owner control that writes additional Links directly (optional).

4) UI Enhancements
- Site Modal: Add “Owner” selector reusing `owner-character-selector-submodal` (as with Items).
- Character “Ownership” View: In Character submodal, add a tab with two sections, “Owned Items” and “Owned Sites,” by querying Links for `CHARACTER_ITEM` and `CHARACTER_SITE` (or via `getLinksFor()` with entity=Character and filtering target types).

5) Validation & Rules
- Update Link Rules docs to indicate only canonical type will be created for a given relationship (e.g., ownership). Keep reverse rules defined for legacy support but do not create reverse links for the same edge.
- Link validation should reject creating a reverse duplicate if a canonical link already exists for the same pair and semantic relation.

6) Rollout Plan
- Step 1 (Docs): Update the two Rosetta Stone docs to reflect canonical, unidirectional link policy and ownership semantics.
- Step 2 (Code - Small): Add `ownerCharacterId` to `Site`, implement `processSiteEffects`, wire `processLinkEntity(site)` on upsert.
- Step 3 (UI - Small): Add Owner selector to `site-modal.tsx` (parity with Items).
- Step 4 (UI - Medium): Add Character Ownership tab (Owned Items/Sites) reusing Links querying.
- Step 5 (Validation - Small): Harden link validation to prevent reverse-duplicate creation for canonical relationships.


## Action Items (Concise)

- Docs: Clarify unidirectional canonical policy; state `SITE_CHARACTER ≡ CHARACTER_SITE` at query-time; specify canonical choice = `SITE_CHARACTER` for ownership.
- Code: Add `ownerCharacterId` to Site; implement `processSiteEffects`; call `processLinkEntity(site)`; add `OWNS_SITE` log event type.
- UI: Add Site Owner selector; add Character Ownership tab (Owned Items, Owned Sites).
- Validation: Prevent reverse duplicate links for canonical relationships.

This plan keeps entities pure, avoids duplicate links, enables many-to-many ownership via Links, and aligns Sites with Items in a consistent, minimal, and extensible way.


