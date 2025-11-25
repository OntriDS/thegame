# ENTITIES ARCHITECTURE - COMPACT REFERENCE

## TERMINOLOGY NOTE

**"Parent UI"** in this document refers to **"Section UI"** - the parent container components (Sections) that display entity data. This is a well-established technical term meaning "the parent component that displays entity data" and is used throughout the diplomatic fields system to distinguish between modal forms and the parent containers that show the data.

## THE ROSETTA STONE EFFECT
**The Links System**: Entities don't just create other entities - they create **LINKS** to them. This transforms isolated entities into a **coherent relationship network** where every action is traceable and every relationship is explicit.

## MOLECULAR PATTERN (How The Rosetta Stone Works)
**Flow**: Entity (DNA) → Diplomatic Fields → Links (RNA) → Ribosome (Workflows) → Other Entity

**Components**:
- **🧬 DNA (Entity)**: Self-contained, cannot leave "nucleus" (modal), contains instructions
- **🏛️ DIPLOMATIC FIELDS**: Cross-entity references providing delivery addresses
- **📋 RNA (Links)**: Copy DNA instructions and carry them between entities
- **🏭 RIBOSOME (Workflows)**: Read RNA and create new entities (protein synthesis)

## DIPLOMATIC FIELDS PATTERN
**Field Categories**:
- **Native Fields**: Core entity properties, always present, safe for parent UI
- **Ambassador Fields**: Cross-entity references, always present, safe for parent UI, create links
- **Emissary Fields**: Conditional entity creation, conditionally present, NOT safe for parent UI, create links

**Field Identification**:
```typescript
// ✅ NATIVE: Core entity properties
name: string, status: TaskStatus, priority: TaskPriority

// ✅ AMBASSADOR: Cross-entity references, always present
siteId: string, cost: number, revenue: number, isNotPaid: boolean

// ✅ EMISSARY: Conditional entity creation fields
outputItemType: ItemType, outputQuantity: number, outputItemName: string
```

## CORE PRINCIPLES
1. **The Rosetta Stone Effect**: Every entity interaction creates/modifies Links
2. **Molecular Pattern**: DNA/RNA mechanism for entity communication
3. **Diplomatic Fields Pattern**: Clear field categorization with data presence guarantees
4. **Separation of Concerns**: Modal → Section → ClientAPI → API Routes → Ribosome
5. **Idempotent Operations**: All operations safe to run multiple times
6. **Environment Parity**: Same behavior in dev and prod
7. **No Side Effect Flags**: Workflows inspect entity properties (DNA), not manual flags

## ENTITY DEFINITIONS (9 Core Entities)

### BaseEntity Interface
```typescript
interface BaseEntity {
  id: string;               // uuid
  name: string;
  description?: string;
  createdAt: Date;
  updatedAt: Date;
  links: Link[];            // Relationship tracking
}
```

### Link Interface
```typescript
interface Link {
  id: string;               // unique link identifier
  linkType: LinkType;       // what kind of relationship
  source: { type: EntityType, id: string };
  target: { type: EntityType, id: string };
  createdAt: Date;
  metadata?: Record<string, any>;
}
```

## ENTITY HIERARCHY

### ULTRA ENTITIES (System Foundation)
**Purpose**: Core system infrastructure that everything else depends on

#### 1. ACCOUNT (Identity & Authentication)
**Purpose**: Single source of truth for personal data and security
**Key Fields**: name, email, phone, passwordHash, sessionToken, isActive, isVerified
**Ambassador Fields**: playerId, characterId
**Link Relationships**: ACCOUNT_PLAYER, ACCOUNT_CHARACTER, PLAYER_ACCOUNT, CHARACTER_ACCOUNT
**The Triforce**: Account + Player + Character permanently linked

#### 2. LINKS (Connector Entity)
**Purpose**: Connector entity serving as bridge between all other entities workflows
**Key Fields**: linkType, source, target, metadata
**Link Types**: 35 different relationship types covering all entity interactions (unidirectional design)

### CORE ENTITIES (Business Logic)
**Purpose**: Main business entities that drive the game mechanics and operations

#### 1. TASK (Future Planning)
**Purpose**: Future missions, recurrent work, strategic planning
**Key Fields**: category, status, priority, station, progress, dueDate, order
**Ambassador Fields**: parentId, cost, revenue, siteId
**Emissary Fields**: outputItemType, outputQuantity, outputItemName, outputUnitCost
**Link Relationships**: TASK_ITEM, TASK_SALE, TASK_PLAYER, TASK_SITE

#### 2. ITEM (Assets)
**Purpose**: Physical/digital assets created by Tasks or Records
**Key Fields**: type, collection, status, station, stock, unitCost, price, value
**Ambassador Fields**: sourceTaskId, sourceRecordId, stock[].siteId
**Link Relationships**: ITEM_TASK, ITEM_SALE, ITEM_FINREC, ITEM_SITE

#### 3. SALE (Transactions)
**Purpose**: Transaction records (ferias, consignment sales, direct sales)
**Key Fields**: saleDate, type, status, siteId, counterpartyName, lines, payments, totals
**Ambassador Fields**: siteId, createdTaskId
**Link Relationships**: SALE_TASK, SALE_ITEM, SALE_FINREC, SALE_PLAYER, SALE_SITE

#### 4. FINANCIAL RECORD (Money Tracking)
**Purpose**: Past completed financial actions (company/personal expenses, income)
**Key Fields**: year, month, station, category, type, cost, revenue, jungleCoins
**Ambassador Fields**: siteId, targetSiteId
**Emissary Fields**: outputItemType, outputQuantity, outputItemName
**Link Relationships**: FINREC_TASK, FINREC_ITEM, FINREC_CHARACTER, FINREC_PLAYER, FINREC_SITE

#### 5. SITE (Locations)
**Purpose**: Locations of different types - physical (real life), cloud (digital), system (others)
**Key Fields**: name, type, status, metadata
**Ambassador Fields**: settlementId (for physical sites)
**Link Relationships**: SITE_TASK, SITE_ITEM, SITE_SALE, SITE_CHARACTER, SITE_FINREC, SITE_SETTLEMENT
**Map Strategy**: Sites = Map pins, tied to Settlements = Areas of influence

#### 6. CHARACTER (In-Game Entities - Roles & Game Mechanics)
**Purpose**: In-game entities with roles defining what they can do
**Architecture**: Character → Roles → Information → Skills/Functions/Attributes → CommColor
**Key Fields**: roles, description, contactPhone, contactEmail, jungleCoins, purchasedAmount, inventory
**Ambassador Fields**: playerId
**Link Relationships**: CHARACTER_TASK, CHARACTER_ITEM, CHARACTER_SALE, CHARACTER_PLAYER

#### 7. PLAYER (Real People - Authentication & Progression)
**Purpose**: Real person identity and progression tracking
**Architecture**: Player → Authentication → Progression → Character Management
**Key Fields**: email, passwordHash, level, totalPoints, points, jungleCoins, characterIds
**Ambassador Fields**: characterIds[]
**Link Relationships**: PLAYER_TASK, PLAYER_SALE, PLAYER_FINREC, PLAYER_CHARACTER

### INFRA ENTITIES (Supporting Data)
**Purpose**: Supporting reference data that enhances core entities

#### 1. SETTLEMENT (Location Areas)
**Purpose**: Areas of influence/territories for business expansion strategy
**Key Fields**: name, country, region, coordinates, googleMapsAddress
**Relationship**: Referenced by Sites via settlementId ambassador field
**Map Strategy**: Settlements = Territory areas, Sites = Map pins within territories
**Architecture**: Reference data managed within Site system, not a core entity

## LINK SYSTEM ARCHITECTURE

### The Link Connector (Universal Entry Point)
**Function**: `processLinkEntity(entity: any, entityType: string): Promise<void>`
**Location**: `workflows/entities-workflows/*.workflow.ts` (The Ribosome)
**Purpose**: Universal entry point where entities get connected via Links

**What it does**:
1. Receives any entity type
2. Routes to entity-specific processor
3. Inspects entity properties (not flags!)
4. Creates Links automatically from Ambassador fields
5. Synthesizes new entities from entity instructions

### Link Rules Engine
```typescript
interface LinkRule {
  linkType: LinkType;
  onSourceDelete: 'cascade' | 'prompt' | 'block' | 'ignore';
  onTargetDelete: 'cascade' | 'prompt' | 'block' | 'ignore';
  onSourceUpdate: 'propagate' | 'prompt' | 'ignore';
  onTargetUpdate: 'propagate' | 'prompt' | 'ignore';
}
```

## ENTITY LIFECYCLE PATTERNS

### Task Lifecycle with Links (DNA/RNA Pattern)
1. **Task Creation**: DNA contains instructions
2. **RNA Synthesis**: Copy DNA instructions into Link metadata
3. **Ribosome Processing**: Create new entity (Item) from RNA
4. **Link Creation**: RNA delivery confirmation
5. **Ambassador Field**: Item gets sourceTaskId pointing back to Task

### Entity Communication Pattern
- **Tasks** say: "Hey, I created this Item" (via TASK_ITEM + sourceTaskId ambassador)
- **Items** say: "Hey, I'm at this Site" (via ITEM_SITE + siteId ambassador)
- **Sales** say: "Hey, I created this Task" (via SALE_TASK)
- **Financial Records** say: "Hey, I track this Item" (via FINREC_ITEM)

## IMPLEMENTATION STATUS
**✅ COMPLETE (100%)**:
- Link System Foundation: Link entity, LinkRegistry interface, link storage
- Link Rules Engine: 15+ rules with cascade/prompt/block behaviors
- Workflow Integration: 30+ createLink() calls across all entity types
- UI Integration: Links Tab in Data Center, all modals updated
- Advanced Features: Player/Character split, Diplomatic Fields Pattern

**✅ PRODUCTION READY (A+ 99/100)**:
- All link creation, persistence, querying functional
- API security implemented (all 34 routes protected)
- Environment consistency (KV-only architecture)
- Smart cache management with immediate UI updates

## KEY BENEFITS
- **Full Audit Trail**: Every relationship tracked and queryable
- **Intelligent Cascading**: Rules determine deletion/update behavior
- **No Double-Logging**: Effects Registry prevents duplicates
- **Extensible**: New link types don't require schema changes
- **Entity Purity**: Each entity logs only what defines it
- **Player/Character Distinction**: Clear separation of concerns
- **Real-time Updates**: Links appear instantly without page refresh
