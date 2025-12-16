// types/entities.ts
import {
  TaskType,
  TaskStatus,
  TaskPriority,
  ItemType,
  ItemCategory,
  ItemStatus,
  Collection,
  Currency,
  SiteType,
  SiteStatus,
  PhysicalBusinessType,
  CharacterRole,
  DigitalSiteType,
  SystemSiteType,
  RecurrentFrequency,
  IntelectualFunction,
  Attribute,
  Skill,
  CommColor,
  SaleType,
  SaleStatus,
  PaymentMethod,
  FinancialStatus,
  LinkType,
  EntityType,
  BusinessType,
  ContractStatus,
  ContractClauseType,
} from './enums';
import { getCompanyAreas, getPersonalAreas } from '@/lib/utils/business-structure-utils';
import type { Area, Station, SubItemType } from './type-aliases';

// ═══════════════════════════════════════════════════════════════════════════
// SECTION 1: FOUNDATIONAL TYPES
// ═══════════════════════════════════════════════════════════════════════════

/** Settlement - Reference data for Sites (not a core entity) */
export interface Settlement {
  id: string;
  name: string;
  country: string;
  region: string;
  googleMapsAddress: string;
  coordinates?: { lat: number; lng: number };  // NEW - for future Google Maps integration
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

/** Shared core - All entities extend this */
export interface BaseEntity {
  id: string;               // uuid
  name: string;
  description?: string;
  createdAt: Date;
  updatedAt: Date;
  links: Link[];            // The Rosetta Stone - Relationship tracking
  archiveMetadata?: Record<string, any>; // Optional provenance metadata for archive snapshots
}

/** Link Entity - The Rosetta Stone of Relationships */
export interface Link {
  id: string;               // unique link identifier
  linkType: LinkType;       // what kind of relationship
  source: { type: EntityType, id: string };  // source entity
  target: { type: EntityType, id: string };  // target entity
  createdAt: Date;
  updatedAt?: Date;         // optional update timestamp
  metadata?: Record<string, any>; // context-specific data
}

/** Gamification rewards - ONLY Points, J$ earned via Points Exchange */
export interface Rewards {
  points: {                 // points system - the ONLY rewards
    xp: number;             // Experience Points (work points)
    rp: number;             // Research Points
    fp: number;             // Family Points   
    hp: number;             // Health Points
  };
  currency?: Currency;      // Currency type for the rewards
}

/** File attachment reference */
export interface FileReference {
  url?: string;           // Optional - missing = symbolic type
  type: string;           // Will be constrained by enums
}

/** Distributed stock bucket */
export interface StockPoint {
  siteId: string;
  quantity: number;
}

// ═══════════════════════════════════════════════════════════════════════════
// SECTION 2: SITE ENTITY & METADATA
// ═══════════════════════════════════════════════════════════════════════════

/** Site Metadata Interfaces */
export interface BaseSiteMetadata {
  type: SiteType;
}

export interface PhysicalSiteMetadata extends BaseSiteMetadata {
  type: SiteType.PHYSICAL;
  businessType: PhysicalBusinessType;
  settlementId: string; // Reference to Settlement entity
  googleMapsAddress: string;
}

export interface DigitalSiteMetadata extends BaseSiteMetadata {
  type: SiteType.DIGITAL;
  digitalType: DigitalSiteType;
}

export interface SystemSiteMetadata extends BaseSiteMetadata {
  type: SiteType.SYSTEM;
  systemType: SystemSiteType;
}

export type SiteMetadata =
  | PhysicalSiteMetadata
  | DigitalSiteMetadata
  | SystemSiteMetadata;

/** Site Entity - Core entity for all locations */
export interface Site extends BaseEntity {
  name: string;
  description?: string;
  metadata: SiteMetadata;
  status: SiteStatus; // SiteStatus enum - Active or Inactive
  ownerId?: string | null; // ID of the Character who owns this site
  // links inherited from BaseEntity as Link[]
}

// NOTE: Characters are NOT sites!
// Characters can be IN a site, OWN a site, or WORK IN a site
// But they ARE NOT sites themselves.
// Use CHARACTER_SITE and SITE_CHARACTER links instead.


// ═══════════════════════════════════════════════════════════════════════════
// SECTION 3: ITEM ENTITY
// ═══════════════════════════════════════════════════════════════════════════

/**
 * ITEM ENTITY - All Items (Products, Bundles, Materials, Equipment)
 * 
 * Represents all types of items with different business logic based on category:
 * - MODEL_ITEM: Individual products (Digital, Artwork, Print, Sticker, Merch)
 * - BUNDLE_ITEM: Business Logic Items (Sticker Bundle, Print Bundle)
 * - RESOURCE_ITEM: Production resources (Material, Equipment)
 * 
 * Architecture:
 * Item → Type & Collection → Stock (Multi-Site) → Financial Data → Metadata
 * 
 * Key Concepts:
 * - Unified Stock System: stock[] array is SINGLE SOURCE OF TRUTH
 * - Multi-Site Inventory: Items can be distributed across multiple sites
 * - Ambassador Fields: sourceTaskId, sourceRecordId link to creators
 * - Links System: ITEM_SITE, ITEM_TASK, ITEM_SALE, ITEM_FINREC
 * - Category-based Business Logic: Different rules for MODEL_ITEM vs BUNDLE_ITEM vs RESOURCE_ITEM
 */
export interface Item extends BaseEntity {
  type: ItemType;
  collection?: Collection;
  status: ItemStatus;
  station: Station;           // Primary work station (e.g., 'Strategy', 'Digital Art', 'Prints')
  stock: StockPoint[];          // multiple sites - SINGLE SOURCE OF TRUTH

  // Physical dimensions (for physical items)
  dimensions?: {
    width: number;              // width in cm
    height: number;             // height in cm
    area: number;               // mt2 calculation
  };

  // Size field (for items like shoes, t-shirts, etc.)
  size?: string;                // e.g., "7.5", "M", "XL", "38.5"

  // Financial fields
  unitCost: number;             // purchase cost per unit (calculated from task)
  additionalCost: number;       // additional selling costs (commission, booth rental, etc.)
  price: number;                // target selling price
  value: number;                // actual sale price (0 if not sold)
  restockable?: boolean;        // whether item should be reordered when depleted (defaults by ItemType)

  // Inventory tracking - UNIFIED STOCK SYSTEM
  // totalQuantity = sum of all stock.quantity (computed property)
  quantitySold: number;         // quantity sold so far
  targetAmount?: number;        // target stock level (for stickers, materials, etc.)

  // Bundle-specific fields (only used when category === BUNDLE_ITEM)
  itemsPerBundle?: number;           // how many individual items per bundle (e.g., 100 stickers per bundle)
  soldThisMonth?: number;            // monthly sales tracking for bundles
  lastRestockDate?: Date;            // last restock date for bundles

  // Metadata
  year?: number;                // year of creation/purchase
  subItemType?: SubItemType;    // for merch: T-Shirt, Bag, Shoes, Rashguard, Sports Bra, T-Shirt AllOver
  imageUrl?: string;            // URL to item image/photo

  // File attachments
  originalFiles?: FileReference[];
  accessoryFiles?: FileReference[];

  // Ambassador Fields (Links System - references to other entities)
  sourceTaskId?: string | null;    // e.g. related to "Order Stickers"
  sourceRecordId?: string | null;  // e.g. related to "Buy Fan" record
  ownerCharacterId?: string | null;  // Character who owns this item (customer, team member, etc.)
  //sku?: string;                 // optional – acts as business-friendly id

  // Emissary Fields
  newOwnerName?: string;           // EMISSARY: Name for new owner character creation

  // Sale tracking
  soldAt?: Date;                   // When item was sold

  // Archive field
  isCollected: boolean;            // Item collected (monthly close)
}


// ═══════════════════════════════════════════════════════════════════════════
// SECTION 4: TASK ENTITY
// ═══════════════════════════════════════════════════════════════════════════

/**
 * TASK ENTITY - Action Cards & Work Management
 * 
 * Represents work items, missions, milestones, goals, and recurrent activities
 * 
 * Architecture:
 * Task → Type & Status → Hierarchy → Item Output (DNA) → Financial Data → Rewards
 * 
 * Task Types:
 * - MISSION: High-level long-term objectives
 * - MILESTONE: Major achievements with sub-tasks
 * - GOAL: Mid-level objectives
 * - TASK: Individual work items
 * - RECURRENT: Repeating tasks (templates + instances)
 * 
 * Key Concepts:
 * - Ambassador Fields: siteId, targetSiteId, parentId link to other entities
 * - Item Output DNA: outputItem* fields create TASK_ITEM links when completed
 * - Rewards: Only points (Player) - J$ earned via Points Exchange
 * - Links System: TASK_SITE, TASK_ITEM, TASK_CHARACTER, TASK_PLAYER
 */
export interface Task extends BaseEntity {
  type: TaskType;                   // MISSION, MILESTONE, GOAL, TASK, RECURRENT
  status: TaskStatus;
  priority: TaskPriority;
  station: Station;                 // Primary work station (e.g., 'Strategy', 'Digital Art', 'Prints')
  progress: number;                 // 0-100
  dueDate?: Date;
  scheduledStart?: Date;            // For Weekly Schedule view
  scheduledEnd?: Date;              // For Weekly Schedule view
  frequencyConfig?: any;            // For complex frequency configuration (includes type)
  order: number;                    // Represents sort order among siblings

  // Hierarchy
  parentId?: string | null;         // Single parent field - can be Mission, Milestone, Goal, or Recurrent Parent/Template
  isRecurrentGroup?: boolean;       // Is this a Recurrent Group?
  isTemplate?: boolean;             // Is this a Recurrent Template?
  outputItemId?: string | null;     // if this task creates an Item

  // Ambassador Fields (Links System - Site relationships)
  siteId?: string | null;           // Site where work is done (optional)
  targetSiteId?: string | null;     // Target site/client (optional)
  sourceSaleId?: string | null;     // Sale that generated this task (for service sales)

  // Emissary Fields (Conditional entity creation - pass to created entities)
  customerCharacterId?: string | null;  // Customer for service tasks - passed to created items
  playerCharacterId?: string | null;    // AMBASSADOR: Player character who owns this task
  newCustomerName?: string;             // EMISSARY: Name for new customer character creation

  // Item output (DNA for RNA - creates TASK_ITEM links)
  outputItemType?: string;          // Type of item this task creates
  outputItemSubType?: SubItemType;  // SubType of item this task creates
  outputQuantity?: number;          // Quantity of items created
  outputUnitCost?: number;          // Unit cost of the item created
  outputItemName?: string;          // Name of the item (for new items)
  outputItemCollection?: Collection;// Collection for the item (optional)
  outputItemPrice?: number;         // Target selling price for the item
  isNewItem?: boolean;              // Whether this creates a new item
  isSold?: boolean;                 // Whether the item is already sold
  outputItemStatus?: ItemStatus;    // Status of the item created

  // Completion tracking
  doneAt?: Date;                    // When task was marked DONE
  collectedAt?: Date;               // When task was collected (monthly close)

  // Financial DNA (Permanent Ambassadors / Temporary Snapshots)
  // These fields are "instructions" that get copied via RNA to create FinancialRecord entity
  // They live here for UI/planning, but FinancialRecord is the source of truth for accounting
  cost: number;                     // negative cash impact (copied to FINREC via RNA)
  revenue: number;                  // positive cash impact (copied to FINREC via RNA)
  isNotPaid?: boolean;              // Cost not paid yet (copied to FINREC via RNA)
  isNotCharged?: boolean;           // Revenue not received yet (copied to FINREC via RNA)
  rewards: Rewards;                 // Rewards DNA (copied to FINREC and distributed to Character/Player)

  // Archive field
  isCollected: boolean;             // Task collected (monthly close)
}

// ═══════════════════════════════════════════════════════════════════════════
// SECTION 5: FINANCIAL ENTITIES
// ═══════════════════════════════════════════════════════════════════════════

// Financial category types derived from BUSINESS_STRUCTURE
export type CompanyFinancialCategory = ReturnType<typeof getCompanyAreas>[number];
export type PersonalFinancialCategory = ReturnType<typeof getPersonalAreas>[number];
export type FinancialCategory = CompanyFinancialCategory | PersonalFinancialCategory;

/** Financial record */
export interface FinancialRecord extends BaseEntity {
  year: number;
  month: number; // 1-12
  station: Station;                 // Main area: ADMIN, DESIGN, PRODUCTION, SALES, PERSONAL
  type: 'company' | 'personal';
  outputItemId?: string | null;     // Reuse existing inventory item when present

  // Ambassador Fields (Links System)
  siteId?: string | null;           // Site where financial activity occurred (optional)
  targetSiteId?: string | null;     // Target site/client (optional)
  customerCharacterId?: string | null; // Customer character for this financial record
  playerCharacterId?: string | null;   // Player character who owns this record
  sourceTaskId?: string | null;     // Task that generated this financial record (optional)
  sourceSaleId?: string | null;     // Sale that generated this financial record (optional)
  salesChannel?: Station | null;    // Sales channel station (for sales-derived records: 'Direct Sales', 'Network Sales', etc.)

  // Emissary Fields
  newCustomerName?: string;         // EMISSARY: Name for new customer character creation

  // Financial data - SOURCE OF TRUTH for accounting
  // These are the REAL values, copied from Task/Sale DNA via RNA
  cost: number;                     // negative cash impact (REAL accounting value)
  revenue: number;                  // positive cash impact (REAL accounting value)
  jungleCoins: number;              // Jungle Coins earned/spent (1 J$ = $10)
  notes?: string;                   // optional notes for the month

  // Payment status - SOURCE OF TRUTH for payment tracking
  // Copied from Task/Sale via RNA, then managed here as the accounting reality
  isNotPaid?: boolean;              // Cost not paid yet - EXCLUDES from totals until paid
  isNotCharged?: boolean;           // Revenue not received yet - EXCLUDES from totals until received

  // Character/Player rewards
  rewards?: {
    points?: {
      hp?: number;          // Health Points
      fp?: number;          // Family Points
      rp?: number;          // Research Points
      xp?: number;          // Experience Points
    };
  };

  // Item output data (DNA for RNA - similar to Task)
  outputItemType?: string;
  outputItemSubType?: SubItemType;  // SubType of item this record creates
  outputQuantity?: number;
  outputUnitCost?: number;
  outputItemName?: string;
  outputItemCollection?: Collection;
  outputItemPrice?: number;
  isNewItem?: boolean;
  isSold?: boolean;                 // Whether the item is already sold
  outputItemStatus?: ItemStatus;    // Status of the item created

  // Calculated fields
  netCashflow: number;              // revenue - cost
  jungleCoinsValue: number;         // jungleCoins * 10 (for display)

  // Status field for Active/Archive lifecycle
  status?: FinancialStatus;         // PENDING | DONE | COLLECTED

  // Archive field
  isCollected: boolean;             // Financial record collected (monthly close)
  collectedAt?: Date;               // When record was collected
}

/** Company financial summary for a month */
export interface CompanyMonthlySummary {
  year: number;
  month: number;
  totalRevenue: number;
  totalCost: number;
  netCashflow: number;
  totalJungleCoins: number;
  categoryBreakdown: { [station: string]: { revenue: number; cost: number; net: number; jungleCoins: number } };
}

/** Personal financial summary for a month */
export interface PersonalMonthlySummary {
  year: number;
  month: number;
  totalRevenue: number;
  totalCost: number;
  netCashflow: number;
  totalJungleCoins: number;
  categoryBreakdown: { [station: string]: { revenue: number; cost: number; net: number; jungleCoins: number } };
}

/** Combined financial dashboard data */
export interface FinancialDashboard {
  company: CompanyMonthlySummary[];
  personal: PersonalMonthlySummary[];
  currentMonth: {
    company: CompanyMonthlySummary;
    personal: PersonalMonthlySummary;
  };
}

// ═══════════════════════════════════════════════════════════════════════════
// SECTION 5.1: FINANCE INFRA-ENTITIES (Contracts)
// ═══════════════════════════════════════════════════════════════════════════

/**
 * A specific clause or rule within a contract (The "Sliding Bar").
 * Defines a specific split for a category of items, services, or expenses.
 */

export interface ContractClause {
  id: string;
  type: ContractClauseType;

  // Specificity (Optional)
  itemCategory?: string;     // e.g. "Jewelry", "Stickers" (If null, applies to all in type)
  description?: string;      // User defined label

  // The Split (0.0 - 1.0)
  companyShare: number;      // "Us" (Principal)
  associateShare: number;    // "Them" (Associate)
}

/** 
 * CONTRACT - The Agreement (Financial Instrument)
 * Defines the business relationship via a list of Clauses.
 */
export interface Contract extends BaseEntity {
  // Parties
  principalBusinessId: string;    // Me / The Company
  counterpartyBusinessId: string; // The Associate / Partner

  // Status & Lifecycle
  status: ContractStatus;
  validFrom: Date;
  validTo?: Date;

  // The "Real World" Terms: A list of specific agreements
  clauses: ContractClause[];

  // Metadata
  isExclusive?: boolean;
  notes?: string;
}









// ═══════════════════════════════════════════════════════════════════════════
// SECTION 6: SALES ENTITIES
// ═══════════════════════════════════════════════════════════════════════════

/** Discount configuration */
export interface Discount {
  amount?: number;   // e.g., $5 off
  percent?: number;  // e.g., 10 (%). Mutually exclusive with amount.
}

/** Payment information */
export interface Payment {
  method: PaymentMethod;
  amount: number;
  currency: Currency;
  receivedAt?: Date;       // when payment was actually received
  notes?: string;          // payment notes

  // Exchange payment specific fields (when method = EXCHANGE)
  exchangeDescription?: string;  // What was exchanged for (e.g., "Rent for 3 months")
  exchangeCategory?: string;     // Financial category for the cost record (e.g., "Rent", "Materials")
}

/** Base for sale lines */
export interface SaleLineBase {
  lineId: string;
  kind: 'item' | 'bundle' | 'service';
  description?: string;
  taxAmount?: number;
  discount?: Discount;     // line-level discount
}

/** Precise item sale: reference exact inventory item */
export interface ItemSaleLine extends SaleLineBase {
  kind: 'item';
  itemId: string;          // concrete item
  quantity: number;
  unitPrice: number;
}

/** Bundle sale: consume by item type (business-logic items) */
export interface BundleSaleLine extends SaleLineBase {
  kind: 'bundle';
  itemType: ItemType;      // e.g., BUNDLE
  itemId?: string;         // optional: specific item ID if selling from existing item
  subItemType?: SubItemType;
  siteId: string;          // where inventory is consumed
  quantity: number;        // quantity of bundles sold
  unitPrice: number;       // price per bundle
  itemsPerBundle: number;  // how many individual items per bundle
}

/** Service sale: optional Task creation */
export interface ServiceLine extends SaleLineBase {
  kind: 'service';
  station: Station;        // Design/Production/etc.
  revenue: number;
  createTask?: boolean;    // creates a basic Task if true

  // Task creation fields (from mini-submodals)
  taskId?: string;         // existing task to link to
  taskType?: TaskType;     // task type
  taskParentId?: string;   // parent task
  taskDueDate?: Date;      // due date
  taskTargetSiteId?: string; // target site for task
  taskRewards?: {          // task rewards (points)
    hp: number;
    fp: number;
    rp: number;
    xp: number;
  };
  taskCost?: number;       // task cost

  // Item creation fields (for task output)
  outputItemType?: ItemType;
  outputItemSubType?: SubItemType;
  outputItemQuantity?: number;
  outputItemName?: string;
  outputUnitCost?: number;
  outputItemCollection?: Collection;
  outputItemPrice?: number;
  outputItemId?: string | null;
  isNewItem?: boolean;
  isNewOutputItem?: boolean;
  isSold?: boolean;
  outputItemStatus?: ItemStatus;
}

export type SaleLine = ItemSaleLine | BundleSaleLine | ServiceLine;

/** Main Sale entity */
export interface Sale extends BaseEntity {
  saleDate: Date;                // business date of the sale (immutable once set)
  type: SaleType;
  status: SaleStatus;

  // Ambassador Fields (Links System)
  siteId: string;                   // Site where sale occurred
  counterpartyName?: string;        // client/store/partner name
  customerId?: string | null;       // Character who is the customer (for tracking purchases)
  playerCharacterId?: string | null; // Player character who owns this sale
  salesChannel?: Station | null;    // Sales channel station (e.g., 'Direct Sales', 'Network Sales', 'Feria Sales')

  // Emissary Fields
  newCustomerName?: string;         // EMISSARY: Name for new customer character creation

  // Financial DNA (Permanent Ambassadors / Temporary Snapshots)
  // These fields are "instructions" that get copied via RNA to create FinancialRecord entity
  // Sale is the transaction event, FinancialRecord is the accounting entry (source of truth)
  isNotPaid?: boolean;              // Payment not received yet (copied to FINREC via RNA)
  isNotCharged?: boolean;           // Payment not processed yet (copied to FINREC via RNA)

  // Discounts
  overallDiscount?: Discount;    // applies to subtotal before tax

  // Lines & payments
  lines: SaleLine[];
  payments?: Payment[];

  // Precomputed totals (persisted for fast reads)
  totals: {
    subtotal: number;            // sum(line quantity*price) before discounts/tax
    discountTotal: number;       // overall + per-line discounts
    taxTotal: number;            // aggregated tax
    totalRevenue: number;        // subtotal - discounts + tax
  };

  // Lifecycle timestamps (never overwritten once set)
  postedAt?: Date;               // when effects were applied
  doneAt?: Date;                 // when finalized
  cancelledAt?: Date;            // when cancelled & rolled back

  // Ties to tasks (Ambassador Fields - Links System)
  requiresReconciliation?: boolean;
  reconciliationTaskId?: string;
  requiresRestock?: boolean;
  restockTaskId?: string;
  createdTaskId?: string;        // when sale spawns a Task (e.g., mural)
  sourceTaskId?: string | null;  // AMBASSADOR: Task that created/spawned this sale

  // Archive field
  isCollected: boolean;          // Sale collected (monthly close)
  collectedAt?: Date;            // When sale was collected/archive-ready
}





// ═══════════════════════════════════════════════════════════════════════════
// SECTION 7: PLAYER & CHARACTER ENTITIES
// ═══════════════════════════════════════════════════════════════════════════

/** Player Metrics - Performance tracking */
export interface PlayerMetrics {
  EXECUTIVE_FUNCTIONS: IntelectualFunction[];  // Updated to use correct enum name
  LATENCY: number;        // Time to complete a task
  EFFICIENCY: number;     // Coefficient of performance in Task Completion (10/10)
  DISCIPLINE: number;     // Coefficient of performance in Schedule Compliance (20/20) and Inhibition (-0)
  REVIEW: boolean;        // Whether the player has reviewed its accomplishments this month
  REVIEW_DATE: Date;      // Last Date of the review
}

// V0.2: Skills, Functions, Attributes tracked as Record<enum, number>
// This allows dynamic addition without schema changes
export type PlayerSkillsMap = Partial<Record<Skill, number>>;          // 0-10 per skill
export type PlayerIntellectualMap = Partial<Record<IntelectualFunction, number>>;  // 0-10 per function
export type PlayerAttributesMap = Partial<Record<Attribute, number>>;  // 0-10 per attribute

/** Relationship with another entity (future social graph) */
export interface Relationship {
  targetCharacterId: string;     // references another Character entity
  role: CharacterRole;       // how they relate (customer, collaborator, etc.)
  strength?: number;             // 0..100 perceived relationship strength
  since?: Date;                  // when this relationship started
  notes?: string;                // additional context
}

/**
 * PLAYER ENTITY - The Boss (YOU - Single Player Mode V0.1)
 * 
 * The real person who controls the business through this gamified admin app
 * 
 * Architecture Hierarchy:
 * Player → Authentication → Rewards & Currency → RPG Stats → Character Management
 * 
 * Key Concepts:
 * - Controls ALL business operations (tasks, inventory, sales)
 * - Earns Points (HP, FP, RP, XP) as REWARDS for real-life actions
 * - Has Jungle Coins (J$) - 🏛️ AMBASSADOR FIELD (belongs to Financial entity)
 * - Main currency is USD ($), J$ is exchangeable asset
 * - Has RPG stats (Skills, Intellectual Functions, Attributes) - NOT YET IMPLEMENTED
 * - Has CommColor for personality/communication style
 * - Real progression system comes in future versions
 */
export interface Player extends BaseEntity {
  // 1. IDENTITY & AUTHENTICATION (Ambassador Field)
  accountId?: string | null;     // 🏛️ AMBASSADOR FIELD (links to Account entity) - V0.1: optional, Future: required

  // NOTE: V0.1 TEMPORARY - Current auth system (not connected to Account entity yet)
  email: string;                 // Temporary placeholder (will be removed when Account storage implemented)
  passwordHash: string;          // Temporary placeholder (will be removed when Account storage implemented)
  sessionToken?: string;         // Temporary placeholder (will be removed when Account storage implemented)

  // 2. PROGRESSION & REWARDS - Earned from business activities
  level: number;                 // Player level (starts at 0)
  totalPoints: {                 // Aggregate of all earned points (tracks overall progress)
    hp: number;    // Health Points - wellness and lifestyle rewards
    fp: number;    // Family Points - family and relationships rewards
    rp: number;    // Research Points - learning and knowledge rewards
    xp: number;    // Experience Points - work and skills rewards
  };
  points: {                      // Current available points (can be spent/used)
    hp: number;
    fp: number;
    rp: number;
    xp: number;
  };
  // J$ is stored in FinancialRecord ledger via PLAYER_FINREC links, not on Player entity

  // 3. RPG STATS - NOT YET IMPLEMENTED (V0.1 placeholders)
  skills?: PlayerSkillsMap;              // { DESIGN_THINKING: 9, PROGRAMMING: 4, ... } - V0.2
  intellectualFunctions?: PlayerIntellectualMap;  // { CREATIVITY: 8, PLANNING: 9, ... } - V0.2
  attributes?: PlayerAttributesMap;      // { CHARISMA: 5, LOGIC: 9, ... } - V0.2

  // 4. CHARACTER MANAGEMENT - One-to-many relationship (Ambassador Fields)
  characterIds: string[];        // 🏛️ Characters linked to this player

  // 5. ACHIEVEMENTS - Player-specific accomplishments (real-life milestones)
  achievementsPlayer: string[];   // Player progression badges and rewards/achievements tree

  // 6. LIFECYCLE & METRICS
  lastActiveAt: Date;
  totalTasksCompleted: number;
  totalSalesCompleted: number;
  totalItemsSold: number;        // Total items sold (business metric)
  metrics?: PlayerMetrics;       // optional performance metrics

  // Archive field
  isActive: boolean;             // Player is active in the system
}

/**
 * CHARACTER ENTITY - People (Customers, Family, Collaborators, Team Members)
 * 
 * Represents all people who interact with the business:
 * - External: Customers, family, collaborators
 * - Internal: The Player's identity in the game world (player-character)
 * 
 * Architecture Hierarchy:
 * Character → Roles → Information → CommColor → Character Points CP → Achievements → Relationships
 * 
 * WHO they are:
 * - Player-character: The Player's avatar in the game (PLAYER role)
 * - Founder: God rights, immutable (Player One only - FOUNDER role)
 * - Team: Hired employees (TEAM role, set by Founder)
 * - Customers: Buy products (CUSTOMER role)
 * - Family: Personal relationships (FAMILY role)
 * - Business roles: Admin, Designer, Producer, Seller, Researcher, Developer, Agent
 * - Investors: Investment tracking (INVESTOR role, set by Founder)
 * 
 * Key Concepts:
 * - NO login/authentication (managed by Player)
 * - NO RPG stats (Skills, Intellectual Functions, Attributes) - those belong to Player
 * - YES CommColor - KEY for knowing how to communicate with them!
 * - Has CP (Character Points) - different from Player points
 * - Has Character-specific achievements - different from Player achievements
 * - Roles define their relationship to system AND Player
 */
export interface Character extends BaseEntity {
  // 1. Character: name (nickname/display name) + id inherited from BaseEntity

  // 2. IDENTITY & AUTHENTICATION
  accountId?: string | null;     // 🏛️ AMBASSADOR FIELD (links to Account entity) - V0.1: optional, Future: preferred

  // 3. ROLES - Core: defines WHO they are to the system AND Player
  roles: CharacterRole[];    // [PLAYER, FOUNDER, CUSTOMER, FAMILY, TEAM, etc.]

  // 4. CONTACT INFORMATION (MIGRATION NOTE: Moving to Account entity)
  description?: string;          // short description/notes (already in BaseEntity, kept for clarity)
  contactPhone?: string;         // phone number - V0.1: Still here, Future: Remove (use Account.phone)
  contactEmail?: string;         // email address - V0.1: Still here, Future: Remove (use Account.email)

  // 5. COMM COLOR - Communication style (KEY!)
  commColor?: CommColor;         // How to communicate with this person - ESSENTIAL for interaction!

  // 6. CHARACTER PROGRESSION - Character-specific metrics (NOT Player points)
  CP?: number;                            // Character Points - character-specific points
  achievementsCharacter: string[];        // Character-specific achievements tree (different from Player achievements)

  // 7. BUSINESS METRICS
  jungleCoins?: number;          // Current J$ Wallet Balance
  purchasedAmount: number;       // What they've bought from the business (CUSTOMER role)
  inventory: string[];           // Item IDs they own/possess

  // 8. RELATIONSHIPS (Ambassador Fields - Links System)
  playerId: string;              // 🏛️ Links to Player who manages this character - REQUIRED
  siteId?: string | null;        // AMBASSADOR: Character's home site or primary work location

  // 9. SOCIAL GRAPH - V0.2
  relationships?: Relationship[];  // connections to other Characters

  // 10. LIFECYCLE & METRICS
  lastActiveAt: Date;

  // Archive field
  isActive: boolean;             // Character is active in the system

  // Links System inherited from BaseEntity
}

// ═══════════════════════════════════════════════════════════════════════════
// SECTION 7.1: CHARACTER INFRA-ENTITIES (Legal Entities)
// ═══════════════════════════════════════════════════════════════════════════

/**
 * BUSINESS - The "Business Identity" (Business Persona Layer)
 * 
 * Separates the Persona (Character) from the Business (Tax/Legal).
 * Can be linked to a Site (HQ) and a Character (Representative).
 */
export interface Business extends BaseEntity {
  type: BusinessType;
  taxId?: string;               // Optional Tax ID / SSN / Cedula

  // Connections
  linkedCharacterId?: string | null;  // The person behind this entity (e.g. Akiles)
  linkedSiteId?: string | null;       // The HQ or main contract site (e.g. Ecosystem)

  isActive: boolean;
}

// Note: Player and Character are SEPARATE but CONNECTED entities
// - Player: Controls business, has authentication, earns rewards, manages characters
// - Character: People - customers, family, collaborators (NO business control, NO login)
// - Player has RPG stats (Skills, Intellectual Functions, Attributes) - NOT YET IMPLEMENTED
// - Character has NO RPG stats - ONLY Player has growth mechanics
// - BOTH have CommColor (Player for self-awareness, Character for knowing how to communicate with them)
// - BOTH can receive Points & Jungle Coins (Player earns them, Character receives from Player)
// - Main currency is USD ($), Jungle Coins (J$) are crypto-like in-game asset ($10 each)
// - Points can be exchanged for Jungle Coins, which can be exchanged for USD
// - Links System handles all relationships (PLAYER_CHARACTER, CHARACTER_PLAYER)

// ═══════════════════════════════════════════════════════════════════════════
// SECTION 7B: ACCOUNT ENTITY (Authentication & Identity Layer)
// ═══════════════════════════════════════════════════════════════════════════



/**
 * ACCOUNT ENTITY - Authentication & Personal Identity Layer
 * 
 * Represents a real person's identity and authentication credentials.
 * Completely separate from game progression (Player) and business roles (Character).
 * 
 * Architecture:
 * Account → Identity → Authentication → Privacy → Relationships
 * 
 * Key Principles:
 * - Single Source of Truth for personal data (name, email, phone)
 * - Security-first design (authentication isolated)
 * - Privacy controls built-in
 * - One Account per real person per game universe
 * - Links to Player (optional) and Character (required)
 */
export interface Account extends BaseEntity {
  // IDENTITY (Single Source of Truth)
  // name inherited from BaseEntity → Real person's name
  email: string;              // Real person's email (unique, required)
  phone?: string;             // Real person's phone (optional)

  // AUTHENTICATION (Security Layer)
  passwordHash: string;       // Hashed password (bcrypt/argon2)
  sessionToken?: string;      // Current active session JWT
  lastLoginAt?: Date;         // Last successful login timestamp
  loginAttempts: number;      // Failed login counter (security/brute force protection)

  // ACCESS CONTROL
  isActive: boolean;          // Account enabled/disabled (admin can disable)
  isVerified: boolean;        // Email verified (via verification link)
  verificationToken?: string; // Email verification token
  resetToken?: string;        // Password reset token
  resetTokenExpiry?: Date;    // Reset token expiration timestamp

  // PRIVACY SETTINGS
  privacySettings: {
    showEmail: boolean;       // Allow others to see email (default: false)
    showPhone: boolean;       // Allow others to see phone (default: false)
    showRealName: boolean;    // Use real name or nickname (default: true)
  };

  // RELATIONSHIPS (Ambassador Fields)
  playerId?: string | null;   // 🏛️ Links to Player entity (optional - only if playing the game)
  characterId: string;        // 🏛️ Links to Character entity (required - everyone has a character)

  // LIFECYCLE
  lastActiveAt: Date;         // Last activity timestamp (any action in system)

  // Links System inherited from BaseEntity
  // links: Link[] → ACCOUNT_PLAYER, ACCOUNT_CHARACTER, PLAYER_ACCOUNT, CHARACTER_ACCOUNT
}

// Note: Account, Player, and Character THREE-ENTITY SYSTEM
// - Account: Identity + Authentication (WHO the person is)
// - Player: Game Progression (WHAT they've achieved in the game)
// - Character: Business Role (HOW they interact with the business)
// 
// One real person = One Account = One Character per game universe
// Player is OPTIONAL (only if they're playing the game)
// 
// Example flows:
// - Customer (no account): Character only → can't login
// - Customer (with account): Account + Character → can login, view orders
// - Team member: Account + Character (with TEAM role) → can login, limited admin access
// - Founder/Player: Account + Character (FOUNDER, PLAYER roles) + Player → full access

// ═══════════════════════════════════════════════════════════════════════════
// SECTION 8: NOTE-TAKING SYSTEM
// ═══════════════════════════════════════════════════════════════════════════

/** Note-taking system interfaces */
export interface Notebook extends BaseEntity {
  type: string; // NotebookType enum value
  color: string; // Color theme for visual organization
  icon: string; // Lucide icon name
  notes: Note[];
}

export interface Note extends BaseEntity {
  notebookId: string;
  title: string;
  content: string;
  color: string; // NoteColor enum value
  isPinned: boolean;
  isClosed: boolean;
  isHidden: boolean;
  tags: string[]; // NoteTag values
}

// ═══════════════════════════════════════════════════════════════════════════
// SECTION 10: AI SESSION INFRA ENTITY
// ═══════════════════════════════════════════════════════════════════════════

/** AI Session - Conversation sessions for AI assistant */
export interface AISession extends BaseEntity {
  userId: string;
  model: string; // AI model used (e.g., 'openai/gpt-oss-120b')
  messageCount: number;
  lastAccessedAt: Date;
  expiresAt: Date;
  messages: Array<{
    role: 'user' | 'assistant' | 'tool';
    content: string;
    timestamp: Date;
    toolCalls?: any[];
    toolResults?: any[];
  }>;
  context: {
    user: string;
    project: string;
    preferences?: Record<string, any>; // User preferences stored as key-value pairs
  };
  systemPrompt?: string; // Custom system prompt text
  systemPreset?: 'analyst' | 'strategist' | 'assistant' | 'accounter' | 'empty' | 'custom'; // Preset type for system prompt
}
