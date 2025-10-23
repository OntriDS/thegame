<!-- f13a6bb5-51fc-4214-aeb2-cb2c54a9c9b9 bbf32abf-1863-4421-815e-c1f9eb818ee6 -->
# Fix NaN - Proper Conversion Rates Architecture

## The Correct Architecture (User-Defined)

### API Routes Structure:
```
/api/conversion-rates/
  ├── player-conversion-rates/route.ts  → getPlayerConversionRates()
  └── financial-conversion-rates/route.ts → getFinancialConversionRates()
```

### DataStore Functions (Rename):
- `getPointsConversionRates()` → **RENAME TO** → `getPlayerConversionRates()`
- `savePointsConversionRates()` → **RENAME TO** → `savePlayerConversionRates()`
- `getConversionRates()` → **RENAME TO** → `getFinancialConversionRates()`
- `saveConversionRates()` → **RENAME TO** → `saveFinancialConversionRates()`

### Purpose:
- **Player Conversion Rates**: Points conversion only (XP, RP, FP, HP → J$ → USD)
- **Financial Conversion Rates**: ALL rates including currency exchange (Colones, Bitcoin, J$)

## Current Incorrect State

### Wrong Route Locations:
- `/api/conversion-rates/route.ts` - Should NOT exist at root level
- `/api/settings/conversion-rates/route.ts` - Wrong location entirely

### Wrong Function Names:
- `getPointsConversionRates()` - Unclear, should be `getPlayerConversionRates()`
- `getConversionRates()` - Too generic, should be `getFinancialConversionRates()`

### Wrong ClientAPI Calls:
- Calling wrong endpoints
- Confusing function names

## Implementation Steps

### STEP 1: Create New API Routes

**Create: `app/api/conversion-rates/player-conversion-rates/route.ts`**
```typescript
import { NextResponse, NextRequest } from 'next/server';
import { requireAdminAuth } from '@/lib/api-auth';
import { getPlayerConversionRates, savePlayerConversionRates } from '@/data-store/datastore';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  if (!(await requireAdminAuth(req))) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const rates = await getPlayerConversionRates();
  return NextResponse.json(rates);
}

export async function POST(req: NextRequest) {
  if (!(await requireAdminAuth(req))) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const body = await req.json();
  await savePlayerConversionRates(body);
  return NextResponse.json({ success: true });
}
```

**Create: `app/api/conversion-rates/financial-conversion-rates/route.ts`**
```typescript
import { NextResponse, NextRequest } from 'next/server';
import { requireAdminAuth } from '@/lib/api-auth';
import { getFinancialConversionRates, saveFinancialConversionRates } from '@/data-store/datastore';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  if (!(await requireAdminAuth(req))) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const rates = await getFinancialConversionRates();
  return NextResponse.json(rates);
}

export async function POST(req: NextRequest) {
  if (!(await requireAdminAuth(req))) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const body = await req.json();
  await saveFinancialConversionRates(body);
  return NextResponse.json({ success: true });
}
```

### STEP 2: Rename DataStore Functions

**File: `data-store/datastore.ts`**

**Lines 342-356 - Rename player conversion rates functions:**
```typescript
// OLD NAME: getPointsConversionRates
// NEW NAME: getPlayerConversionRates
export async function getPlayerConversionRates(): Promise<any> {
  const rates = await kvGet('data:player-conversion-rates');
  return rates || {
    // Points conversion rates (in enum order: XP, RP, FP, HP)
    xpToJ$: 3,
    rpToJ$: 12,
    fpToJ$: 15,
    hpToJ$: 10,
    j$ToUSD: 10
  };
}

// OLD NAME: savePointsConversionRates
// NEW NAME: savePlayerConversionRates
export async function savePlayerConversionRates(rates: any): Promise<void> {
  await kvSet('data:player-conversion-rates', rates);
}
```

**Lines 414-432 - Rename financial conversion rates functions:**
```typescript
// OLD NAME: getConversionRates
// NEW NAME: getFinancialConversionRates
export async function getFinancialConversionRates(): Promise<any> {
  const rates = await kvGet('data:financial-conversion-rates');
  return rates || {
    // Points conversion rates (in enum order: XP, RP, FP, HP)
    xpToJ$: 3,
    rpToJ$: 12,
    fpToJ$: 15,
    hpToJ$: 10,
    // Currency exchange rates
    j$ToUSD: 10,
    colonesToUsd: 500,
    bitcoinToUsd: 100000,
    jungleCoinsToUsd: 0.1
  };
}

// OLD NAME: saveConversionRates
// NEW NAME: saveFinancialConversionRates
export async function saveFinancialConversionRates(rates: any): Promise<void> {
  await kvSet('data:financial-conversion-rates', rates);
}
```

### STEP 3: Update ClientAPI

**File: `lib/client-api.ts` (Lines 358-377)**

Replace the entire CONVERSION RATES section with:
```typescript
// PLAYER CONVERSION RATES (for character/player pages)
getPlayerConversionRates: async (): Promise<any> => {
  const res = await fetch('/api/conversion-rates/player-conversion-rates');
  if (!res.ok) throw new Error('Failed to fetch player conversion rates');
  return await res.json();
},

savePlayerConversionRates: async (rates: any): Promise<void> => {
  const res = await fetch('/api/conversion-rates/player-conversion-rates', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(rates)
  });
  if (!res.ok) throw new Error('Failed to save player conversion rates');
},

// FINANCIAL CONVERSION RATES (for finances/assets pages)
getFinancialConversionRates: async (): Promise<any> => {
  const res = await fetch('/api/conversion-rates/financial-conversion-rates');
  if (!res.ok) throw new Error('Failed to fetch financial conversion rates');
  return await res.json();
},

saveFinancialConversionRates: async (rates: any): Promise<void> => {
  const res = await fetch('/api/conversion-rates/financial-conversion-rates', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(rates)
  });
  if (!res.ok) throw new Error('Failed to save financial conversion rates');
},
```

### STEP 4: Update All Callers

**File: `app/admin/character/page.tsx`**
- Line 57: Change `ClientAPI.getPointsConversionRates()` to `ClientAPI.getPlayerConversionRates()`
- Line 485: Change `ClientAPI.savePointsConversionRates(rates)` to `ClientAPI.savePlayerConversionRates(rates)`

**File: `app/admin/finances/page.tsx`**
- Line 112: Change `ClientAPI.getConversionRates()` to `ClientAPI.getFinancialConversionRates()`
- Line 1165: Change `ClientAPI.saveConversionRates(rates)` to `ClientAPI.saveFinancialConversionRates(rates)`

**File: `components/modals/player-modal.tsx`**
- Line 187: Change `ClientAPI.getPointsConversionRates()` to `ClientAPI.getPlayerConversionRates()`

**File: `components/modals/submodals/conversion-rates-submodal.tsx`**
- Check for any usage and update if needed

### STEP 5: Delete Old Routes

**Delete these files:**
- `app/api/conversion-rates/route.ts`
- `app/api/settings/conversion-rates/route.ts`

### STEP 6: Add NaN Guard (Safety Net)

**File: `lib/utils/financial-utils.ts` line 117**
```typescript
export const formatDecimal = (value: number): string => {
  // Guard against NaN and Infinity
  if (!isFinite(value) || isNaN(value)) {
    return '0';
  }
  if (Number.isInteger(value)) {
    return value.toString();
  } else {
    return Number(value.toFixed(1)).toString();
  }
};
```

## Expected Results

1. ✅ Clear, proper API route structure under `/api/conversion-rates/`
2. ✅ Descriptive function names that indicate purpose
3. ✅ Finances page receives ALL conversion rates (including currency exchange)
4. ✅ No more NaN errors in finances modal
5. ✅ Better code maintainability and clarity
6. ✅ Character page continues to work with player conversion rates

## Why This Architecture Is Better

- **Clear separation of concerns**: Player vs Financial conversion rates
- **Proper folder structure**: Both routes under `/api/conversion-rates/`
- **Descriptive names**: Immediately clear what each function does
- **Type safety**: Each endpoint returns appropriate data for its use case
- **Maintainability**: Easy to understand and modify in the future

### To-dos

- [ ] Create /api/conversion-rates/player-conversion-rates/route.ts
- [ ] Create /api/conversion-rates/financial-conversion-rates/route.ts
- [ ] Rename getPointsConversionRates to getPlayerConversionRates in datastore
- [ ] Rename savePointsConversionRates to savePlayerConversionRates in datastore
- [ ] Rename getConversionRates to getFinancialConversionRates in datastore
- [ ] Rename saveConversionRates to saveFinancialConversionRates in datastore
- [ ] Update ClientAPI with new function names and correct endpoints
- [ ] Update character page to use getPlayerConversionRates (line 57, 485)
- [ ] Update finances page to use getFinancialConversionRates (line 112, 1165)
- [ ] Update player modal to use getPlayerConversionRates (line 187)
- [ ] Delete /api/conversion-rates/route.ts
- [ ] Delete /api/settings/conversion-rates/route.ts
- [ ] Add NaN guard to formatDecimal function in financial-utils.ts
- [ ] Test character page - verify points conversion works
- [ ] Test player modal - verify points conversion works
- [ ] Test finances page - verify exchange rates load and no NaN errors

