# Financials Architecture - Money Tracking & Digital Economy

## 🎯 Core Understanding: Financial Records as Money Tracking & Digital Assets

Financial Records are the **money tracking system** - they record all cash flow, expenses, revenue, and financial transactions. They provide the financial backbone for the entire system and track both **company and personal finances** as well as **digital assets** (in-game currencies, NFTs, and crypto).

## 🪙 Digital Assets Revolution (V0.2+)

**The Vision**: Transform from fixed "Jungle Coins" to a **flexible digital economy** where users create their own in-game currencies with custom exchange rates.

### **Digital Asset Types**

```typescript
export enum DigitalAssetType {
  ZAP_B = 'zapB',              // Real Bitcoin Zaps (Lightning Network)
  IN_GAME_CURRENCY = 'J$',     // User-defined in-game currency (formerly "Jungle Coins")
  IN_GAME_NFT = 'inGameNFT'    // In-game NFT assets
}
```

### **The Economy Flow (V0.1 → V0.2+ Evolution)**

**V0.1 Current Flow:**
```
User logs in → Player (owns points, stats)
    ↓
Player connected to Character via Account (Triforce link)
    ↓
Player completes Tasks/Sales → earns Points (HP, FP, RP, XP)
    ↓
Player exchanges Points for inGameCurrency (J$)
    ↓
Finances updates J$ in Personal Digital Assets
    ↓
Player, Character, Account all linked to same J$ balance
    ↓
Player decides: Hold J$ OR Exchange for USD
    ↓
Finances = Digital Bank (stores and manages J$)
```

**Key V0.1 Connection:**
- **Personal J$ in Finances** ↔ **Player J$ in Player Modal**
- Both read from `personalAssets.personalJ$` (single source of truth)
- Player Modal displays J$ from Finances (read-only)
- Finances section is where J$ is actually edited/managed
- Account entity links Player ↔ Character ↔ Personal Finances

**V0.2+ Future Flow:**
```
Player earns Points (HP, FP, RP, XP)
    ↓
Exchange Points for inGameCurrency (J$, GemCoins, etc.)
    ↓
Convert J$ to real money ($)
    ↓
Company receives J$ back (buying the coin)
    ↓
Full circular economy
```

### **Key Features (V0.2+)**

- **User-Defined Currencies**: Create custom in-game currencies with names, symbols, exchange rates
- **Dynamic Exchange Rates**: Link to real crypto prices (optional)
- **NFT Integration**: In-game achievements, items, milestones as NFTs
- **Bitcoin Zaps**: Lightning Network integration for instant micro-payments
- **Circular Economy**: J$ flows between player rewards and company buybacks

---

## 🏗️ Financial Record Entity Architecture

### **Player points (policy)**

**Financial records do not award player points.** Lifecycle is **pending vs done** (paid/charged): `onFinancialUpsert` logs `DONE`, may create items from emissary fields, updates J$ wallet cache when applicable — it does **not** call `rewardPointsToPlayer` / `stagePointsForPlayer` / `awardPointsToPlayer`. Gamification points come from **tasks** (and optionally **sales**), not from standalone financial rows. The modal saves with `rewards` cleared; optional `rewards` on the type is legacy/schema compatibility only.

---

### **Base Structure (Extends BaseEntity)**

```typescript
export interface FinancialRecord extends BaseEntity {
  // Time Period
  year: number;                    // 2024, 2025, etc.
  month: number;                   // 1-12 (January = 1)
  
  // Classification
  station: Station;                // ADMIN, DESIGN, PRODUCTION, SALES, PERSONAL
  category: FinancialCategory;     // Company or Personal category
  type: 'company' | 'personal';    // Financial type
  
  // Site Relationships
  siteId?: string | null;          // Site where financial activity occurred
  targetSiteId?: string | null;    // Target site/client
  
  // Financial Data
  cost: number;                    // negative cash impact (what was spent)
  revenue: number;                 // positive cash impact (what was earned)
  
  // Digital Assets (V0.1: jungleCoins only, V0.2+: full digital economy)
  jungleCoins: number;             // Legacy: J$ (in-game currency) - 1 J$ = $10 (configurable in V0.2+)
  digitalAssets?: {                // V0.2+: Full digital asset tracking
    zapB?: number;                 // Real Bitcoin Zaps (Lightning Network)
    inGameCurrency?: {             // User-defined in-game currencies
      [currencyId: string]: number;  // e.g., { "J$": 15, "GemCoin": 100 }
    };
    inGameNFTs?: string[];         // Array of NFT IDs owned
  };
  
  notes?: string;                  // optional notes for the month
  
  // Optional legacy field — not used by financial workflow for points (see policy above)
  rewards?: {
    points?: {
      hp?: number;
      fp?: number;
      rp?: number;
      xp?: number;
    };
  };
  
  // Item Output Data (when financial record creates items)
  outputItemType?: string;
  outputItemSubType?: SubItemType;
  outputQuantity?: number;
  outputUnitCost?: number;
  outputItemName?: string;
  outputItemCollection?: Collection;
  outputItemPrice?: number;
  isNewItem?: boolean;
  isSold?: boolean;
  
  // Calculated Fields
  netCashflow: number;             // revenue - cost
  jungleCoinsValue?: number;       // Jungle Coins in USD equivalent
  
  // Links System
  links: Link[];                   // Relationship tracking
}
```

---

## 📊 Financial Categories & Classification

### **Company Financial Categories**

```typescript
// Business operations
'Business Operations',
'Marketing & Sales',
'Production & Manufacturing',
'Research & Development',
'Administrative',
'Legal & Compliance',
'Technology & IT',
'Facilities & Rent',
'Equipment & Tools',
'Materials & Supplies',
'Professional Services',
'Travel & Transportation',
'Utilities & Communications',
'Insurance & Risk Management',
'Taxes & Fees',
'Investments & Assets',
'Debt & Loans',
'Revenue & Sales',
'Other Income',
'Other Expenses'
```

### **Personal Financial Categories**

```typescript
// Personal finances
'Personal Income',
'Personal Expenses',
'Health & Medical',
'Education & Learning',
'Family & Children',
'Home & Living',
'Transportation',
'Food & Dining',
'Entertainment & Recreation',
'Personal Care',
'Gifts & Donations',
'Savings & Investments',
'Personal Loans',
'Personal Taxes',
'Other Personal'
```

### **Station Classification**

```typescript
export enum Station {
  ADMIN      = 'ADMIN',      // Administrative tasks
  DESIGN     = 'DESIGN',     // Design and creative work
  PRODUCTION = 'PRODUCTION', // Manufacturing and production
  SALES      = 'SALES',      // Sales and marketing
  PERSONAL   = 'PERSONAL'    // Personal activities
}
```

---

## 💰 Financial Data Structure

### **Core Financial Fields**

```typescript
{
  cost: 100,              // What was spent (negative cash impact)
  revenue: 250,           // What was earned (positive cash impact)
  jungleCoins: 15,        // Jungle Coins earned/spent (1 J$ = $10)
  netCashflow: 150,       // revenue - cost (calculated)
  jungleCoinsValue: 150   // Jungle Coins in USD (15 * $10)
}
```

### **Digital Assets System (V0.1 → V0.2+ Evolution)**

**V0.1 (Current): Fixed Jungle Coins**
- **1 Jungle Coin (J$) = $10 USD** (fixed)
- **Conversion Rate**: Hardcoded 10:1
- **Usage**: Reward tokens that convert to USD
- **Tracking**: Single field `jungleCoins`

**V0.2+ (Future): Full Digital Economy**

#### **1. In-Game Currency (J$ and beyond)**
```typescript
interface InGameCurrency {
  id: string;                    // Currency ID (e.g., "J$", "GemCoin")
  name: string;                  // Display name (e.g., "Jungle Coins")
  symbol: string;                // Symbol (e.g., "J$", "💎")
  exchangeRate: number;          // How much USD per 1 unit
  isDynamic: boolean;            // Links to real crypto prices?
  cryptoTicker?: string;         // Optional: "BTC", "ETH" for dynamic pricing
  createdBy: string;             // Player/Company who created it
  totalSupply?: number;          // Max supply (optional)
  circulatingSupply: number;     // Currently in circulation
}
```

**Economy Flow:**
```
Points (HP, FP, RP, XP) 
  → Exchange for J$ (configurable rate, e.g., 100 XP = 1 J$)
    → Convert to USD ($10 per J$, or dynamic)
      → Company buys back J$ (circular economy)
```

#### **2. Bitcoin Zaps (zapB)**
- **Real Bitcoin micro-payments** via Lightning Network
- **Instant transfers** for rewards and payments
- **Tracked separately** from in-game currency
- **Use case**: Real crypto rewards for achievements

#### **3. In-Game NFTs**
- **Achievement NFTs**: Unlock milestones as unique tokens
- **Item NFTs**: Rare items as tradeable assets
- **Ownership tracking**: NFT IDs linked to player/character
- **Future**: Marketplace for trading in-game NFTs

---

## 🔄 Financial Record Lifecycle

### **Creation Workflow**

1. **Record Created** (via Financial Record Modal)
   - User selects year, month, station, category
   - Enters cost, revenue, jungle coins
   - Optionally configures item output

2. **Financial Logging** (automatic)
   - Logs to Financials Log
   - Records financial impact
   - Tracks cash flow

3. **Item Creation** (if output configured)
   - Creates Item entity if `outputItemType` is set
   - Links Record to Item via `FINREC_ITEM` link
   - Updates inventory

### **Monthly Organization**

Financial Records are organized by **Year** and **Month**:

```
2024
├── January (month: 1)
│   ├── Business Operations - $500 cost
│   ├── Marketing & Sales - $200 cost, $1000 revenue
│   └── Personal Income - $3000 revenue
├── February (month: 2)
│   ├── Production & Manufacturing - $800 cost
│   └── Equipment & Tools - $300 cost
└── March (month: 3)
    ├── Revenue & Sales - $2000 revenue
    └── Personal Expenses - $500 cost
```

---

## 🔗 Financial Record Relationships & Links

### **Link Types for Financial Records**

- **`FINREC_ITEM`**: Financial record → item created from emissary output fields
- **`FINREC_SALE`**: Financial record ↔ sale (e.g. sale-sourced finrec)
- **`FINREC_SITE`**: Financial record ↔ site
- **`FINREC_TASK`**: Financial record ↔ task
- **`FINREC_CHARACTER`**: Financial record ↔ character (customer / counterparty relationship — **not** “points earned from finrec”)
- **`FINREC_PLAYER`**: May exist in older data if something used shared points helpers with `sourceType: financial`; **new finrec workflow does not create this for points.**

### **Example Link Creation**

```typescript
// When financial record creates an item
Link {
  linkType: 'FINREC_ITEM',
  source: { type: 'financial', id: recordId },
  target: { type: 'item', id: itemId },
  createdAt: new Date(),
  metadata: {
    quantity: record.outputQuantity,
    unitCost: record.outputUnitCost,
    itemType: record.outputItemType,
    month: record.month,
    year: record.year
  }
}

// When financial record is tied to a character (customer, etc.) — not points
Link {
  linkType: 'FINREC_CHARACTER',
  source: { type: 'financial', id: recordId },
  target: { type: 'character', id: characterId },
  createdAt: new Date(),
  metadata: {
    station: record.station,
    category: record.category,
    month: record.month,
    year: record.year
  }
}
```

---

## 🏭 Item Creation from Financial Records

### **Item Output Configuration**

Financial Records can create Items when they represent purchases or acquisitions:

```typescript
// Financial record configuration for item creation
{
  outputItemType: 'EQUIPMENT',         // Type of item purchased
  outputItemSubType: 'COMPUTER',       // Subtype (if applicable)
  outputQuantity: 1,                   // How many items
  outputUnitCost: 1200,                // Cost per unit
  outputItemName: 'MacBook Pro',       // Item name
  outputItemCollection: 'OFFICE',      // Collection
  outputItemPrice: 1500,               // Potential resale price
  isNewItem: true,                     // Mark as new acquisition
  isSold: false                        // Not sold yet
}
```

### **Purchase vs Revenue Tracking**

```typescript
// Purchase (creates item)
{
  cost: 1200,           // Money spent
  revenue: 0,           // No revenue yet
  outputItemType: 'EQUIPMENT',
  isNewItem: true
}

// Sale (revenue from item)
{
  cost: 0,              // No additional cost
  revenue: 1500,        // Money earned
  outputItemType: 'EQUIPMENT',
  isSold: true
}
```

---

## 📊 Financial Reporting & Analytics

### **Monthly Financial Summary (V0.1)**

```typescript
interface MonthlyFinancialSummary {
  month: number;
  year: number;
  totalCost: number;
  totalRevenue: number;
  netCashflow: number;
  totalJungleCoins: number;
  jungleCoinsValue: number;
  categories: {
    [category: string]: {
      cost: number;
      revenue: number;
      net: number;
    }
  };
  stations: {
    [station: string]: {
      cost: number;
      revenue: number;
      net: number;
    }
  };
}
```

### **Digital Assets Summary (V0.2+ Vision)**

```typescript
interface DigitalAssetsSummary {
  // In-Game Currencies
  inGameCurrencies: {
    [currencyId: string]: {
      amount: number;              // How many coins
      usdValue: number;            // Current USD value
      exchangeRate: number;        // Rate per coin
      change24h?: number;          // Price change % (if dynamic)
    }
  };
  
  // Bitcoin Zaps
  zapB: {
    satoshis: number;              // Amount in satoshis
    btcValue: number;              // BTC equivalent
    usdValue: number;              // USD equivalent
  };
  
  // NFTs
  inGameNFTs: {
    total: number;                 // Total NFTs owned
    achievements: number;          // Achievement NFTs
    items: number;                 // Item NFTs
    rare: number;                  // Rare/special NFTs
    estimatedValue?: number;       // Market value estimate
  };
  
  // Total Digital Wealth
  totalDigitalAssets: number;      // All digital assets in USD
}
```

### **Key Financial Metrics**

- **Monthly Cash Flow**: revenue - cost per month
- **Category Breakdown**: Spending by category
- **Station Performance**: Financial impact by work area
- **Jungle Coins Tracking**: Reward token accumulation
- **Item Acquisition**: Items purchased vs sold
- **Profit Margins**: Revenue vs cost analysis

---

## 🎯 Financial Record Modal & UI

### **Financial Record Modal Features**

- **Time Period**: Year and month selection
- **Classification**: Station and category selection
- **Financial Data**: Cost, revenue, jungle coins input
- **Item Output**: Optional item creation configuration
- **Notes**: Additional context and details
- **No player points**: Financial modal does not configure HP/FP/RP/XP rewards (see policy above)

### **Financial Dashboard Features**

- **Monthly View**: Calendar-based financial overview
- **Category Filtering**: Filter by company/personal categories
- **Station Breakdown**: Financial impact by work area
- **Cash Flow Charts**: Visual representation of money flow
- **Jungle Coins Tracker**: Reward token accumulation

---

## 🚀 Integration with Other Entities

### **Financial Record → Item Flow**

1. Financial Record created with `outputItemType`
2. Item automatically created
3. `FINREC_ITEM` link established
4. Inventory updated across sites

### **Financial Record → Character Flow**

1. Financial record may link to a **character** (customer, etc.) via `FINREC_CHARACTER` for relationship / wallet flows — **not** for awarding HP/FP/RP/XP from the finrec itself.

### **Financial Record → Sale Flow**

1. Sale completed with financial impact
2. Financial Record created to track the transaction
3. `SALE_FINREC` link established
4. Financial log updated

---

## 📈 Financial Planning & Budgeting

### **Budget Tracking**

```typescript
interface BudgetCategory {
  category: FinancialCategory;
  monthlyBudget: number;
  spent: number;
  remaining: number;
  overBudget: boolean;
}
```

### **Financial Goals**

- **Monthly Targets**: Revenue and cost goals
- **Category Limits**: Spending limits by category
- **Jungle Coins Goals**: Reward token targets
- **Profit Margins**: Target profit percentages

---

## 🔧 Technical Implementation

### **Workflow Integration**

```typescript
// Financial record creation triggers (conceptual — see `onFinancialUpsert` in code)
// Financial workflow: item creation from emissary fields, DONE log, archive index, J$ wallet — no player point awards.
export async function processRecordCreationEffects(record: FinancialRecord): Promise<FinancialRecord> {
  if (record.outputItemType) {
    await createItemFromRecord(record);
  }
  await logFinancialRecordCreation(record);
  return record;
}
```

### **Data Persistence**

- **KV-only system**: KV storage (localStorage cache and offline mode planned for future)
- **API Routes**: Server-side persistence and workflows

### **Financial Calculations**

```typescript
// Automatic calculations
record.netCashflow = record.revenue - record.cost;
record.jungleCoinsValue = record.jungleCoins * 10; // 1 J$ = $10
```

---

## 📊 Financial Logging System

### **Financials Log**

All financial activities are logged to the Financials Log:

```typescript
// Log entry structure
{
  entityId: record.id,
  recordName: record.name,
  description: record.description,
  station: record.station,
  category: record.category,
  type: record.type,
  cost: record.cost,
  revenue: record.revenue,
  jungleCoins: record.jungleCoins,
  netCashflow: record.netCashflow,
  month: record.month,
  year: record.year,
  createdAt: record.createdAt
}
```

---

## 🎮 Digital Assets Section in Finances UI

### **V0.1 (Current): Jungle Coins**
```
Finances → Assets Tab → Jungle Coins Section
├── Personal J$: 15 J$
└── Total: T$150 ($10 per J$)
```

### **V0.2+ (Future): Digital Assets**
```
Finances → Assets Tab → Digital Assets Section
├── In-Game Currencies
│   ├── J$ (Jungle Coins): 15 J$ = $150
│   ├── + Add Currency (user-defined)
│   └── Custom rates, dynamic pricing
├── Bitcoin Zaps (zapB)
│   ├── Satoshis: 50,000 sats
│   ├── BTC: 0.0005 BTC
│   └── USD: $XX (live price)
└── In-Game NFTs
    ├── Achievement NFTs: 5
    ├── Item NFTs: 12
    └── Total Estimated Value: $XXX
```

### **UI Features (V0.2+)**
- **+ Add In-Game Currency**: Create custom currencies with names, symbols, exchange rates
- **Dynamic Pricing Toggle**: Link to real crypto prices (optional)
- **NFT Gallery**: Visual display of owned NFTs with metadata
- **Exchange Interface**: Convert Points ↔ J$ ↔ USD
- **Transaction History**: Complete digital asset transaction log

---

## 🔄 Digital Economy Workflows

### **V0.1: Current Player → J$ → Finances Flow**

**The Triforce Connection: Account ↔ Player ↔ Character**

```
Step 1: User Authentication
User logs in → Authenticated as Player
  → Player entity has: points (HP, FP, RP, XP), stats, progression
  → Player.accountId links to Account entity
  → Account.characterId links to Character entity
  → Character.playerId links back to Player (bidirectional)
  → All three share same Personal Finances in Finances section

Step 2: Player Earns Points (V0.1)
Player completes Task/Sale (business logic entities)
  → Task/Sale completion workflows trigger
    → Player earns Points (HP, FP, RP, XP)
      → Points added to Player.points
        → Points displayed in Player Modal
          → Note: V0.1 - business entities not yet linked to specific Player

Step 3: Points → J$ Exchange (Manual in V0.1)
Player has accumulated Points
  → Decides to exchange for J$
    → Currently manual: User edits Personal J$ in Finances
      → Sets personalAssets.personalJ$ value
        → Future V0.2: Automated exchange interface

Step 4: J$ Storage & Display
Finances section stores J$ in Personal Digital Assets
  → personalAssets.personalJ$ = source of truth
    → Player Modal reads from personalAssets.personalJ$
      → Character Section reads from personalAssets.personalJ$
        → Single source, multiple displays
          → Finances = Digital Bank managing the balance

Step 5: J$ Usage (Future)
Player holds J$ in Finances (Digital Bank)
  → Can exchange for USD (V0.2+)
    → Can spend on in-game purchases (V0.2+)
      → Can transfer to other players (V0.3+)
        → Full digital economy ecosystem
```

**Key V0.1 Architecture:**
- **Single Source of Truth**: `personalAssets.personalJ$` in Finances
- **Multiple Displays**: Player Modal, Character Section both read from Finances
- **The Triforce**: Account ↔ Player ↔ Character (all linked, all access same J$)
- **Finances = Digital Bank**: Central repository for digital assets
- **Manual Exchange**: V0.1 requires manual editing, V0.2+ will automate

### **V0.2+: Automated Player Earns Points Workflow**
```
Player completes Task
  → Earns Points (HP, FP, RP, XP)
    → Player decides to exchange points
      → Opens Exchange Interface (automated)
        → Converts Points to J$ (e.g., 100 XP = 1 J$)
          → J$ automatically added to Personal Digital Assets
            → All displays update in real-time
```

### **2. J$ to USD Conversion Workflow**
```
Player has J$ in Digital Assets
  → Wants to cash out
    → Initiates J$ → USD conversion
      → System calculates: 15 J$ × $10 = $150
        → Creates Financial Record (Personal Income)
          → Company buys back J$ (circular economy)
            → USD added to Personal Monetary Assets
```

### **3. Company Issues J$ Workflow**
```
Company creates Task with J$ rewards
  → Task completed
    → J$ minted and awarded to Player Character
      → Increases circulatingSupply
        → Player can hold, exchange, or cash out
          → Company tracks J$ liability
```

### **4. Custom Currency Creation Workflow (Future)**
```
User (Founder) creates new in-game currency
  → Sets name: "GemCoins"
  → Sets symbol: "💎"
  → Sets exchange rate: $5 per GemCoin
  → Sets total supply: 10,000 gems (optional)
    → System creates currency entity
      → Available for task rewards
        → Players earn and exchange GemCoins
          → Full circular economy established
```

---

## 📊 Digital Asset Entity Structures (V0.2+ Future)

### **InGameCurrency Entity**
```typescript
export interface InGameCurrency extends BaseEntity {
  symbol: string;                  // "J$", "💎", "⭐"
  exchangeRate: number;            // USD per 1 unit
  isDynamic: boolean;              // Links to real crypto?
  cryptoTicker?: string;           // "BTC", "ETH", etc.
  totalSupply?: number;            // Max supply (optional)
  circulatingSupply: number;       // Currently in circulation
  createdBy: string;               // Player/Company who created it
  metadata: {
    color?: string;                // UI color theme
    icon?: string;                 // Custom icon URL
    description?: string;          // Currency description
  };
}
```

### **DigitalAssetTransaction Entity**
```typescript
export interface DigitalAssetTransaction extends BaseEntity {
  assetType: DigitalAssetType;     // zapB, J$, NFT
  transactionType: 'earn' | 'spend' | 'exchange' | 'transfer';
  amount: number;                  // Quantity
  fromEntity?: string;             // Source entity ID
  toEntity: string;                // Destination entity ID
  exchangeRate?: number;           // Rate at time of transaction
  usdValue: number;                // USD equivalent
  metadata?: {
    source?: string;               // "Task completion", "Point exchange"
    pointsExchanged?: number;      // If from points exchange
    currencyId?: string;           // Which currency
  };
}
```

### **NFTAsset Entity**
```typescript
export interface NFTAsset extends BaseEntity {
  tokenId: string;                 // Unique NFT identifier
  nftType: 'achievement' | 'item' | 'milestone' | 'special';
  metadata: {
    image?: string;                // NFT image URL
    rarity: 'common' | 'rare' | 'epic' | 'legendary';
    attributes?: Record<string, any>; // Custom attributes
    mintedAt: Date;                // Creation timestamp
    mintedBy: string;              // Creator entity ID
  };
  ownerId: string;                 // Current owner (Player/Character)
  isTransferable: boolean;         // Can be traded?
  estimatedValue?: number;         // Market value estimate
}
```

---

## ✅ Financial Architecture Benefits (Updated)

1. **Comprehensive Tracking**: All money flow recorded
2. **Dual Classification**: Company and personal finances
3. **Time Organization**: Monthly financial periods
4. **Item Integration**: Purchase and sale tracking
5. **Player Rewards**: Points and digital assets system
6. **Link Integration**: Full relationship tracking
7. **Audit Trail**: Complete financial history
8. **Reporting**: Rich analytics and insights
9. **🆕 Digital Economy**: Full in-game currency system (V0.2+)
10. **🆕 Flexible Currencies**: User-defined currencies with custom rates (V0.2+)
11. **🆕 Crypto Integration**: Real Bitcoin zaps and dynamic pricing (V0.2+)
12. **🆕 NFT System**: Achievement and item NFTs as digital assets (V0.2+)
13. **🆕 Circular Economy**: J$ flows between rewards and buybacks (V0.2+)

---

## 🚀 Implementation Roadmap

### **Phase 1 (V0.1) - Current**
- ✅ Fixed Jungle Coins (J$)
- ✅ Single `jungleCoins` field
- ✅ Fixed $10 per J$ rate
- ✅ Basic tracking

### **Phase 2 (V0.2) - Digital Assets Foundation**
- [ ] Rename "Jungle Coins" to "Digital Assets"
- [ ] Create `DigitalAssetType` enum
- [ ] Add `digitalAssets` field to FinancialRecord
- [ ] Create InGameCurrency entity
- [ ] UI for Digital Assets section

### **Phase 3 (V0.3) - Custom Currencies**
- [ ] User-defined currency creation
- [ ] Custom exchange rates
- [ ] Points → J$ exchange interface
- [ ] J$ → USD conversion workflow
- [ ] Circular economy (company buyback)

### **Phase 4 (V0.4) - Advanced Features**
- [ ] Dynamic pricing (crypto-linked)
- [ ] Bitcoin Zaps integration
- [ ] NFT system implementation
- [ ] Digital asset marketplace
- [ ] Transaction history and analytics

---

*This document serves as the comprehensive guide for Financial Record entity architecture, money tracking, and the future digital economy system.*
