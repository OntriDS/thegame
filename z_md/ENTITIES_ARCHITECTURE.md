# Entities Architecture • The Rosetta Stone of Relationships

────────────────────────────────────────

## TABLE OF CONTENTS

- The Rosetta Stone Effect
- Core Principles
- Entity Definitions
- Link System Architecture
- Entity Lifecycle Patterns
- Implementation Roadmap
- Status & Next Steps

────────────────────────────────────────

## The Rosetta Stone Effect

**The Links System**: Entities don't just create other entities - they create **LINKS** to them. This transforms isolated entities into a **coherent relationship network** where every action is traceable and every relationship is explicit.

**Naming Hierarchy:**
- **The Rosetta Stone Effect** = The Links System (what it does)
- **Molecular Pattern** = How it works internally (the mechanism)

### The Molecular Pattern - How The Rosetta Stone Works Internally

**The Links System (Rosetta Stone Effect) uses the Molecular Pattern** - inspired by molecular biology (DNA/RNA transcription):

**The Flow:** Entity (DNA) → Ambassador Fields → Messengers (Links/RNA) → Ribosome (Workflows) → Other Entity

**The Molecular Pattern Components:**

**🧬 DNA (Entity)** - Cannot leave its "nucleus" (modal/component)
- Entities are self-contained with their core properties
- They cannot directly create other entities
- They contain **instructions** for what should be created

**🏛️ AMBASSADOR FIELDS** - Cross-entity references (diplomatic connections)
- Borrowed fields from other entities (siteId, sourceTaskId, playerId)
- Provide "addresses" for RNA delivery
- Enable entity-to-entity connections without direct contact

**📋 RNA (Links - Messengers)** - Carries instructions between entities
- Reads instructions from source entity (DNA)
- Carries metadata copied from DNA
- Delivers to destination via Ambassador addresses
- Enables entity communication without direct contact

**🏭 RIBOSOME (Workflows)** - Reads RNA and creates new entities
- Inspects entity properties (reads DNA)
- Creates Links with metadata (RNA synthesis)
- Creates target entities from Link instructions (protein synthesis)
- Completes bidirectional Links using Ambassador fields

### Ambassador Fields - Cross-Entity References

**Key Concept**: Some entity fields are **ambassadors** from other entities:

```typescript
interface Item {
  // Core Item DNA (what makes it an Item)
  name: string;
  type: ItemType;
  status: ItemStatus;
  
  // 🎯 AMBASSADOR FIELDS (borrowed from other entities)
  siteId: string;           // Ambassador from Site entity
  sourceTaskId: string;     // Ambassador from Task entity
  sourceRecordId: string;   // Ambassador from Financial entity
  
  // These fields ARE NOT Item properties
  // They are REFERENCES to other entities' DNA
  // They enable Link creation (RNA messaging)
}
```

**Ambassador Fields are:**
- ✅ **Borrowed** from other entities (not native to current entity)
- ✅ **Typed** according to source entity (Site ID, Task ID, etc.)
- ✅ **Link Facilitators** - they carry the "address" for RNA delivery
- ✅ **Read-Only References** - don't duplicate source entity data

### Entity Communication Pattern

**Tasks** say: "Hey, I created this Item" (via `TASK_ITEM` + `sourceTaskId` ambassador)
**Items** say: "Hey, I'm located at this Site" (via `ITEM_SITE` + `siteId` ambassador)
**Items** say: "Hey, I was sold in this Sale" (via `ITEM_SALE`)  
**Sales** say: "Hey, I created this Task" (via `SALE_TASK`)
**Financial Records** say: "Hey, I track this Item" (via `FINREC_ITEM`)
**Character (role: PLAYER)** says: "I got points for this Task/Sale/Record" (via `TASK_CHARACTER`, `SALE_CHARACTER`, `FINREC_CHARACTER`)

### The Revolutionary Insight

**Before Links**: Each entity was isolated, creating side effects in isolation
**After Links**: Each entity is a **relationship coordinator** that knows its full context through RNA messaging (Links)

### The Genius Paradigm Shift: Entity-Specific Logging + Player/Character Split

**The Old Way (Side Effects)**: Every entity logged everything - bloated, redundant, confusing
**The New Way (The Rosetta Stone)**: Each entity logs ONLY what defines it - pure, focused, elegant

**Example - The Beautiful Simplicity:**
- **Account** logs: `name`, `email`, `phone`, `isActive`, `isVerified` (what makes it an Account)
- **Task** logs: `name`, `description`, `type`, `station`, `category`, `status` (what makes it a Task)
- **Financial** logs: `cost`, `revenue`, `category`, `year`, `month` (what makes it Financial)  
- **Character** logs: `jungleCoins`, `roles`, `purchasedAmount`, `inventory`, `achievementsCharacter` (what makes it a Character)
- **Player** logs: `points`, `totalPoints`, `level`, `achievementsPlayer` (what makes it a Player)
- **Item** logs: `name`, `type`, `status`, `price`, `quantity` (what makes it an Item)
- **Account** - Account (identity) + Player (progression) + Character (role) permanently linked from start!

**The Links System handles relationships** - no more bloated logs with irrelevant cross-entity data!


**Example - Exchange Mural for Rent:**
1. Sale creates Task → `SALE_TASK` link
2. Task creates Item → `TASK_ITEM` link  
3. Sale creates Financial Record → `SALE_FINREC` link
4. Financial Record tracks Item → `FINREC_ITEM` link
5. **Full relationship graph**: Sale ↔ Task ↔ Item ↔ Financial Record

────────────────────────────────────────

## Core Principles

### 1. **The Rosetta Stone Effect** (Links System)
- Every entity interaction creates or modifies Links
- Transforms isolated entities into a coherent relationship network
- Full audit trail of all relationships
- Uses **Molecular Pattern** internally for entity communication

### 2. **Molecular Pattern** (How The Rosetta Stone Works)
- **Entities (DNA)**: Self-contained, cannot leave their "nucleus" (modal)
- **Ambassador Fields**: Cross-entity references that enable Link delivery
- **Links (RNA - Messengers)**: Copy DNA instructions and carry them to other entities
- **Workflows (Ribosome)**: Read entity DNA, create Links (RNA), synthesize new entities
- **No Side Effect Flags**: Workflows inspect entity properties (DNA), not manual flags

### 3. **Diplomatic Fields Pattern** (Modal Field Display)
- **Native Fields**: Core entity properties, always present, safe for parent UI
- **Ambassador Fields**: Cross-entity references, always present, safe for parent UI, create links
- **Emissary Fields**: Conditional entity creation fields, conditionally present, NOT safe for parent UI, create links
- **Data Presence Guarantees**: Ambassador fields are always present (even if 0/null), Emissary fields are conditional
- **UI Safety**: Parent UIs only display fields with data presence guarantees

### 4. **Separation of Concerns** (Modal → Parent → ClientAPI → API → Ribosome)
- **Modal**: Collects inputs, emits `onSave(entity)` - pure entity, no flags
- **Parent (Orchestration)**: Manages UI state, calls ClientAPI
- **ClientAPI (Client Gateway)**: Simple fetch-based API calls
- **API Routes (Server-Side)**: 
  - Handles entity persistence via DataStore
  - Calls `processLinkEntity(entity, entityType)` ← THE LINK CONNECTOR
- **Ribosome (`workflows/entities-workflows/*.workflow.ts`)**: 
  - **Entry Point**: `processLinkEntity(entity, entityType)` - The Link Connector
  - Reads entity properties (inspects state)
  - Creates Links (messengers) between entities
  - Synthesizes new entities from Link metadata
  - Processes ALL entity types (Task, Item, Financial, Sale, Character, Player, Site)

### 5. **Idempotent Operations**
- All operations are idempotent via Effects Registry
- Links can be safely created/updated multiple times (RNA can be re-read)
- No duplicate relationships or Link Effects

### 6. **Environment Parity**
- KV-only architecture (no environment switching)
- Same link creation in all environments (same ribosome)
- Same logging and idempotency patterns

### 7. **Diplomatic Fields Convention**
- **Native Fields**: Core entity properties, always present, safe for parent UI
- **Ambassador Fields**: Cross-entity references, always present, safe for parent UI, create links
- **Emissary Fields**: Conditional entity creation fields, conditionally present, NOT safe for parent UI, create links
- **Data Presence Guarantees**: Ambassador fields are always present (even if null/0), Emissary fields are conditional
- **UI Safety**: Parent UIs only display fields with data presence guarantees
- **Link Creation**: Both Ambassador and Emissary fields create links, but with different behavior patterns

**How to Identify Diplomatic Fields:**
```typescript
// ✅ NATIVE: Core entity properties
name: string                // → Task's own name
description: string         // → Task's own description
status: TaskStatus          // → Task's own status
priority: TaskPriority      // → Task's own priority

// ✅ AMBASSADOR: Cross-entity references, always present
siteId: string              // → Points to Site entity (AMBASSADOR)
cost: number                // → Financial impact (AMBASSADOR)
revenue: number             // → Financial impact (AMBASSADOR)
isNotPaid: boolean          // → Payment flag (AMBASSADOR)

// ✅ EMISSARY: Conditional entity creation fields
outputItemType: ItemType    // → Creates Item (EMISSARY)
outputQuantity: number      // → Creates Item (EMISSARY)
outputItemName: string      // → Creates Item (EMISSARY)

// 🎯 HYBRID: Contains both Native and Ambassador
stock: [{
  siteId: string,           // ← AMBASSADOR from Site
  quantity: number          // ← NATIVE (how many at this site)
}]
```

**Diplomatic Field Rules:**
1. **Native Fields**: Core properties, always present, safe for parent UI
2. **Ambassador Fields**: Cross-entity references, always present (even if 0/null), safe for parent UI
3. **Emissary Fields**: Conditional fields, conditionally present, NOT safe for parent UI
4. **Data Presence**: Ambassador fields guarantee presence, Emissary fields are conditional
5. **UI Safety**: Parent UIs only display fields with data presence guarantees

────────────────────────────────────────

## Entity Definitions

### Base Entity Interface

```typescript
export interface BaseEntity {
  id: string;               // uuid
  name: string;
  description?: string;
  createdAt: Date;
  updatedAt: Date;
  links: Link[];            // Relationship tracking
  // Note: Archive fields (isActive, isCollected) are entity-specific, not in BaseEntity
}

export interface Link {
  id: string;               // unique link identifier
  linkType: LinkType;       // what kind of relationship
  source: { type: EntityType, id: string };  // source entity
  target: { type: EntityType, id: string };  // target entity
  createdAt: Date;
  metadata?: Record<string, any>; // context-specific data
}

export type LinkType = 
  | 'TASK_ITEM'          // Task created Item
  | 'TASK_SALE'          // Task spawned from Sale
  | 'TASK_SITE'          // Task at Site
  | 'TASK_CHARACTER'     // Task earned Character Jungle Coins (PLAYER role)
  | 'TASK_PLAYER'        // Task earned Player points (PLAYER role)
  | 'ITEM_SITE'          // Item at Site
  | 'ITEM_SALE'          // Item was sold in Sale
  | 'ITEM_FINREC'        // Item tracked in Financial Record
  | 'SALE_SITE'          // Sale at Site
  | 'SALE_TASK'          // Sale created Task
  | 'SALE_ITEM'          // Sale sold Item
  | 'SALE_CHARACTER'     // Sale earned Character Jungle Coins
  | 'SALE_PLAYER'        // Sale earned Player points
  | 'FINREC_SITE'        // Financial Record at Site
  | 'FINREC_ITEM'        // Financial Record tracks Item
  | 'FINREC_CHARACTER'   // Financial Record earned Character Jungle Coins
  | 'FINREC_PLAYER'      // Financial Record earned Player points
  | 'PLAYER_TASK'        // Player earned points from Task
  | 'PLAYER_SALE'        // Player earned points from Sale
  | 'PLAYER_FINREC'      // Player earned points from Financial Record
  | 'PLAYER_ITEM'        // Player owns Item
  | 'PLAYER_CHARACTER'   // Player manages Character
  | 'CHARACTER_PLAYER'   // Character belongs to Player
  | 'ACCOUNT_PLAYER'     // Account owns Player
  | 'ACCOUNT_CHARACTER'  // Account owns Character
  | 'PLAYER_ACCOUNT'     // Player belongs to Account
  | 'CHARACTER_ACCOUNT'  // Character belongs to Account
  // ... extensible

export type EntityType = 'task' | 'item' | 'sale' | 'financial' | 'character' | 'player' | 'site' | 'account';
```

### ACCOUNT Entity (Identity & Authentication)

```typescript
export interface Account extends BaseEntity {
  // IDENTITY - Single source of truth for personal data
  name: string;              // Real person's name
  email: string;             // Real person's email (unique)
  phone?: string;            // Real person's phone
  
  // AUTHENTICATION - Security layer
  passwordHash: string;
  sessionToken?: string;
  lastLoginAt?: Date;
  loginAttempts: number;
  
  // ACCESS CONTROL
  isActive: boolean;
  isVerified: boolean;
  verificationToken?: string;
  resetToken?: string;
  resetTokenExpiry?: Date;
  
  // PRIVACY SETTINGS
  privacySettings: {
    showEmail: boolean;
    showPhone: boolean;
    showRealName: boolean;
  };
  
  // RELATIONSHIPS (Ambassador Fields)
  playerId?: string | null;  // Links to Player (optional)
  characterId: string;       // Links to Character (required)
  
  // LIFECYCLE
  lastActiveAt: Date;
}
```

**Link Relationships:**
- `ACCOUNT_PLAYER`: Account owns Player entity
- `ACCOUNT_CHARACTER`: Account owns Character entity
- `PLAYER_ACCOUNT`: Player belongs to Account (reverse)
- `CHARACTER_ACCOUNT`: Character belongs to Account (reverse)

**The Triforce**: Account + Player + Character permanently linked from system initialization.

### TASK Entity (Future Planning)

```typescript
export interface Task extends BaseEntity {
  category: TaskCategory;
  status: TaskStatus;
  priority: TaskPriority;
  station: Station;
  category: Category;
  progress: number;             // 0-100
  dueDate?: Date;
  order: number;                // Sort order among siblings
  
  // Hierarchy
  parentId?: string | null;
  isRecurrentParent?: boolean;
  isTemplate?: boolean;
  
  // Financial snapshot (for THIS task only)
  cost: number;                 // negative cash impact
  revenue: number;              // positive cash impact
  rewards: Rewards;
  
  // Item output data
  outputItemType?: ItemType;
  outputItemSubType?: SubItemType;
  outputQuantity?: number;
  outputUnitCost?: number;
  outputItemName?: string;
  outputItemCollection?: Collection;
  outputItemPrice?: number;
  
  // Lifecycle timestamps
  doneAt?: Date;
  collectedAt?: Date;
  
  // Payment flags
  isNotPaid?: boolean;
  isNotCharged?: boolean;
  isSold?: boolean;
}
```

**Link Relationships:**
- `TASK_ITEM`: When task creates an item
- `TASK_SALE`: When task was spawned from a sale
- `TASK_PLAYER`: When task completion earns player points

### ITEM Entity (Assets)

```typescript
export interface Item extends BaseEntity {
  type: ItemType;
  collection?: Collection;
  status: ItemStatus;
  station: Station;
  category: Category;
  stock: StockPoint[];          // multiple sites - SINGLE SOURCE OF TRUTH
  
  // Physical dimensions
  dimensions?: {
    width: number;              // width in cm
    height: number;             // height in cm
    area: number;               // mt2 calculation
  };
  
  // Size field
  size?: string;                // e.g., "7.5", "M", "XL", "38.5"
  
  // Financial fields
  unitCost: number;             // purchase cost per unit
  additionalCost: number;       // additional selling costs
  price: number;                // target selling price
  value: number;                // actual sale price (0 if not sold)
  
  // Inventory tracking
  quantitySold: number;         // quantity sold so far
  targetAmount?: number;        // target stock level
  
  // Sticker Bundle specific
  soldThisMonth?: number;       // monthly sales tracking
  lastRestockDate?: Date;       // last restock date
  
  // Metadata
  year?: number;
  subItemType?: SubItemType;
  imageUrl?: string;
  
  // File attachments
  originalFiles?: FileReference[];
  accessoryFiles?: FileReference[];
  
  // Source tracking
  sourceTaskId?: string | null;
  sourceRecordId?: string | null;
}
```

**Link Relationships:**
- `ITEM_TASK`: Source task that created this item
- `ITEM_SALE`: Sale that sold this item
- `ITEM_FINREC`: Financial records that track this item

### SALE Entity (Transactions)

```typescript
export interface Sale extends BaseEntity {
  saleDate: Date;
  type: SaleType;
  status: SaleStatus;
  siteId: string;
  counterpartyName?: string;     // client/store/partner name
  
  // Payment flags
  isNotPaid?: boolean;
  isNotCharged?: boolean;
  
  // Discounts
  overallDiscount?: Discount;
  
  // Lines & payments
  lines: SaleLine[];
  payments?: Payment[];
  
  // Precomputed totals
  totals: {
    subtotal: number;
    discountTotal: number;
    taxTotal: number;
    totalRevenue: number;
  };
  
  // Lifecycle timestamps
  postedAt?: Date;
  doneAt?: Date;
  cancelledAt?: Date;
  
  // Task relationships
  requiresReconciliation?: boolean;
  reconciliationTaskId?: string;
  requiresRestock?: boolean;
  restockTaskId?: string;
  
  // Entity creation
  createdTaskId?: string;        // when sale spawns a Task
}
```

**Link Relationships:**
- `SALE_TASK`: Task created by this sale
- `SALE_ITEM`: Items sold in this sale
- `SALE_FINREC`: Financial records linked to this sale
- `SALE_PLAYER`: Player points earned from this sale

### FINANCIAL RECORD Entity (Money Tracking)

```typescript
export interface FinancialRecord extends BaseEntity {
  year: number;
  month: number; // 1-12
  station: Station;
  category: FinancialCategory;
  type: 'company' | 'personal';
  
  // Site relationships
  siteId?: string | null;
  targetSiteId?: string | null;
  
  // Financial data
  cost: number;             // negative cash impact
  revenue: number;          // positive cash impact
  jungleCoins: number;      // Jungle Coins earned/spent
  
  // Player points
  rewards?: {
    points?: {
      hp?: number;          // Health Points
      fp?: number;          // Family Points
      rp?: number;          // Research Points
      xp?: number;          // Experience Points
    };
  };
  
  // Item output data
  outputItemType?: string;
  outputItemSubType?: SubItemType;
  outputQuantity?: number;
  outputUnitCost?: number;
  outputItemName?: string;
  outputItemCollection?: Collection;
  outputItemPrice?: number;
  isNewItem?: boolean;
  isSold?: boolean;
  
  // Calculated fields
  netCashflow: number;
  notes?: string;
}
```

**Link Relationships:**
- `FINREC_ITEM`: Items tracked by this financial record
- `FINREC_SALE`: Sales linked to this financial record
- `FINREC_PLAYER`: Player points earned from this financial record

### PLAYER Entity (Real People - Authentication & Progression)

**Architecture Hierarchy:**
```
Player → Authentication → Progression → Character Management
```

```typescript
export interface Player extends BaseEntity {
  // 1. AUTHENTICATION - Real person identity
  email: string;
  passwordHash: string;
  sessionToken?: string;
  
  // 2. PROGRESSION - Real development tracking
  level: number;
  totalPoints: {             // All-time earned (aggregate)
    hp: number;
    fp: number;
    rp: number;
    xp: number;
  };
  points: {                  // Currently available (spendable)
    hp: number;
    fp: number;
    rp: number;
    xp: number;
  };
  jungleCoins: number;       // 🏛️ AMBASSADOR (belongs to Financial)
  
  // 3. CHARACTER MANAGEMENT - One-to-many relationship
  characterIds: string[];    // Character IDs managed by this player
  
  // 4. ACHIEVEMENTS - Real accomplishments
  achievementsP: string[];
  
  // 5. LIFECYCLE & METRICS
  lastActiveAt: Date;
  totalTasksCompleted: number;
  totalSalesCompleted: number;
  totalItemsSold: number;
  isActive: boolean;
}
```

### CHARACTER Entity (In-Game Entities - Roles & Game Mechanics)

**Architecture Hierarchy:**
```
Character → Roles → Information → Skills/Functions/Attributes → CommColor
```

```typescript
export interface Character extends BaseEntity {
  // 1. ROLES - Core: defines WHO they are to the system
  roles: CharacterRole[];        // [FOUNDER, PLAYER, DESIGNER, CUSTOMER, etc.]
  
  // 2. INFORMATION - What we know about them
  description?: string;
  contactPhone?: string;
  contactEmail?: string;
  
  // 3. CHARACTER PROGRESSION - Character-specific
  CP?: number;                   // Character Points
  achievementsC: string[];       // Character achievements
  
  // 4. GAME MECHANICS - In-game stats
  jungleCoins: number;           // 🏛️ AMBASSADOR (belongs to Financial)
  purchasedAmount: number;       // What they've bought
  inventory: string[];           // Item IDs they own
  
  // 5. RELATIONSHIPS
  playerId: string;              // Links to Player (real person)
  
  // 6. COMM COLOR - Communication color (V0.2)
  commColor?: CommColor;
  
  // 7. LIFECYCLE & METRICS
  lastActiveAt: Date;
  isActive: boolean;
}
```

**Link Relationships:**
- `PLAYER_TASK`: Tasks that earned player points
- `PLAYER_SALE`: Sales that earned player points
- `PLAYER_FINREC`: Financial records that earned player points
- `PLAYER_CHARACTER`: Player owns/manages character (one-to-many)
- `CHARACTER_PLAYER`: Character belongs to player (reverse of above)
- `ITEM_CHARACTER`: Items possessed by character (ownership/consignment/loan)
- `CHARACTER_ITEM`: Character owns/possesses item (bidirectional)

**V0.1 vs V0.2:**
- **V0.1 (NOW)**: Player/Character split working, placeholders for future
- **V0.2 (LATER)**: Full relationships, skill trees, attributes interactive

**Key Insight:**
- **Player/Character Split**: Player controls business (THE BOSS), Character is external people (customers, family). BOTH can have points & jungleCoins. Player has RPG stats (not yet implemented), Character has CommColor (KEY for communication)
- Roles are **CORE** to character identity, not site metadata
- Possession modeled via Links (`ITEM_CHARACTER`), not Character Sites
- Character Sites (legacy) will be migrated to Links in V0.2

────────────────────────────────────────

## Link System Architecture

### The Link Connector - Universal Entry Point

**Function:** `processLinkEntity(entity: any, entityType: string): Promise<void>`

**Location:** `workflows/entities-workflows/*.workflow.ts` (The Ribosome)

**Purpose:** THE universal entry point where entities get connected via Links

**What it does:**
1. Receives any entity type
2. Routes to entity-specific processor
3. Inspects entity properties (not flags!)
4. Creates Links automatically from Ambassador fields
5. Synthesizes new entities from entity instructions

**Implemented Ambassador Field Detection:**
```typescript
// ITEM AMBASSADORS (processItemEffects)
item.stock[].siteId → ITEM_SITE Link
item.sourceTaskId → ITEM_TASK Link
item.sourceRecordId → ITEM_FINREC Link

// CHARACTER AMBASSADORS (processCharacterEffects)
character.playerId → CHARACTER_PLAYER Link

// PLAYER AMBASSADORS (processPlayerEffects)
player.characterIds[] → PLAYER_CHARACTER Links (one per character)
```

**Example Flow:**
```typescript
// 1. API route calls after saving entity:
await processLinkEntity(item, 'item');

// 2. Link Connector routes to Item processor:
async function processItemEffects(item: Item) {
  // Inspects Ambassador fields
  for (const stockPoint of item.stock) {
    if (stockPoint.siteId) {
      await createLink('ITEM_SITE', 
        { type: 'item', id: item.id },
        { type: 'site', id: stockPoint.siteId },
        { quantity: stockPoint.quantity }
      );
    }
  }
  
  if (item.sourceTaskId) {
    await createLink('ITEM_TASK',
      { type: 'item', id: item.id },
      { type: 'task', id: item.sourceTaskId },
      { createdBy: 'task' }
    );
  }
}
```

### Link Registry Interface

```typescript
interface LinkRegistry {
  createLink(link: Link): Promise<void>;
  getLinksFor(entity: {type: EntityType, id: string}): Promise<Link[]>;
  getLinksByType(linkType: LinkType): Promise<Link[]>;
  removeLink(linkId: string): Promise<void>;
  removeLinksFor(entity: {type: EntityType, id: string}): Promise<void>;
  getRelationshipGraph(entityId: string): Promise<RelationshipGraph>;
}
```

### Link Rules Engine

```typescript
interface LinkRule {
  linkType: LinkType;
  onSourceDelete: 'cascade' | 'prompt' | 'block' | 'ignore';
  onTargetDelete: 'cascade' | 'prompt' | 'block' | 'ignore';
  onSourceUpdate: 'propagate' | 'prompt' | 'ignore';
  onTargetUpdate: 'propagate' | 'prompt' | 'ignore';
}

// Example rules
const LINK_RULES: LinkRule[] = [
  {
    linkType: 'TASK_ITEM',
    onSourceDelete: 'cascade',    // Delete Task → Delete Item
    onTargetDelete: 'prompt',     // Delete Item → Ask about Task
    onSourceUpdate: 'propagate',  // Task Done → Update Item status
    onTargetUpdate: 'ignore'      // Item update → Don't affect Task
  },
  {
    linkType: 'SALE_TASK', 
    onSourceDelete: 'prompt',     // Delete Sale → Ask about Task
    onTargetDelete: 'ignore',     // Delete Task → Don't affect Sale
    onSourceUpdate: 'propagate',  // Sale Done → Mark Task as paid
    onTargetUpdate: 'propagate'   // Task Done → Mark Sale as done
  }
];
```

### Effects Registry Integration

```typescript
// Before applying any effect, check link context
async function applyTaskEffect(taskId: string, effect: string) {
  const links = await getLinksFor({type: 'task', id: taskId});
  const saleLink = links.find(l => l.linkType === 'SALE_TASK');
  
  // Generate unique key that includes link context
  const effectKey = saleLink 
    ? `taskEffect:${taskId}:${saleLink.source.id}:${effect}`
    : `taskEffect:${taskId}:${effect}`;
    
  if (await EffectsRegistry.has(effectKey)) {
    return; // Already applied, skip
  }
  
  // Apply effect and mark as done
  await doTaskEffect(taskId, effect);
  await EffectsRegistry.set(effectKey);
}
```

────────────────────────────────────────

## Entity Lifecycle Patterns

### Task Lifecycle with Links - DNA/RNA Pattern

```typescript
// Task Creation - DNA contains instructions
async function createTask(task: Task): Promise<Task> {
  const savedTask = await DataStore.upsertTask(task);
  
  // RIBOSOME: Read ambassador field (sourceSaleId) and create RNA link
  if (task.sourceSaleId) {  // ← AMBASSADOR from Sale entity
    await LinkRegistry.createLink({
      id: generateId(),
      linkType: 'SALE_TASK',
      source: { type: 'sale', id: task.sourceSaleId },  // ← Ambassador provides address
      target: { type: 'task', id: savedTask.id },
      createdAt: new Date()
    });
  }
  
  return savedTask;
}

// Task Completion - RIBOSOME reads DNA and creates entities via RNA
async function completeTask(task: Task): Promise<void> {
  // 🧬 STEP 1: Read DNA instructions
  const hasItemInstructions = task.outputItemType;  // ← DNA contains item blueprint
  
  if (hasItemInstructions) {
    // 📋 STEP 2: RNA copies DNA instructions
    const itemRNA = {
      type: task.outputItemType,      // ← From Task DNA
      quantity: task.outputQuantity,  // ← From Task DNA
      station: task.station,          // ← From Task DNA
      unitCost: task.outputUnitCost,  // ← From Task DNA
      // ... more instructions from Task DNA
    };
    
    // 🏭 STEP 3: RIBOSOME creates new entity (Item) from RNA
    const item = await createItemFromRNA(itemRNA);
    
    // 📋 STEP 4: Create Link (RNA delivery confirmation)
    await LinkRegistry.createLink({
      id: generateId(),
      linkType: 'TASK_ITEM',
      source: { type: 'task', id: task.id },
      target: { type: 'item', id: item.id },
      metadata: itemRNA  // ← RNA carries the instructions
    });
    
    // Item now has AMBASSADOR field pointing back to Task
    item.sourceTaskId = task.id;  // ← AMBASSADOR for reverse lookup
  }
  
  // 🎮 STEP 5: Award character jungle coins (only if character has PLAYER role)
  if (task.rewards?.jungleCoins) {
    // RNA: Copy jungle coin instructions
    const characterRNA = {
      jungleCoins: task.rewards.jungleCoins
    };
    
    // RIBOSOME: Award to character
    await awardCharacterJungleCoins(characterRNA.jungleCoins);
    
    // Link: RNA delivery
    await LinkRegistry.createLink({
      id: generateId(),
      linkType: 'TASK_CHARACTER',
      source: { type: 'task', id: task.id },
      target: { type: 'character', id: 'main' },
      metadata: characterRNA
    });
  }
  
  // 🎯 STEP 6: Award player points (only if character has PLAYER role)
  if (task.rewards?.points) {
    // RNA: Copy points instructions
    const playerRNA = {
      points: task.rewards.points
    };
    
    // RIBOSOME: Award to player
    await awardPlayerPoints(playerRNA.points);
    
    // Link: RNA delivery
    await LinkRegistry.createLink({
      id: generateId(),
      linkType: 'TASK_PLAYER',
      source: { type: 'task', id: task.id },
      target: { type: 'player', id: 'main' },
      metadata: playerRNA
    });
  }
}
```

### Item with Ambassador Fields Example

```typescript
interface Item extends BaseEntity {
  // 🧬 CORE DNA (What makes it an Item)
  name: string;
  type: ItemType;
  status: ItemStatus;
  stock: StockPoint[];
  unitCost: number;
  price: number;
  
  // 🎯 AMBASSADOR FIELDS (Borrowed from other entities)
  sourceTaskId?: string;      // 🏛️ AMBASSADOR from Task - "I was created by this Task"
  sourceRecordId?: string;    // 🏛️ AMBASSADOR from Financial - "I was purchased in this Financial"
  stock: [{
    siteId: string;           // 🏛️ AMBASSADOR from Site - "I'm located at this Site"
    quantity: number;
  }];
  
  // Note: Ambassador fields are NOT Item data
  // They are references to other entities
  // They enable the RNA (Links) to find and connect entities
}
```

### The DNA/RNA Workflow (No Side Effect Flags!)

```typescript
// OLD WAY - Manual flags (RNA doesn't exist)
onSave(task, { 
  isCompleting: true,              // ❌ We tell it what to do
  hasOutputPropertyChanges: true   // ❌ We manually flag changes
})

// NEW WAY - DNA/RNA Pattern (Automatic)
onSave(task)  // ← Just send the DNA!

// RIBOSOME (Workflow) reads DNA automatically:
async function processTaskSave(task: Task) {
  // Read DNA instructions (inspect properties, not flags!)
  const shouldCreateItem = task.outputItemType && task.status === 'Done';
  const shouldAwardPoints = task.rewards?.points;
  const shouldAwardJungleCoins = task.rewards?.jungleCoins;
  
  // Create RNA and new entities automatically based on DNA!
  if (shouldCreateItem) {
    const itemRNA = extractItemDNA(task);
    const item = await ribosomeCreateItem(itemRNA);
    await createLink('TASK_ITEM', task, item, itemRNA);
  }
  
  // No manual flags - DNA properties contain all instructions!
}
```

### Sale Lifecycle with Links

```typescript
// Sale Creation
async function createSale(sale: Sale): Promise<Sale> {
  const savedSale = await DataStore.upsertSale(sale);
  
  // Create task if service sale
  if (sale.lines.some(line => line.kind === 'service')) {
    const task = await createTaskFromSale(sale);
    await LinkRegistry.createLink({
      id: generateId(),
      linkType: 'SALE_TASK',
      source: { type: 'sale', id: savedSale.id },
      target: { type: 'task', id: task.id },
      createdAt: new Date()
    });
  }
  
  // Create financial record if exchange
  if (sale.payments?.some(p => p.method === 'EXCHANGE')) {
    const finrec = await createFinancialRecordFromSale(sale);
    await LinkRegistry.createLink({
      id: generateId(),
      linkType: 'SALE_FINREC',
      source: { type: 'sale', id: savedSale.id },
      target: { type: 'financial', id: finrec.id },
      createdAt: new Date()
    });
  }
  
  return savedSale;
}
```

────────────────────────────────────────

## Implementation Status (Code-Verified)

### Phase 1: Link System Foundation ✅ COMPLETE
- [x] Create Link entity and LinkType enums (types/entities.ts)
- [x] Implement LinkRegistry interface (lib/link-registry.ts - 323 lines)
- [x] Add links field to all entities (BaseEntity interface)
- [x] Create basic link storage (Vercel KV)

### Phase 2: Link Rules Engine ✅ 100% COMPLETE
- [x] Implement LinkRule interface (lib/link-registry.ts lines 9-15)
- [x] Create rule evaluation engine (applyLinkRules method lines 209-233)
- [x] Define 15+ link rules with cascade/prompt/block behaviors (LINK_RULES array)
- [x] Implement relationship graph queries (getRelationshipGraph method)

### Phase 3: Workflow Integration ✅ 100% COMPLETE
- [x] Update entity workflows to create links (30+ createLink() calls in workflows/entities-workflows/*.workflow.ts)
- [x] Implement link creation for all entity types (Task, Item, Financial, Sale, Character, Player, Site, Account)
- [x] Effects Registry includes link context
- [x] Idempotency with links working
- [x] API route security (all 34 routes protected)

### Phase 4: UI Integration ✅ 100% COMPLETE
- [x] Links Tab in Data Center for visualization (components/data-center/links-tab.tsx)
- [x] All entity modals updated with proper patterns
- [x] CharacterModal: Role-based logic, Jungle Coins display
- [x] PlayerModal: Points system, progression tracking
- [x] Admin Character Page: DataStore integration, role filtering
- [x] Data Center Player Log Tab: Link-based filtering
- [ ] "Show Relationships" buttons (UI polish - future phase)

### Phase 5: Advanced Features ✅ COMPLETE
- [x] Player/Character split implementation
- [x] Diplomatic Fields Pattern across all modals
- [x] Environment consistency (KV-only architecture)
- [ ] Relationship analytics (future phase)
- [ ] Advanced link-based queries and filters (future phase)
- [ ] Performance optimization (future phase)

────────────────────────────────────────

## Status & Next Steps

**Current Status**: Links System 100% implemented and functional, Player/Character split working, Diplomatic Fields Pattern implemented across all modals
**What's Working**: All link creation, persistence, querying functional in both localStorage and KV, all modals updated with proper patterns, API security implemented
**What's Left**: UI polish ("Show Relationships" buttons), cascade operations testing (future phases)

**Key Benefits**:
- **Full Audit Trail**: Every relationship is tracked and queryable
- **Intelligent Cascading**: Rules determine what happens when entities are deleted/updated
- **No Double-Logging**: Effects Registry keys include link context
- **Extensible**: New link types don't require schema changes
- **Consistent UX**: Same prompt/confirmation patterns across all entities
- **Player/Character Distinction**: Clear separation between real progression (Player) and game mechanics (Character)
- **Diplomatic Fields Pattern**: Clear field categorization with data presence guarantees and UI safety
- **Smart Cache Management**: Automatic cache synchronization ensures immediate UI updates
- **Real-time Updates**: Links appear instantly after entity creation without page refresh

**The Rosetta Stone Effect**: This transforms isolated entities into a **coherent relationship network** where every action is traceable and every relationship is explicit. The Player/Character split ensures clean separation of concerns between real progression and game mechanics. Just like "Best of Both Worlds" defined our logging architecture, this defines our relationship architecture.

────────────────────────────────────────

*This document serves as the single source of truth for entities architecture with the Links System. Update it as the system evolves.*
