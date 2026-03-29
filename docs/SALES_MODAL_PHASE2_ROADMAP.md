# Sales modal — roadmap (composition / Green–Yellow–Red)

Use this **after** entities, logs, and archive cleanup are stable. Goal: same behavior and `Sale` payloads as today; **structure and ownership** of UI/state become clearer.

## Terminology (no “normal” sale)

| Type | Body today | Notes |
|------|------------|--------|
| **DIRECT** | Large scroll form in `sales-modal.tsx` | Product vs Service; fully implemented |
| **BOOTH** | `components/modals/submodals/booth-sales-view.tsx` | Associate + mixed lines; footer save uses `submitBoothSave` → `onSave(fullSale)` |
| **NETWORK** | Same scroll area as Direct | “Like Direct” until bespoke UX exists |
| **ONLINE**, **NFT** | Header only / stub | Ignore until product asks |

## Target layout (your mockup)

- **Green — Header (shared):** Title, Area, Station, sale-type toggles. Chooses what renders in Yellow.
- **Yellow — Container (swappable):** One component per implemented type, e.g. `DirectSalePanel`, `BoothSalePanel`, `NetworkSalePanel` (Network may wrap or alias Direct).
- **Red — Footer (shared):** Delete, Timeline, Links, Player, Emissaries, Payments, Other Methods, Status, Cancel, **Create/Update Sale**. Must call the **active** panel’s save contract (same idea as today’s `boothSaveRef`).

## Preconditions

- Phase 1 merged: type-scoped hydration, `recordedPayments` cleared on sale open, Booth `key`, redundant conflict toasts removed, second init effect skips Booth.
- One branch per migration: do **not** mix this refactor with log/entity migrations in the same PR.

## Implementation sequence (small PRs)

1. **Extract header** — `SalesModalHeader` props: `type`, `setType`, `salesChannel`, `setSalesChannel`, `sale` (for disable rules), children none. No behavior change.
2. **Extract footer** — `SalesModalFooter` props: everything the footer needs today (handlers, `isSaving`, `status`, submodal toggles, `handleSave`). Wire unchanged.
3. **Define save contract** — TypeScript interface, e.g. `SalePanelHandle { submitSave: () => void }` (Booth already matches). Direct/Network: `useImperativeHandle` wrapping existing save build path **or** callback `onRequestSave` lifted from panel to parent (pick one pattern and reuse).
4. **Extract Direct/Network body** — Move the large `else` branch JSX + **only** the state it needs into `DirectSalePanel` (or `DirectNetworkSalePanel` with `type` prop). Parent keeps shared sale fields that both panels need **or** lift everything and pass props (prefer minimal lift to reduce diff).
5. **Router in Yellow** — `switch (type) { case BOOTH: return <BoothSalePanel ref={...} />; case NETWORK: case DIRECT: return <DirectSalePanel />; default: placeholder }`.
6. **ONLINE/NFT** — Empty state or “Coming soon” inside Yellow only; header toggles unchanged if product requires.

## Footgun list

- Changing **order** of effects/hydration when moving state between parent and child.
- Dropping **`key={sale?.id ?? 'new-booth'}`** on Booth when extracting.
- Altering **`Sale` object** shape sent to `onSave` (workflows and logs depend on it).
- Losing **COLLECTED** archive gate before save on Direct path.

## Verification (each PR)

- `npx tsc --noEmit` in `thegame/`
- Manual: create + edit + save **Direct** (product and service), **Booth** (with associate + items + service lines), **Network** if enabled; footer **Update Sale** on each.

## Related files (current)

- `components/modals/sales-modal.tsx` — shell, Direct/Network body, footer, `handleSave` routing
- `components/modals/submodals/booth-sales-view.tsx` — Booth body, `BoothSalesViewHandle.submitBoothSave`

## Reference: Phase 1 goals (done separately)

- Booth: no parent task/emissary hydration from service lines; clear direct drafts on Booth open.
- `setRecordedPayments([])` when `sale` identity changes; extend `resetForm` for new sales.
- Second `useEffect` init: early return for `sale.type === BOOTH`.
- Restore `selectedItemId` effect: skip when `sale.type === BOOTH`.
- Remove two “Conflicting data detected!” blocks; keep empty-sale validation and `canAddLineType` behavior.
- `key={sale?.id ?? 'new-booth'}` on `BoothSalesView`.
