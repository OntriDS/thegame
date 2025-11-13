## Executive Summary

- The current finances dashboard aggregates by a single `station` on `FinancialRecord`. This works for production costs (e.g., Production → Stickers) but collapses sales revenue into a single sales station, preventing a clear view of product performance (e.g., Stickers) versus sales channels (e.g., Network Sales).
- A additional finding in the Sale → FinancialRecord flow: the code path currently assigns a default sales station in `createFinancialRecordFromSale()` rather than deriving it from the chosen sales channel. In practice, some financial records may appear under the correct channel (e.g., Network Sales) due to later edits or UI workflows, but the creation logic should never hardcode a station.
- The key issue is that sales financial records are not linked to the specific items sold, while cost records can be linked to created items.
- You need multi-dimensional analytics (by product station, by sales channel, by site, etc.) built from Links (SALE_ITEM, FINREC_ITEM, SALE_FINREC) rather than relying on a single `station` field. Dashboards should pivot on multiple dimensions extracted via links and entity properties instead of overloading `FinancialRecord.station`.

---

## Corrections and clarifications from live usage

- Observed behavior: Financial records for sales can show under “Network Sales.” The creation code still defaults a sales station at creation time, which risks mismatches. We should remove any default/hardcoded assignment and consistently derive the channel from the Sale (or persist a separate `salesChannel` field). This avoids relying on post-creation edits for correctness.

---

## Detailed Analysis

### What you want to see
- Production perspective: “How much did Stickers cost to produce?” (Costs by product station.)
- Sales perspective: “How are Network Sales doing?” (Revenue by sales channel.)
- Product performance: “How are Stickers doing overall?” (Revenue and costs tied to the Item’s station, including bundle sales.)

These are separate axes that should coexist: product category/station (Item), sales channel/station (Sale), and accounting entries (FinancialRecord).

### Current State of the System (with code references)

1) Business structure and station types

```1:26:types/enums.ts
// BUSINESS_STRUCTURE (areas and stations)
export const BUSINESS_STRUCTURE = {
  ADMIN:      [...],
  RESEARCH:   [...],
  DESIGN:     [...],
  PRODUCTION: ['Artworks', 'Murals', 'Prints', 'Stickers', 'Merch', 'Woodworks', 'NFTs'],
  SALES:      ['Direct Sales', 'Feria Sales', 'Network Sales', 'Online Sales', 'Store Sales', 'Marketing', 'Bookings', 'Other Sales'],
  PERSONAL:   [...]
} as const;
// Type exports
export type Area = typeof ALL_AREAS[number];
export type Station = typeof BUSINESS_STRUCTURE[Area][number];
```

2) FinancialRecord definition (single station field)

```307:338:types/entities.ts
export interface FinancialRecord extends BaseEntity {
  year: number;
  month: number;
  station: Station;                 // Main area station (single dimension)
  type: 'company' | 'personal';
  outputItemId?: string | null;
  // Ambassadors (links)
  siteId?: string | null;
  targetSiteId?: string | null;
  customerCharacterId?: string | null;
  playerCharacterId?: string | null;
  sourceTaskId?: string | null;
  sourceSaleId?: string | null;
  // Financial data (source of truth)
  cost: number;
  revenue: number;
  jungleCoins: number;
  // Payment status
  isNotPaid?: boolean;
  isNotCharged?: boolean;
  // Emissary payload for item creation
  outputItemType?: string;
  outputItemSubType?: SubItemType;
  outputQuantity?: number;
  outputUnitCost?: number;
  outputItemName?: string;
  outputItemCollection?: Collection;
  outputItemPrice?: number;
  isNewItem?: boolean;
  isSold?: boolean;
  outputItemStatus?: ItemStatus
}
```

3) Finances dashboard: aggregates strictly by FinancialRecord.station

```203:226:app/admin/finances/page.tsx
const records = await ClientAPI.getFinancialRecords();
const companyRecords = records.filter(...type === 'company');
// Aggregate company records by station
const companyStations = getCompanyAreas().flatMap(area => BUSINESS_STRUCTURE[area]);
const companyBreakdown = aggregateRecordsByStation(companyRecords, companyStations);
// ...
```

```89:115:lib/utils/financial-utils.ts
export function aggregateRecordsByStation(records: FinancialRecord[], stations: readonly Station[]): AreaBreakdown {
  const breakdown: AreaBreakdown = {};
  stations.forEach(station => breakdown[station] = { revenue: 0, cost: 0, net: 0, jungleCoins: 0 });
  records.forEach(record => {
    if (breakdown[record.station]) {
      breakdown[record.station].revenue += record.revenue;
      breakdown[record.station].cost    += record.cost;
      breakdown[record.station].net     += (record.revenue - record.cost);
      breakdown[record.station].jungleCoins += record.jungleCoins;
    }
  });
  return breakdown;
}
```

4) Task → FinancialRecord: uses the Task’s station (good for production costs)

```31:57:workflows/financial-record-utils.ts
const newFinrec: FinancialRecord = {
  // ...
  station: task.station,
  type: getFinancialTypeForStation(task.station),
  sourceTaskId: task.id,
  cost: task.cost || 0,
  revenue: task.revenue || 0,
  // ...
};
```

5) Sale → FinancialRecord: hardcoded station = 'Direct Sales' (problem)

```229:253:workflows/financial-record-utils.ts
const newFinrec: FinancialRecord = {
  // ...
  station: 'Direct Sales' as Station,                  // ← Default assignment (should map from chosen channel)
  type: getFinancialTypeForStation('Direct Sales' as Station),
  siteId: sale.siteId,
  sourceSaleId: sale.id,
  cost: 0,
  revenue: sale.totals.totalRevenue,
  // ...
};
```

6) Links that exist and their implications
- SALE_ITEM: sale lines to items sold

```241:255:links/links-workflows.ts
if (sale.lines && sale.lines.length > 0) {
  for (const line of sale.lines) {
    if (line.kind === 'item' && line.itemId) {
      const l = makeLink(LinkType.SALE_ITEM, { type: EntityType.SALE, id: sale.id }, { type: EntityType.ITEM, id: line.itemId }, { quantity, unitPrice });
      await createLink(l);
    }
  }
}
```

- FINREC_ITEM: financial record to created/tracked item (when emissary fields present)

```309:343:links/links-workflows.ts
if ((fin.outputItemType || fin.outputItemId) && fin.outputQuantity) {
  // remove prior FINREC_ITEM links to avoid duplicates ...
  // resolve createdItem ...
  if (createdItem) {
    const l = makeLink(LinkType.FINREC_ITEM, { type: EntityType.FINANCIAL, id: fin.id }, { type: EntityType.ITEM, id: createdItem.id }, { quantity, unitCost, price, itemType });
    await createLink(l);
  }
}
```

- SALE_FINREC: sale to its revenue financial record

```268:276:workflows/financial-record-utils.ts
const link = makeLink(LinkType.SALE_FINREC, { type: EntityType.SALE, id: sale.id }, { type: EntityType.FINANCIAL, id: createdFinrec.id }, { ... });
await createLink(link);
```

7) Sale station in UI vs persistence
- Sales modal header shows a station selector in UI, but `Sale` entity has no `station` field; the Sale → FinancialRecord flow currently ignores this and uses `'Direct Sales'`.
- Bundle sale logic is not implemented; therefore bundle sales (e.g., Sticker Bundles) do not reduce stock or establish item-level links accordingly.

```180:209:workflows/sale-line-utils.ts
// Bundle processing not yet implemented
export async function processBundleSaleLine(line: BundleSaleLine, sale: Sale): Promise<void> {
  // ...
  console.log(`[processBundleSaleLine] Bundle processing not yet implemented ...`);
}
```

### Where the breakdown occurs
1) Single-dimension aggregation: Financial dashboards read only `FinancialRecord.station`. This conflates accounting category with a single axis and loses the connection to other axes (product station, sales channel, site).
2) Sales station ignored: The Sale → FinancialRecord hardcodes `'Direct Sales'`, so sales do not reflect the selected channel (e.g., Network Sales) unless manually edited later.
3) Missing item linkage for sales financial entries: The revenue FinancialRecord from sales is not linked to the specific items (via FINREC_ITEM). Only SALE_ITEM exists sale→item; the financial record cannot pivot to item dimensions without traversing from sale first.
4) Bundles incomplete: Without bundle processing, revenue attribution to underlying items for bundles is not available, so “Stickers performance” is under-reported or misattributed.

### Consequences
- You can’t see “how Stickers are doing” end-to-end (production cost + all revenue) in one place reliably.
- You can’t evaluate “how Network Sales are doing” reliably if station is overwritten/hardcoded.
- The current finances dashboard over-relies on FinancialRecord.station, which can never encompass multi-dimensional realities.

---

## Station taxonomy: process vs. product

Feedback highlights a conceptual mismatch: Production stations currently list products (Artworks, Murals, Prints, Stickers, Merch, Woodworks, NFTs), but “stations” should represent places where actions are performed (process stations), not product categories.

Recommended approach (non-breaking, incremental):
- Keep product taxonomy in `Item.type` and `subItemType` (already present). Treat this as the “product” dimension.
- Allow “stations” to remain the accounting/process dimension. If we want true process stations (e.g., Sourcing, Printing, Cutting, Assembly, Packaging, Fulfillment), we can:
  - Option A (soft separation): Introduce a derived “productCategory” dimension for analytics (from Item.type/subType) and continue using existing `station` values as-is for accounting, while we gradually evolve station vocabularies.
  - Option B (refactor): Redefine PRODUCTION stations as processes. This is more invasive and requires coordinated UI, workflow, and data migrations.

Short term, Option A yields multi-dimensional insights without schema churn. Dashboards can pivot by:
- Accounting/process station (FinancialRecord.station)
- Product category (Item.type/subType, reachable via FINREC_ITEM and SALE_ITEM links)
- Sales channel (Sale-level channel field)
- Site (Sale.siteId or FinancialRecord.siteId)

---

## Action Items (Design, not implementation)

1) Introduce multi-dimensional analytics using the Links system
- Keep `FinancialRecord.station` purely as the accounting category (company/personal area; a bookkeeping dimension).
- Derive additional dimensions at query time:
  - Product Station: Traverse FINREC_ITEM (for costs) and SALE_ITEM via SALE_FINREC (for revenues) to the `Item`, then use `Item.station` (e.g., Production → Stickers) to group product performance.
  - Sales Channel: Use Sale-level metadata (type or a persisted `salesStation`/channel field) via SALE_FINREC to group revenue by channel (Network Sales, Feria Sales, etc.).
  - Site: Use `FinancialRecord.siteId` and/or `Sale.siteId`.

2) Persist sales channel properly
- Update the Sale → FinancialRecord creation to derive the channel from the chosen sales station or `Sale.type` (never hardcode).
- Prefer adding a dedicated `salesChannel` (or `salesStation`) field on `FinancialRecord`, distinct from `station`. Use `station` for accounting categorization; use `salesChannel` for channel dashboards.
- In the Sales modal, ensure the selected channel is persisted and flows into FinancialRecord.

3) Link revenue financial records to items sold
- When creating the sales-derived FinancialRecord, establish item associations:
  - Option A: Add FINREC_ITEM links for items sold (mirroring how FINREC_ITEM is created for cost records with emissary outputs). This enables direct item-level pivoting from financials without first going through Sale.
  - Option B: At analytics time, traverse SALE_FINREC → SALE_ITEM → ITEM. This avoids mutating link creation but requires richer querying in the dashboard layer.

4) Implement bundle sale processing
- Implement `processBundleSaleLine()` to decrement underlying items and create links, so Sticker Bundles correctly attribute revenue/consumption to Items, enabling accurate item-station reporting.

5) Dashboard architecture
- Create a new “Dashboards” section that supports pivoting by:
  - Station (accounting)
  - Product Station (from Item)
  - Sales Channel (from Sale)
  - Site
  - Time (month/year)
- Provide prebuilt views (tabs):
  - “Production Costs by Product Station” (Item.station via FINREC_ITEM)
  - “Revenue by Sales Channel” (Sale channel via SALE_FINREC)
  - “Product Performance” (join costs and revenues by Item and/or Item.station)
  - “Channel x Product Matrix” (2D breakdown)
 - Migrate the existing “Company Monthly Finances” and “Personal Financials” into this Dashboards section as the first two tabs, then iterate on richer pivots.

6) Minimal changes for immediate correctness
- Fix `createFinancialRecordFromSale()` to:
  - Map the sale’s chosen channel to the right station or persist it as `salesChannel` on FinancialRecord (and stop defaulting).
  - Optionally add FINREC_ITEM links for sold items so that both cost and revenue financial records can pivot to Item-level dimensions directly.

7) Keep entities pure; use Links for relationships
- Do not overload entities with duplicated fields. Leverage Links for multi-entity correlations and perform multi-dimensional grouping in query/aggregation utilities used by dashboards.

---

## User Direction: Separate “Action Stations” from “Product Items”

Requested target model:
- Stations represent actions/processes (e.g., Production: Buy Orders, Making, Dispatches).
- Products live in `Item` (type/subType). Items link to Tasks (for costs) and Sales (for revenues). The UI should present product metrics (Cost, Revenue, Profit, etc.) and channel/action metrics (e.g., Network Sales, Product Orders) without extra manual steps.
- Avoid adding manual product fields in FinancialRecord; creation flows (Task and Sale) should automatically link/create items so analytics derive product dimensions from items.

Implications:
- Redefine PRODUCTION stations away from product names to process stations (Buy Orders, Making, Dispatches, …).
- Maintain product taxonomy in `Item.type` and `subItemType`.
- Dashboards pivot by process station (action), product (type/subtype), sales channel, site, and time.

Proposed non-breaking path:
1) Add process-oriented stations under PRODUCTION (“Buy Orders”, “Making”, “Dispatches”) and plan a migration away from product-named stations.
2) Continue to derive product dimensions from Items and Links for analytics (no new manual field entry in Financials).
3) Build dashboards (not Finances) to show these multi-dimensional pivots cleanly.

Product scope expansion:
- Add new product types as needed: Craft (replacing Woodworks as a product umbrella), NFT, Mural.
- Note: Today, NFT (DigitalSubType.NFT) and Mural (ArtworkSubType.MURAL) already exist as subtypes. Elevating them to ItemType is feasible but impacts UI constants, inventories, and financial buckets (see Verification below).

---

## Proposed Enum and Structure Changes (Design Only)

1) BUSINESS_STRUCTURE (process stations)
- PRODUCTION: replace product-named stations with processes:
  - From: ['Artworks', 'Murals', 'Prints', 'Stickers', 'Merch', 'Woodworks', 'NFTs']
  - To:   ['Buy Orders', 'Making', 'Dispatches']  // extend as needed (e.g., QA, Packaging)
- SALES: keep channels as-is (Direct, Feria, Network, Online, Store, …).

2) Item Types
- Add ItemType.CRAFT. Consider whether NFT and Mural should remain subtypes (preferred) or be elevated to ItemTypes:
  - Preferred (lower impact): Keep NFT under DigitalSubType and Mural under ArtworkSubType.
  - If elevated to ItemType: update all maps (icons, inventory tabs, bucket mappings, modals).

3) FinancialRecord
- Add `salesChannel` (or `salesStation`) distinct from `station` for clarity, or ensure `station` is consistently assigned from the selected channel at creation (no defaults).
- Keep `station` for accounting/process categorization when created from Tasks and in other flows.

4) Workflows
- Task → Item creation remains automatic (emissary), ensuring product data is automatic.
- Sale → FinancialRecord should:
  - Set `salesChannel` (or correct `station`) based on chosen channel.
  - Optionally add FINREC_ITEM links to items in SALE_ITEM lines (or ensure dashboards traverse SALE_FINREC → SALE_ITEM → ITEM).
- Implement bundle line processing (affects stock and link attribution for bundles).

---

## Migration and UX Considerations

- Data backfill:
  - Map existing PRODUCTION records from product-named stations to appropriate process stations, based on Task type or context where possible.
  - Normalize sales finrecs to persist the chosen `salesChannel` or correct station.
- UI changes:
  - Inventory and Item modals unaffected by process-station redefinition (items already carry product taxonomy).
  - Sales modal must persist channel consistently into financials.
  - Dashboards will become the primary place for analytics; move Company/Personal monthly views there and iterate with pivots.

---

## VERIFY: Reality Check Against Code

1) Production stations are product-named (current state)

```9:15:types/enums.ts
export const BUSINESS_STRUCTURE = {
  // ...
  PRODUCTION: ['Artworks', 'Murals', 'Prints', 'Stickers', 'Merch', 'Woodworks', 'NFTs'],
  SALES: ['Direct Sales', 'Feria Sales', 'Network Sales', 'Online Sales', 'Store Sales', 'Marketing', 'Bookings', 'Other Sales'],
}
```

2) Item types and subtypes

```237:252:types/enums.ts
export enum ItemType {
  DIGITAL='Digital', ARTWORK='Artwork', PRINT='Print', STICKER='Sticker', MERCH='Merch',
  BUNDLE='Bundle', MATERIAL='Material', EQUIPMENT='Equipment'
}
```

```322:337:types/enums.ts
export enum DigitalSubType { DIGITAL_ART, DIGITIZATION, ANIMATION, NFT }   // NFT already exists as subType
export enum ArtworkSubType { ACRYLIC_CANVAS, ACRYLIC_WOOD, ASSEMBLAGES, MURAL, FURNITURE_ART } // Mural exists
```

3) Sale → FinancialRecord station assignment (defaulting present)

```229:238:workflows/financial-record-utils.ts
station: 'Direct Sales' as Station,
type: getFinancialTypeForStation('Direct Sales' as Station),
```

4) Sales modal has a “Station” selector in UI, but `Sale` has no `station` field; channel must be derived/persisted explicitly.

```946:967:components/modals/sales-modal.tsx
// UI shows a Station (from SearchableSelect) but entity Sale lacks a station property.
```

5) Finances page aggregates by `FinancialRecord.station` (single dimension)

```218:226:app/admin/finances/page.tsx
const companyBreakdown = aggregateRecordsByStation(companyRecords, companyStations);
```

6) Inventory buckets hardcode ItemType mappings (would need updates if new ItemTypes are added)

```93:101:app/admin/finances/page.tsx
const ITEM_TYPE_TO_BUCKET: Partial<Record<ItemType, keyof InventoryBucketTotals>> = {
  [ItemType.MATERIAL]: 'materials',
  [ItemType.EQUIPMENT]: 'equipment',
  [ItemType.ARTWORK]: 'artworks',
  [ItemType.PRINT]: 'prints',
  [ItemType.STICKER]: 'stickers',
  [ItemType.MERCH]: 'merch',
  [ItemType.DIGITAL]: 'artworks',
  [ItemType.BUNDLE]: 'stickers',
};
```

Conclusion of VERIFY:
- Your requested separation (process stations vs. product items) matches current gaps: PRODUCTION stations are product-like and should be process-like for clarity.
- NFT and Mural already exist as subtypes; elevating them to ItemTypes is possible but touches many mappings (icons, tabs, buckets).
- Sales station/channel should be persisted explicitly; current creation logic uses a default, risking mismatches (even if later edited).
- Dashboards should do multi-dimensional pivots using Links and entity properties rather than relying on `FinancialRecord.station` alone.

---

## Risks and Considerations
- Backfill: Existing sales finrecs with `'Direct Sales'` station will need normalization (infer channel from related Sale or manual correction).
- Query performance: Traversing links to compute dimensions requires optimized utilities and caches (Smart Cache system already exists).
- UX: Ensure the sales modal clearly captures the sales channel and that it persists consistently through to analytics.

---

## Summary of Key Gaps
- Hardcoded station in Sale → FinancialRecord causes misclassification.
- Single-dimension aggregation prevents multi-axis insights.
- Sales finrecs not associated to sold items; bundles not implemented.

---

## Recommended Next Steps (Non-breaking path)
- Phase 1 (Correctness): Fix sale → financial station/channel persistence; implement bundle processing.
- Phase 2 (Analytics): Build link-powered aggregation utilities that compute:
  - Costs by Item.station
  - Revenues by Sale channel
  - Product performance by joining cost and revenue via item links
- Phase 3 (Dashboards): Introduce the new Dashboards section with pivot tabs; move Company/Personal monthly views into Dashboards and keep “Finances” as the accounting entry/edit surface.


