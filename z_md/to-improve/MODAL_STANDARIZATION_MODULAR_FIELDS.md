# Form Standardization and Modular Fields Plan

## The Original Problem

The user asked: "why is this different? Financials: Must have formData.name (trimmed) the form data?"

This revealed an inconsistency in form state management patterns across modals:

- **Individual State Pattern**: `ItemModal`, `TaskModal`, `CharacterModal`, `SiteModal`, `PlayerModal`
  - Each field has its own `useState`
  - Simple and direct
  - Easy to understand
  - Good for simple forms

- **FormData Object Pattern**: `FinancialsModal`, `SalesModal`
  - All fields grouped in a single `formData` object
  - More complex but organized
  - Better for complex forms with many fields
  - Easier to pass around

## The Deeper Vision

The user wants to create a modular system where:
- Fields belong to their own self-contained components
- Users can choose which modules/fields an entity uses
- The system could potentially be used by other people
- Follows diplomatic fields pattern for modularity

## The "Best of Both Worlds" Solution

### Option 1: Individual Fields (Current Simple Pattern)
```typescript
const [name, setName] = useState('');
const [description, setDescription] = useState('');
const [price, setPrice] = useState(0);
```

**Pros:**
- Simple and direct
- Easy to understand
- Good for simple forms
- Easy to add/remove fields

**Cons:**
- Repetitive
- Hard to pass around
- No validation grouping
- Hard to reset all fields

### Option 2: FormData Object (Current Complex Pattern)
```typescript
const [formData, setFormData] = useState({
  name: '',
  description: '',
  price: 0
});
```

**Pros:**
- Organized
- Easy to pass around
- Good for complex forms
- Easy to reset all fields

**Cons:**
- More complex
- Harder to understand
- Not as modular
- Hard to add/remove fields

### Option 3: Hybrid Architecture (Proposed Solution)

Create a `useFormModel` hook that provides both patterns:

```typescript
// useFormModel: one form object, per-field ergonomics
type FieldBinder<T> = { value: T; onChange: (v: T) => void; };
type FormBind<TForm> = <K extends keyof TForm>(key: K) => FieldBinder<TForm[K]>;

function useFormModel<TForm>(initial: TForm, validate?: (f: TForm) => string[]) {
  const [form, setForm] = useState(initial);
  const [errors, setErrors] = useState<string[]>([]);
  
  const set = <K extends keyof TForm>(key: K, value: TForm[K]) => {
    setForm(prev => ({ ...prev, [key]: value }));
  };
  
  const bind = <K extends keyof TForm>(key: K): FieldBinder<TForm[K]> => ({
    value: form[key],
    onChange: (value: TForm[K]) => set(key, value)
  });
  
  const reset = () => setForm(initial);
  
  const isDirty = JSON.stringify(form) !== JSON.stringify(initial);
  
  const validateForm = () => {
    const newErrors = validate ? validate(form) : [];
    setErrors(newErrors);
    return newErrors.length === 0;
  };
  
  return { form, set, bind, reset, isDirty, validate: validateForm, errors };
}
```

## Implementation Strategy

### Phase 1: Create the Hook
1. Create `lib/hooks/use-form-model.ts`
2. Add TypeScript types for field binders
3. Add validation support
4. Add dirty state tracking

### Phase 2: Create Field Group Components
1. Create `components/forms/field-groups/identity-fields.tsx`
2. Create `components/forms/field-groups/diplomatic-fields.tsx`
3. Create `components/forms/field-groups/financial-fields.tsx`
4. Each group uses `useFormModel` internally

### Phase 3: Migrate Modals
1. Start with `SiteModal` (simplest)
2. Replace individual `useState` with `useFormModel`
3. Use field group components
4. Test thoroughly

### Phase 4: Roll Out
1. Migrate `ItemModal`
2. Migrate `TaskModal`
3. Migrate `CharacterModal`
4. Migrate `FinancialsModal`
5. Migrate `SalesModal`
6. Migrate `PlayerModal`

## Benefits of This Approach

1. **Modularity**: Fields can be grouped into reusable components
2. **Consistency**: All modals use the same pattern
3. **Flexibility**: Can use individual fields or grouped fields
4. **Maintainability**: Changes to form logic happen in one place
5. **Reusability**: Field groups can be used across different modals
6. **Type Safety**: Full TypeScript support
7. **Validation**: Built-in validation support
8. **State Management**: Handles dirty state, reset, etc.

## Example Usage

```typescript
// In a modal
const { form, bind, validate, isDirty } = useFormModel({
  name: '',
  description: '',
  price: 0
}, (form) => {
  const errors = [];
  if (!form.name.trim()) errors.push('Name is required');
  if (form.price < 0) errors.push('Price must be positive');
  return errors;
});

// In JSX
<IdentityFields
  name={bind('name')}
  description={bind('description')}
/>
<FinancialFields
  price={bind('price')}
  currency={bind('currency')}
/>
```

## Conclusion

This hybrid approach gives us:
- The simplicity of individual fields
- The organization of formData objects
- The modularity of field groups
- The consistency of a unified pattern
- The flexibility to choose the right approach for each modal

It's the "best of both worlds" solution that addresses the user's vision of modular, reusable field components while maintaining the simplicity and consistency they want.

## Status

**Ready for Implementation** - This plan provides a clear path forward for standardizing form state management while enabling the modular field system the user envisions.

**Next Steps:**
1. Implement `useFormModel` hook
2. Create first field group component
3. Pilot with `SiteModal`
4. Roll out incrementally

**Estimated Effort:** 2-3 days for full implementation
**Risk Level:** Low - incremental changes, backward compatible
**Value:** High - enables modular field system, improves consistency
