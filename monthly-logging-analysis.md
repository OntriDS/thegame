# Monthly Logging & Archive Analysis

## Executive Summary

This analysis investigates the current state of the "Month Close", "Archive", and "Logging" systems. 
**Key Findings:**
1.  **Critical Data Mismatch**: There is a divergence in how Archived Items are stored. The API and Datastore use the key `archive:item:MM-YY`, while the Snapshot Workflow uses `archive:item-snapshots:MM-YY`. This causes inconsistency where some items appear in the Archive Summary but may not appear in other views, or vice versa.
2.  **"Open Box" Confusion**: The "Open Box" button in the Archive UI lacks a direct visual feedback mechanism (it selects the month but doesn't auto-scroll or change view mode), and the default view is "Tasks". If a month has Items but no Tasks, opening the box appears to "do nothing" until the user manually switches tabs.
3.  **Sold Items Visibility**: Sold items are indexed by month. The Inventory "Sold Items" view defaults to the *current month*. If items were sold in a previous month, they will not appear unless the filter is adjusted.
4.  **Manual Workflow Gap**: There is currently no unified "Month Close" process. Logs, Archives, and Entity Collection are handled piecemeal.

## Detailed Analysis

### 1. The Archive Key Mismatch (Bug)

*   **Reader (`datastore.ts`)**: `getArchivedItemsByMonth` queries `EntityType.ITEM` (`'item'`).
*   **Writer 1 (`app/api/archive/items`)**: Uses `archiveItemSnapshot` from `datastore.ts`, which writes to `'item'`.
*   **Writer 2 (`snapshot-workflows.ts`)**: `createItemSnapshot` writes to `'item-snapshots'`.
*   **Impact**: Items archived via the API (e.g., Bulk Import) are visible in the Archive Summary. Items archived via the "Manual Sold" workflow are **invisible** to the Archive page.
*   **Fix**: Standardize on `EntityType.ITEM` (`'item'`) across all workflows.

### 2. Archive UI Experience

*   **Observation**: The "Open Box" button in `ArchiveMonthTabs` has no specific `onClick` handler; it relies on the parent Card's click event.
*   **Behavior**: Clicking it sets the `activeMonthKey`. The `MonthBoxTabs` component renders below the grid.
*   **Issue**: If the user clicks "Open Box" for a month that has **0 Tasks** but **3 Items**, the `MonthBoxTabs` renders the "Tasks" tab by default (which is empty). The user sees "No data" and assumes the button didn't work.
*   **Recommendation**: 
    *   Add a smooth scroll to the `MonthBoxTabs` section upon selection.
    *   Auto-select the tab with the most data, or show a summary dashboard first.

### 3. Sold Items & Collection Logic

*   **Current State**: 
    *   `InventoryDisplay` queries the Active Index (`index:item:by-month`).
    *   Items are NOT removed from the Active Index when Sold or Collected (unless explicitly deleted).
*   **User Observation**: "Inventories Sold Items there is nothing there".
*   **Cause**: The view defaults to the current month (Nov 2025). If the items were sold in Oct 2025, they won't show.
*   **Archive vs. Active**: The user notes items are in Archive. This implies they were successfully snapshotted (likely via API import given the "3 items" match the Archive Summary).

### 4. Logging System

*   **Current State**: Logs are active in `logs:{entity}`.
*   **Rotation**: `rotateEntityLogsToMonth` exists but is not triggered automatically.
*   **Missing**: No export to physical JSON files.

---

## Revised Month Close & Collection Workflow

Based on the user's feedback, the "Month Close" is not just a single button, but a **workflow** triggered when entities are marked as **COLLECTED** (or **SOLD** for Items).

### 1. The "Collection" Workflow (Per Entity)

This workflow triggers when a user manually marks an entity as `COLLECTED` (or when an Item is `SOLD`).

#### A. Tasks
*   **Trigger**: User marks a `DONE` task as `COLLECTED`.
*   **Action**:
    1.  **Snapshot**: Create `TaskSnapshot` in Archive (`archive:task-snapshots:MM-YY`).
    2.  **Move**: Remove from the Active Task Tree (KV `tasks`).
    3.  **Archive Storage**: Store in a new "Task History" storage (KV `archive:tasks` or similar) to be visualized in a future "Roadmap/Tree" view.
    4.  **Log**: Append `COLLECTED` event to Task Log.

#### B. Items
*   **Trigger**: Item status changes to `SOLD` (via Sale or Manual).
*   **Note**: Items do not generate points themselves; Sales do.
*   **Action**:
    1.  **Snapshot**: Create `ItemSnapshot` in Archive (`archive:item-snapshots:MM-YY`).
    2.  **View**: Item appears in "Sold Items" tab (filtered by month).
    3.  **Log**: Append `SOLD` event to Item Log.

#### C. Sales & Financials
*   **Trigger**: User marks a `CHARGED` Sale or `DONE` Financial Record as `COLLECTED`.
*   **Action**:
    1.  **Snapshot**: Create `SaleSnapshot` / `FinancialSnapshot` in Archive.
    2.  **View**: Entities **remain** in their respective Monthly Views (Sales/Finances pages), but are visually marked/locked as Collected.
    3.  **Log**: Append `COLLECTED` event to their respective Logs.

### 2. The "Month Close" Process (System Level)

Once the user has "Collected" the relevant entities for the month, the **Manual Month Close Script** is executed to finalize the period.

*   **Goal**: Rotate logs and generate physical backups.
*   **Steps**:
    1.  **Log Rotation**:
        *   Iterate through all Entity Logs (`logs:{entity}`).
        *   Move entries for the target month to `logs:{entity}:{MM-YY}`.
    2.  **Physical Export (The "Box")**:
        *   Fetch all Snapshots for the month (Tasks, Items, Sales, Financials).
        *   Fetch the rotated Monthly Logs.
        *   Generate JSON files in `logs-entities/archive/{MM-YY}/`.
        *   Generate `manifest.md` summary.

### 3. Entity Collection & Month Close Comparison Matrix

The following table clarifies the specific behavior for each entity type during the "Collection" phase (User Trigger) and the "Month Close" phase (System Script).

| Feature | **Tasks** | **Items** | **Sales** | **Financials** |
| :--- | :--- | :--- | :--- | :--- |
| **Trigger Event** | User marks `DONE` task as `COLLECTED` | Status changes to `SOLD` (via Sale or Manual) | User marks `CHARGED` sale as `COLLECTED` | User marks `DONE` record as `COLLECTED` |
| **Snapshot Created?** | **Yes** (`TaskSnapshot`) | **Yes** (`ItemSnapshot`) | **Yes** (`SaleSnapshot`) | **Yes** (`FinancialSnapshot`) |
| **Active State Action** | **Removed** from Active Task Tree | **Removed** from Active Inventory (Stock=0) | **Locked** (Status = `COLLECTED`) | **Locked** (Status = `COLLECTED`) |
| **Visual Location** | Moves to "Task History" / Archive View | Moves to "Sold Items" Tab | Stays in Monthly Sales View (Read-Only) | Stays in Monthly Finances View (Read-Only) |
| **Log Event** | `COLLECTED` | `SOLD` | `COLLECTED` | `COLLECTED` |
| **Month Close Action** | Log Rotation + JSON Export | Log Rotation + JSON Export | Log Rotation + JSON Export | Log Rotation + JSON Export |
| **Archive Key (KV)** | `archive:task-snapshots:MM-YY` | `archive:item-snapshots:MM-YY` | `archive:sale-snapshots:MM-YY` | `archive:financial-snapshots:MM-YY` |

### 4. Gap Analysis & Next Steps

To achieve this, we need to implement:

1.  **Fix Archive Key Bug**: Ensure `ItemSnapshot` uses the consistent key `EntityType.ITEM` (or standardizes on `item-snapshots`) so they appear in the Archive UI.
2.  **Task Collection Logic**: Implement the "Move to History" logic (removing from active `tasks` KV to prevent cluttering the active tree).
3.  **Manual Close Script**: The script that performs the Log Rotation and JSON Export.

## Immediate Action Plan

1.  **Standardize Archive Keys**: Fix `snapshot-workflows.ts` to align with the Reader's expectations.
2.  **Implement `manual-month-close.ts`**: Create the script for Log Rotation and File Export.
3.  **Verify Collection Flows**: Manually test the "Collection" flow for one of each entity to ensure Snapshots are created correctly.
