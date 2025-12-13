# Booth Sales & Partnerships: Architecture Plan V2

## 1. Core Terminology Updates

We are shifting terminology to be precise and avoid collision with existing entities.

| Old Term | **New Term** | Reason |
| :--- | :--- | :--- |
| Feria Sales | **Booth Sales** | Cleaner, more professional naming. |
| Settlement (in this context) | **Sales Distribution** | "Settlement" is already a distinct Financial Entity. This is just a calculation of splits. |
| Partner | **Associate** | More formal role definition. |
| Dashboard | **Sales View** | It's not a dashboard, it's a specific Sales Interface. |

---

## 2. The New Architecture: Finance Infra-Entities

We are avoiding the "Links System" for this core logic to keep it robust and explicit. We will introduce **Infra-Entities** under the **Finances** domain.

### 🏛 New Entity: `LegalEntity` (Finance Infra)
Represents the "Business Identity" of a person or organizations.
*   **Purpose**: To separate the *Persona* (Character) from the *Business* (Tax/Legal).
*   **Connections**:
    *   Linked to a **Site** (e.g., "Ecosystem").
    *   Linked to a **Character** (e.g., Akiles/Founder).
*   **Example 1**: `Ecosystem` (Legal Entity) ↔ `HQ` (Site) ↔ `Akiles` (Character).
*   **Example 2**: `O2 Jewelry` (Legal Entity) ↔ `Maria` (Character).

### 📜 New Entity: `LegalEntity` (Character Infra)
Represents the tax/legal identity of a connect (Company, Individual, DAO).
*   **Type**: Character Infra-Entity.
*   **Links**: Linked to a `Character` (the persona) and/or `Site` (the HQ).

### 📜 New Entity: `Contract` (Finance Infra)
Represents the formal agreement between two `LegalEntities`.
*   **Type**: Finance Infra-Entity.
*   **Parties**:
    *   **Principal**: The Company (me).
    *   **Counterparty**: The Associate (her).
*   **Terms (Clauses & Sliding Bars)**:
    *   Defines specific rules for different categories (e.g., "Jewelry", "Stickers", "Booth Fee").
    *   Each clause has a "Sliding Bar" split (Company vs Associate).
    *   **Example 1**: "Commission" -> 75% Us / 25% Them. // They Sell our Products
    *   **Example 2**: "Commission" -> 25% Us / 75% Them. // We Sell their Products
    *   **Example 3**: "Booth Expenses" -> 50% Us / 50% Them.

---

## 3. The Workflow: "Booth Sales"

### Step 1: Configuration (The Setup)
*   User goes to `Finances > Partnerships` (New Tab).
*   Creates **Legal Entities** if they don't exist.
*   Creates a **Contract** linking *My Entity* and *Associate's Entity*.
*   Defines the **Split Rules** in the Contract.

### Step 2: operational Flow (The Sale)
1.  **Open Booth Sales**: The user opens the specialized Sales View.
2.  **Select Associate**: User selects "Maria" (filtered by Associate Badge).
3.  **System Action**:
    *   Finds the active `Contract` between Me and Maria.
    *   Loads the Terms (75/25 & 25/75).
4.  **Entry & Calculation**:
    *   User enters "Associate Item" (e.g., Jewelry).
    *   System applies **Associate Product Rule**: 75% to Maria, 25% to Me.
    *   User enters "My Item" (sold by her).
    *   System applies **Principal Product Rule**: 75% to Me, 25% to Maria.
5.  **Finalize**:
    *   The "Distribution" is shown (not "Settlement").
    *   User confirms.
    *   System generates:
        *   `Sale` entity (for the transaction).
        *   `FinancialRecords` (if immediate payment).
        *   Updates Inventory.

---

## 4. Implementation Stages

### Phase A: Architecture & Data Modeling (The Foundation)
1.  **Legal Entity**: Define the model and "Manage Legal Entities" UI.
2.  **Contract**: Define the `Contract` model and "Partnerships" UI.
3.  **Migration**: Ensure existing Characters (Akiles, Maria) are linked to these new structures.

### Phase B: Booth Sales UI Refactor
1.  **Rename**: `FeriaSalesDashboard` -> `BoothSalesView`.
2.  **Logic Swap**: Replace `settlementMatrix` with `SalesDistributionMatrix`.
3.  **Integration**: precise "Associate Selector" that only shows Characters with active Contracts.


