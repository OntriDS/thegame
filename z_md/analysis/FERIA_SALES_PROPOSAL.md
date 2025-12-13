# Feria Sales System Proposal

## 1. Objective
Digitize the current Excel-based "Feria" sales management system into the `SalesModal` while maintaining the flexibility of the current workflow and adding the benefits of integrated inventory tracking.

## 2. Core Concepts
The Feria Sale is unique because it involves:
1.  **Shared Booth**: Two sellers (Akiles & Partner/O2) sharing one space.
2.  **Cross-Commission**: 
    - Akiles earns 75% on his items (Partner keeps 25%).
    - Partner earns 75% on her items (Akiles keeps 25%).
3.  **Complex Settlement**: Needs to calculate payouts in multiple currencies (Colones, USD, BTC) and account for shared expenses (Booth Cost) and delayed payments (Card Sales).
4.  **Inventory Impact**: Needs to deduct sold items from Akiles' inventory (and optionally track Partner's sales).

## 3. UI Proposal
When `SaleType.FERIA` is selected in the `SalesModal`, the UI will transform into a specialized **Feria Dashboard** with three main sections:

### Section A: Setup (Top Bar)
- **Booth Cost (Puesto)**: Input field (e.g., -20,000 colones).
- **Exchange Rate**: Auto-filled or manual override (e.g., 500).
- **Date**: Standard date picker.
- **Site**: Auto-selected to "Feria Sales" (or specific Feria location).

### Section B: The "Cart" (Inventory Input)
Instead of just entering totals, we will use an **Item-Based Input** to ensure inventory accuracy.
- **Mode 1: Detailed Item Entry** (For Akiles' stock)
    - "Add Item" button -> Search & Select specific products (Stickers, Prints, etc.).
    - System automatically categorizes them into rows based on `ItemType`.
- **Mode 2: Quick/Partner Entry** (For O2/Partner stock)
    - "Add Partner Sale" button.
    - Fields: `Amount`, `Currency`, `Category` (e.g., "O2 Jewelry"), `Description`.
    - This allows recording Maria's sales without needing to upload her entire inventory database first.

### Section C: Settlement Matrix (The "Excel" View)
A dynamic table that updates in real-time as items are added.
- **Rows**:
    - *Auto-generated from Cart items*: Artwork/Prints, Stickers, Merch.
    - *Partner Rows*: O2 (aggregated from Quick Entry).
- **Columns**:
    - **Total C** (Colones Cash)
    - **Total $** (USD Cash)
    - **Total Bit** (BTC)
    - **Card (Tarjeta)** (Tracked separately as it's not cash-in-hand yet).
    - **Splits**: Columns showing the calculated 75% / 25% distribution.
- **Summary Footer**:
    - **Maria's Total Payout**: (Her 75% + Her 25% commission) - (Share of Expenses?).
    - **Akiles' Net Income**: (His 75% + His 25% commission) - (Share of Expenses?).
    - **Cash Reconciliation**: "Expected Cash in Box" vs "Actual Cash" (optional inputs).

## 4. Logic & Calculations
The system will run a `FeriaSettlementEngine` on every render:

1.  **Group Items**:
    - Iterate through all selected `SaleLine`s.
    - Group by `Owner` (Akiles vs Partner). *Note: We need a way to flag "Partner Items".*
    - Sub-group by `Category` (Stickers, Prints, etc.).

2.  **Calculate Wrappers**:
    - `Gross Sales` per currency.
    - `Commission` = Gross * 0.25.
    - `Owner Share` = Gross * 0.75.

3.  **Expense Logic (Open Question)**:
    - How is the "Booth Cost" (-20,000) treated?
    - *Option A*: Split 50/50?
    - *Option B*: Proportional to sales?
    - *Option C*: Paid by one person, and the other reimburses half?
    - **Current Assumption**: It's deducted from the "Cash Box" total before the split, or deducted from the Payouts. (Need User Clarification).

## 5. Implementation Steps
1.  **Partner Identity**: Add a simple toggle or "Owner" field to `SaleLine` (or assume specific Categories = Partner). *Proposal: Add "Is Partner Item?" toggle in the Item Submodal for Feria sales.*
2.  **UI Construction**: Build the Grid Layout in `sales-modal.tsx`.
3.  **State Management**: Create a `feriaState` object to hold the matrix values.
4.  **Backend Adaptation**:
    - Ensure `Sale` entity saves the *Aggregate* results (for Financial Records).
    - But keeps `SaleLines` intact (for Inventory tracking).
    - Logic to create the "Commission" financial records automatically upon save.

## 6. Questions for User
1.  **O2 Items**: Do you want to track individual Jewelry pieces (Inventory) or just enter "Sold 50,000 in Jewelry" (Value)?
2.  **Booth Expense**: How exactly do you split the booth cost? (50/50, or does one person pay it all?)
3.  **Card Sales**: When a customer pays by Card, does the money go to *your* bank account or *hers*? (This affects who owes whom). 
