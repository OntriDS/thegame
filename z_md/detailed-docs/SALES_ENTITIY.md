# Sales Architecture • Entity, Effects, Links, and Roadmap (v0.1 → vNext)

────────────────────────────────────────

## TABLE OF CONTENTS

- Overview
- Core Principles
- Minimal Schema (Typescript)
- Effects, Sales Log, Links & Idempotency
- Reconciliation & Restocking (as Tasks)
- Dates Discipline
- Logging Mapping (five logs)
- UI/Adapter Pattern Compliance
- Direct Sale (Service) Flow v0.1
- Implementation Roadmap
- Future Directions & Status

────────────────────────────────────────

## Overview

Sales is a first-class entity that records business transactions across multiple contexts: feria, direct, consignment, bundle sales, online, NFT, gifts, and exchanges. It integrates with the unified entities architecture and “Best of Both Worlds” logging: append-only logs with an effects registry for idempotency.

New in this version:
- Sales Log: Dedicated append-only log for Sales lifecycle.
- Links System: Typed edges between entities with rule-driven propagation and anti-duplication.

────────────────────────────────────────

## Core Principles

- Separation of Concerns (Modal → Parent → DataStore → Adapter → API → Workflows)
- Append-only logs; effects registry prevents duplicates
- Idempotent effects keyed by sale/line and month
- Dates are explicit, never overwritten; logs reflect the correct event timestamp
- Extensible line model: item, bundle, service
- Party splits are important but deferred for a dedicated design pass

Logs-as-Source-of-Truth (exploratory):
- Long-term: Logs are the authoritative audit trail; UI composes current views by folding logs.
- Near-term: Keep KV/local entities + append-only logs; evaluate per-tab log-folding read models.

Effects & Links:
- Effects executed by the entity that owns the action; Links coordinate prompts/propagation.
- EffectsRegistry keys may include link context to avoid duplicates across chained entities.

────────────────────────────────────────

## Minimal Schema (TypeScript)

```ts
// Enums
export enum SaleType {
  FERIA = 'FERIA',
  DIRECT = 'DIRECT',
  CONSIGNMENT = 'CONSIGNMENT',
  BUNDLE_SALE = 'BUNDLE_SALE',
  ONLINE = 'ONLINE',
  NFT = 'NFT',
  GIFT = 'GIFT',
  EXCHANGE = 'EXCHANGE',
}

export enum SaleStatus {
  PENDING = 'PENDING',
  POSTED = 'POSTED',
  DONE = 'DONE',
  CANCELLED = 'CANCELLED',
}

export enum PaymentMethod {
  CASH = 'CASH',
  CARD = 'CARD',
  TRANSFER = 'TRANSFER',
  BTC = 'BTC',
  CRC = 'CRC',
  OTHER = 'OTHER',
  EXCHANGE = 'EXCHANGE',
}

// Shared types
type Discount = {
  amount?: number;   // e.g., $5 off
  percent?: number;  // e.g., 10 (%). Mutually exclusive with amount.
};

type Payment = {
  method: PaymentMethod;
  amount: number;
  // For Exchange only
  exchangedFor?: string;
  valueExchanged?: number;
  createLinkedRecord?: boolean; // OFF by default
  exchangedStation?: Station;
  exchangedCategory?: Category;
  receivedAt?: Date;
};

// Base for sale lines
type SaleLineBase = {
  lineId: string;
  kind: 'item' | 'bundle' | 'service';
  description?: string;
  taxAmount?: number;
  discount?: Discount;
};

// Precise item sale: reference exact inventory item
type ItemSaleLine = SaleLineBase & {
  kind: 'item';
  itemId: string;
  quantity: number;
  unitPrice: number;
};

// Bundle sale: consume by model
type BundleSaleLine = SaleLineBase & {
  kind: 'bundle';
  itemType: ItemType;
  subItemType?: SubItemType;
  siteId: string;
  quantity: number;
  unitPrice: number;
};

// Service sale: optional Task creation
type ServiceLine = SaleLineBase & {
  kind: 'service';
  station: Station;
  category: Category;
  revenue: number;
  createTask?: boolean;
};

export type SaleLine = ItemSaleLine | BundleSaleLine | ServiceLine;

// Main Sale entity
export interface Sale extends BaseEntity {
  saleDate: Date;
  type: SaleType;
  status: SaleStatus;
  siteId: string;
  counterpartyName?: string;
  isNotPaid?: boolean;
  isNotCharged?: boolean;
  overallDiscount?: Discount;
  lines: SaleLine[];
  payments?: Payment[];
  totals: {
    subtotal: number;
    discountTotal: number;
    taxTotal: number;
    totalRevenue: number;
  };
  postedAt?: Date;
  doneAt?: Date;
  cancelledAt?: Date;
  requiresReconciliation?: boolean;
  reconciliationTaskId?: string;
  requiresRestock?: boolean;
  restockTaskId?: string;
  createdTaskId?: string;
}
```

────────────────────────────────────────

## Effects, Sales Log, Links & Idempotency

Trigger points:
- POSTED → apply effects once; DONE → finalize; CANCELLED → rollback.

Effects
- Inventory
  - Item lines: decrement stock; increment `quantitySold`; set `SOLD` when appropriate; items-log per affected item.
  - Bundle lines: consume by model at `siteId`; items-log per affected item.
- Financials
  - Append-only financials-log entries.
  - For Exchange with Link Record ON: create FinancialRecord(cost=valueExchanged, revenue=0) at chosen Station/Category.
- Player
  - Optional points → player-log.
- Tasks
  - Service lines can create a Task; tasks-log ('created').

Sales Log (new)
- Channel: sales-log (append-only).
- Events: sale_created, sale_linked_task, sale_linked_item, exchange_linked_record, sale_updated, sale_done, sale_cancelled.
- Entry: `{ saleId, status, occurredAt, data: { links:[], payments:[], totalsSnapshot } }`.

Links System (new)
- Edge: `{ id, linkType, source:{type,id}, target:{type,id}, createdAt, metadata }`.
- Initial types: SALE_TASK, SALE_ITEM, SALE_FINREC, TASK_ITEM, FINREC_ITEM.
- Rules:
  - Prevent double effects (resolve link chain + EffectsRegistry checks).
  - Cascades: delete TASK → delete created ITEM (existing); delete SALE → no auto-delete, optional prompt.
  - Conflicts: actions on linked entities prompt canonical propagation (e.g., mark sale paid / task done).

Idempotency keys (EffectsRegistry)
- `saleApplied` (per sale)
- `stockDecremented:<lineId>`
- `financialLogged:<YYYY-MM>`
- `pointsLogged:<YYYY-MM>`
- `taskCreated`

Rollback on CANCELLED: append-only reversal entries and clear relevant flags.

────────────────────────────────────────

## Reconciliation & Restocking (as Tasks)

- Not Sale statuses. They are recurrent Tasks tied to one or many Sales.
- Reconciliation completion: appends settlement to financials-log; does not change Sale status.
- Restock completion: may create Task or Record for movements; Sale can store a link id.

────────────────────────────────────────

## Dates Discipline

- Keep distinct fields: `saleDate`, `postedAt`, `doneAt`, `cancelledAt`.
- Logs carry `occurredAt`; use unified date utilities.

────────────────────────────────────────

## Logging Mapping (five logs)

- sales-log: Sale lifecycle + link events + exchange linkage.
- tasks-log: Task creation/updates/completions.
- items-log: Item creation/updates/moves/sales.
- financials-log: `sale_revenue`, `exchange_linked_record`, etc.
- player-log: Points when applicable.

All logs are append-only.

────────────────────────────────────────

## UI/Adapter Pattern Compliance

- Modal → Parent → DataStore → Adapter → API → Workflows (unchanged).
- KV-only system (dev): mirrors server behavior; dispatches UI events.
- KV-only system (prod): `/api/sales`; KV as source of truth; cache & UI events.
- Workflows: `sale-workflows.ts` orchestrates with EffectsRegistry + Links.

────────────────────────────────────────

## Direct Sale (Service) Flow v0.1

- Tab 1 (What): Service (Task). Set Station/Category/Site/Target Site/Due Date. Task Cost/Revenue = task economics.
- Tab 2 (Capture): Minimal in v0.1 for service.
- Tab 3 (Payments): Exchange fields (Exchanged for, Value exchanged). Link Record toggle OFF by default; when ON, show Station/Category (no defaults; pulled from enums).

On Save:
- Create Sale → sales-log: sale_created.
- Create Task (Created; cost/revenue as entered) → Link SALE_TASK → sales-log: sale_linked_task.
- If Exchange + Link Record ON → create FinancialRecord(cost=valueExchanged, revenue=0) with chosen Station/Category → Link SALE_FINREC → sales-log: exchange_linked_record.
- EffectsRegistry prevents duplicates across links.

Later: Marking Task Done appends sale_done in sales-log (if linked) without duplicating financial effects.

────────────────────────────────────────

## Implementation Roadmap

0) Reality sync
- Confirm enums and UI reflect PaymentMethod.EXCHANGE.
- Remove legacy bundle dispatch; ensure bundle lines use item model consumption.

1) Sales Modal v0.1
- Three rows: What/When; Where; Who/How Much.
- Payments tab: Exchange fields + Link Record toggle OFF by default.

2) Workflows (`lib/workflows/sale-workflows.ts`)
- Implement Links helpers: `createLink`, `getLinksFor`, `removeLinksFor`.
- Append to sales-log on sale/task/link events.
- For Exchange + Link Record → create FinancialRecord and link SALE_FINREC.
- EffectsRegistry keys include link context where needed.

3) Adapters & API
- KV-only system: add sales-log channel (KV) + LoggingDataStore support.
- Add Links registry (localStorage/KV) with minimal helpers.

4) Guardrails & prompts (stubs)
- Rules stub: when acting on ITEM/TASK that is linked, prompt appropriate propagation (no heavy UI yet; safe skips via EffectsRegistry).

5) QA & Docs
- Update THEGAME_WIKI with patterns; verify exchange flows; confirm no double logging.

────────────────────────────────────────

## Future Directions & Status

- Item Sales (Direct / Bundle) with SALE_ITEM and optional FINREC_ITEM linkages.
- Player as Entity (first-class logs + links to tasks/records/sales).
- Logs-as-Source-of-Truth experiments; fold logs into read models per section.
- DRY UI: NumericInput for all numbers; date pickers stable; SearchableSelect everywhere.

Status: Foundation approved; v0.1 Service flow implemented in UI; next is workflows/logging/links.


