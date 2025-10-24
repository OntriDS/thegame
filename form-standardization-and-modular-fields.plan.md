<!-- 8c6f6c2d-b8c6-4a8d-9c1d-0d9b1f6f3a0b -->
## Form Standardization and Modular Field Groups Plan

### Principles Alignment
- Modularity: Encapsulate related fields into reusable subcomponents.
- DRY: Centralize form state wiring and validation patterns.
- Unified Patterns: Same save/validation/loading UX across all modals.
- Smart Simplification: Reduce boilerplate without sacrificing clarity or control.

### Current Patterns (Snapshot)
- Individual field states dominate (items, tasks, characters, sites, sales).
- Financials uses a single `formData` object with many related fields.
- Task mixes both (small `formData` for sites + individual fields) → inconsistent.

### Options Compared

1) Individual Field States (per-field `useState`)
- Pros: Simple mental model; fine-grained re-renders; easy field validation; great TS inference; aligns with current codebase.
- Cons: Lots of boilerplate; harder full-form reset; related field sync requires extra code.

2) Single Object State (one `formData` / `useState` or `useReducer`)
- Pros: One source of truth; easy resets; validate whole-form; good for complex, interdependent fields (e.g., Financials).
- Cons: Re-render on any field change unless carefully optimized; slightly heavier TS; different than most modals today.

3) Best-of-Both via a Form Model Hook (recommended)
- Core idea: Store one object in state (via `useReducer`), but expose ergonomic, per-field binders so components feel like individual fields with minimal boilerplate.
- Pros: DRY, modular, predictable; easy resets; central validation; per-field ergonomics; future-proof for modular field groups; consistent UX.
- Cons: Small abstraction to learn; initial hook creation required.

### Recommendation
Adopt a standardized Form Model pattern implemented as a small hook and utility types, then migrate modals incrementally.

### Hook API Proposal
```ts
// lib/hooks/use-form-model.ts (new)
export type FieldBinder<T> = {
  value: T;
  onChange: (v: T) => void;
};

export type FormBind<TForm> = <K extends keyof TForm>(key: K) => FieldBinder<TForm[K]>;

export interface UseFormModelResult<TForm> {
  form: TForm;                 // current object state
  set: <K extends keyof TForm>(key: K, value: TForm[K]) => void;
  bind: FormBind<TForm>;       // convenient binder for inputs
  reset: (next?: Partial<TForm>) => void;
  isDirty: boolean;
  validate: () => string[];    // returns list of validation messages (empty = valid)
}

export function useFormModel<TForm>(initial: TForm, validate?: (f: TForm) => string[]): UseFormModelResult<TForm> {
  // Internally implement with useReducer to get predictable updates and easy partial sets.
  // Memoize binders to avoid extra renders.
  // Track isDirty by comparing to an initial snapshot.
  // Keep the surface small, predictable, and typed.
}
```

Usage in a modal (example):
```ts
type ItemForm = {
  name: string;
  description: string;
  price: number;
  // ...
};

const { form, bind, set, reset, validate, isDirty } = useFormModel<ItemForm>({
  name: '',
  description: '',
  price: 0,
});

// In JSX
<Input {...bind('name')} />
<Textarea {...bind('description')} />
<NumberInput {...bind('price')} />
```

This gives the ergonomics of per-field state with a single underlying form object for DRY resets, validation, and submission.

### Modular Field Groups (Diplomatic Fields)
Create reusable, composable subcomponents for repeated domain patterns. Each accepts a `bind` function and any needed context IDs.

Examples:
- DiplomaticFields.Identity: `name`, `description`.
- DiplomaticFields.SiteMovement: `site`, `targetSite`.
- DiplomaticFields.Counterparty: `customerCharacterId`, `counterpartyName` (+ selector modal wiring).
- DiplomaticFields.Points: `points.{xp,rp,fp,hp}` (with numeric and string sync if needed).
- DiplomaticFields.ItemSelection: product selection and quantity.
- DiplomaticFields.TaskSelection: service selection and task data.

Contract sketch:
```ts
type Bind = FormBind<any>;

interface DiplomaticFieldsProps {
  bind: Bind;
  // optional context props, e.g. lists, loaders, permissions
}

function IdentityFields({ bind }: DiplomaticFieldsProps) {
  return (
    <>
      <Input {...bind('name')} />
      <Textarea {...bind('description')} />
    </>
  );
}
```

### Validation and UX Standards (keep as-is, universally)
- `isSaving` guard in every modal to prevent double submit.
- Disabled Save when required fields missing:
  - tasks: `!name.trim()`
  - character: `!name.trim()`
  - item: `!name.trim()`
  - financial: `!name.trim()` (form key may be `form.name` after migration)
  - site: `!name.trim()`
  - sales: at least one product (item) OR service (task)
- Save button label: `Saving...` while `isSaving`, otherwise `Create/Update <Entity>`.
- Cancel disabled while `isSaving`.
- `await onSave(entity)` then `dispatchEntityUpdated(kind)` then close.

### Migration Strategy (Incremental, Low-Risk)
1) Introduce `useFormModel` hook (no modal changes yet).
2) Convert one modal end-to-end (suggest: SiteModal) to de-risk the pattern.
3) Extract first Diplomatic field group (`Identity`), adopt in two modals (Site, Character).
4) Convert Items, Tasks, Sales to `useFormModel` progressively; replace local `useState` with `useFormModel` + `bind`.
5) Convert Financials last (already closest to object form) by swapping its internal `formData` to `useFormModel` for unified API.
6) Create a short style guide: how to add a new field group, validation rules, and event dispatching order.

### Risk and Mitigation
- Render performance: memoize binders; keep field groups pure; avoid recreating `bind` per render with `useCallback` inside hook.
- Type drift: define shared `Form` types per entity in `types/`.
- Over-abstraction: keep hook API small; avoid heavy libs unless needed.
- Rollback: each modal migrates independently; easy to pause.

### Minimal Code We’ll Need (tomorrow)
1) `lib/hooks/use-form-model.ts` (new) with reducer-based implementation and memoized `bind`.
2) `components/diplomatic-fields/IdentityFields.tsx` (new) as first example group.
3) Convert one pilot modal (SiteModal or CharacterModal) to prove the pattern.

### Decision
- Short term: proceed with the Best-of-Both pattern (Form Model hook + per-field binders).
- Medium term: extract Diplomatic field groups used across entities.
- Long term: all modals use `useFormModel`; Financials migrates to the same API, preserving its complex form benefits.

### Open Questions
- Do we want a small validation schema layer (e.g., per-form sync function) now, or defer? (We can start with imperative `validate` function; add Zod later if desired.)
- Naming for the field groups: `DiplomaticFields.*` vs `EntityFields.*`?

### Ready Checklist for Tomorrow
- [ ] Implement `useFormModel` hook
- [ ] Create `IdentityFields` group
- [ ] Pilot migrate `SiteModal` to `useFormModel`
- [ ] Validate UX parity (`isSaving`, disabled rules, labels)
- [ ] Document pattern in `z_md/THEGAME_WIKI.md` or a new README in `components/diplomatic-fields/`



