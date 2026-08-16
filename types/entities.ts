// types/entities.ts
//
// ═══════════════════════════════════════════════════════════════════════════
// DATE HANDLING STANDARD - UTC ONLY
// ═══════════════════════════════════════════════════════════════════════════
//
// ALL DATE FIELDS IN THESE INTERFACES ARE UTC TIMESTAMPS.
//
// Storage Format: ISO 8601 strings with Z suffix (e.g., "2024-01-15T10:30:00Z")
// Internal Format: Date objects (always treated as UTC)
// Display Format: Converted to user's local timezone in UI layer only
//
// Migration:
// - Use @/lib/utils/utc-utils.ts for all date operations
// - Use @/lib/utils/date-parsers.ts for input conversion (HTML inputs, API requests)
// - Use @/lib/utils/date-display-utils.ts for UI display formatting
// - NEVER use new Date() directly without utility functions
// - NEVER mix local time and UTC in same calculation
//
// Examples:
// - Storage: entity.createdAt.toISOString() // "2024-01-15T10:30:00.000Z"
// - Input: parseDateToUTC(userInput) // String/Date → UTC Date
// - Display: formatForDisplay(utcDate) // UTC Date → Local display
// - Calculation: addDaysUTC(date, 5) // UTC date arithmetic
//
// ═══════════════════════════════════════════════════════════════════════════

import type { AISystemPreset } from '@/lib/ai/system-presets';
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
  CognitiveSkill,
  EmotionalSkill,
  PracticalSkill,
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
  EntitySchemaVersion,
  CanonicalLinkType,
  LinkStatus,
  WorkflowStatus,
  EffectClaimStatus,
  WorkflowType,
} from './enums';
import { getCompanyAreas, getPersonalAreas } from '@/lib/utils/business-structure-utils';
import type { Area, Station, SubItemType } from './type-aliases';

export type CustomerCounterpartyRole = (CharacterRole.CUSTOMER | CharacterRole.BENEFICIARY);

// ═══════════════════════════════════════════════════════════════════════════
// SECTION 1: FOUNDATIONAL TYPES
// ═══════════════════════════════════════════════════════════════════════════


/** Settlement - Reference data for Sites (not a core entity) */
export interface Settlement {
  id: string;
  name: string;
  regionId: string;
  googleMapsAddress: string;
  coordinates?: { lat: number; lng: number };  // NEW - for future Google Maps integration
  isActive: boolean;
  shape?: MapGeometryShape;
  isUnlocked?: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export type MapGeometryShapeType = 'rectangle' | 'circle' | 'polygon';

export type MapGeometryShape = {
  type: MapGeometryShapeType;
  bounds?: [[number, number], [number, number]];
  center?: { lat: number; lng: number };
  radius?: number;
  /** Up to 8 vertices for admin-drawn polygons */
  coordinates?: Array<{ lat: number; lng: number }>;
};

/** Region entity - user-defined geo container for settlements */
export interface Region {
  id: string;
  name: string;
  center: {
    lat: number;
    lng: number;
  };
  defaultZoom: number;
  isUnlocked?: boolean;
  shape?: MapGeometryShape;
  maxBounds?: [[number, number], [number, number]];
  parentId?: string | null;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * TYPE ALIASES for Semantic Clarity
 */
export type UtcIsoString = any; // TEMPORARY PHASE 0 OVERRIDE
export type EntityId = string;
export type DigitalAssetId = string;
export type IsoCurrencyCode = string;
export type ActorId = string;
export type CommandId = string;
export type WorkflowId = string;
export type IdempotencyKey = string;
export type EntityRef = { type: EntityType; id: string };

export type CharacterRelationship = 'owner' | 'customer' | 'beneficiary' | 'creator';
export type LinkRelationship = CharacterRelationship | 'points-earned';

/** Runtime link shape. Relationship is present only for role-bearing links. */
export interface Link {
  id: string;
  linkType: LinkType | CanonicalLinkType;
  source: EntityRef;
  target: EntityRef;
  relationship?: LinkRelationship;
  createdAt: UtcIsoString;
  endedAt?: UtcIsoString;
}

/**
 * VALUE OBJECTS (Strict domain primitives)
 */
export interface Money {
  minorUnits: string; // Stored as string to prevent JS safe-integer overflow
  currency: IsoCurrencyCode;
}

export interface AssetAmount {
  atomicUnits: string;
  assetId: DigitalAssetId;
}

export interface ExchangeRate {
  numerator: string;
  denominator: string;
  source: string;
  observedAt: UtcIsoString;
  policyVersion: string;
}

/** 
 * FOUNDATION: The strict Entity Envelope
 * Replaces the old open BaseEntity and removes the `metadata` escape hatch.
 */
export interface EntityEnvelope {
  id: EntityId;
  schemaVersion: EntitySchemaVersion.V1;
  name: string;
  description?: string;
  createdAt: UtcIsoString;
  updatedAt: UtcIsoString;
  version: number; // Mandatory for optimistic concurrency
}



/**
 * THE ROSETTA STONE: Links System
 * Canonical unidirectional relationship edge with typed context.
 */
export interface LinkEnvelopeV1<TType extends CanonicalLinkType, TContext> {
  id: string;
  linkType: TType;
  source: EntityRef;
  target: EntityRef;
  status: LinkStatus;
  createdAt: UtcIsoString;
  endedAt?: UtcIsoString;
  createdBy: ActorId;
  causationId: CommandId;
  workflowId?: WorkflowId;
  schemaVersion: 1;
  context: TContext;
}

// ═══════════════════════════════════════════════════════════════════════════
// CANONICAL LINK DEFINITIONS
// ═══════════════════════════════════════════════════════════════════════════

export type TaskItemLinkV1 = LinkEnvelopeV1<
  CanonicalLinkType.TASK_ITEM,
  {
    kind: 'task-item';
    relationship: 'requested' | 'produced' | 'repaired'; 
    quantity?: number;
  }
>;

export type ItemSiteLinkV1 = LinkEnvelopeV1<
  CanonicalLinkType.ITEM_SITE,
  {
    kind: 'item-site';
    relationship: 'stored' | 'displayed' | 'in-transit';
  }
>;

export type AccountCharacterLinkV1 = LinkEnvelopeV1<
  CanonicalLinkType.ACCOUNT_CHARACTER,
  {
    kind: 'account-character';
    ownershipLevel: 'primary'; // Enforcing 1:1 relationship for now. No multi-character accounts.
  }
>;

export type AccountPlayerLinkV1 = LinkEnvelopeV1<
  CanonicalLinkType.ACCOUNT_PLAYER,
  {
    kind: 'account-player';
    ownershipLevel: 'primary';
  }
>;

export type PlayerCharacterLinkV1 = LinkEnvelopeV1<
  CanonicalLinkType.PLAYER_CHARACTER,
  {
    kind: 'player-character';
    // Links the Player's identity to their primary or managed Character record
  }
>;

export type TaskParentLinkV1 = LinkEnvelopeV1<
  CanonicalLinkType.TASK_PARENT,
  {
    kind: 'task-parent';
    relationship: 'subtask' | 'recurrent-instance';
  }
>;

export type TaskSiteLinkV1 = LinkEnvelopeV1<
  CanonicalLinkType.TASK_SITE,
  {
    kind: 'task-site';
    relationship: 'performed-at'; // "Task is performed at a Site"
  }
>;

export type TaskCharacterLinkV1 = LinkEnvelopeV1<
  CanonicalLinkType.TASK_CHARACTER,
  never
> & {
  relationship: CharacterRelationship;
};

export type TaskPlayerLinkV1 = LinkEnvelopeV1<
  CanonicalLinkType.TASK_PLAYER,
  {
    kind: 'task-player';
    relationship: 'points-earned'; // "Task earned Player points"
    points?: PointAmountV1;
  }
>;

export type TaskFinRecLinkV1 = LinkEnvelopeV1<
  CanonicalLinkType.TASK_FINREC,
  {
    kind: 'task-finrec';
    relationship: 'generated' | 'settled';
  }
>;



export type ItemCharacterLinkV1 = LinkEnvelopeV1<
  CanonicalLinkType.ITEM_CHARACTER,
  {
    kind: 'item-character';
    relationship: 'owned-by'; // "Item owned by Character"
  }
>;

export type ItemSaleLinkV1 = LinkEnvelopeV1<
  CanonicalLinkType.ITEM_SALE,
  {
    kind: 'item-sale';
    relationship: 'sold-in'; // "Item was sold in Sale"
  }
>;

export type FinrecCharacterLinkV1 = LinkEnvelopeV1<
  CanonicalLinkType.FINREC_CHARACTER,
  never
> & {
  relationship: 'customer' | 'beneficiary';
};

/**
 * The Strict Master Union for all Relationships
 */
export type CanonicalLink =
  | TaskItemLinkV1
  | ItemSiteLinkV1
  | AccountCharacterLinkV1
  | AccountPlayerLinkV1
  | PlayerCharacterLinkV1
  | TaskParentLinkV1
  | TaskSiteLinkV1
  | TaskCharacterLinkV1
  | TaskPlayerLinkV1
  | TaskFinRecLinkV1
  | ItemCharacterLinkV1
  | ItemSaleLinkV1
  | FinrecCharacterLinkV1;


/**
 * EFFECTS REGISTRY & PROCESS MANAGER
 * Workflow execution state for cross-aggregate boundaries.
 */
export interface WorkflowExecutionV1 {
  workflowId: WorkflowId;
  workflowType: WorkflowType;
  rootCommandId: CommandId;
  state: WorkflowStatus;
  revision: number;
  leaseToken?: string;
  leaseExpiresAt?: UtcIsoString;
  currentStep: string;
  completedSteps: string[];
  stepOutcomes: Record<string, StepOutcomeV1>;
  attempts: number;
  nextAttemptAt?: UtcIsoString;
  lastErrorCode?: string;
  createdAt: UtcIsoString;
  updatedAt: UtcIsoString;
}

export interface StepOutcomeV1 {
  step: string;
  state: 'completed' | 'failed-retryable' | 'failed-terminal' | 'skipped';
  effectClaimKey?: string;
  errorCode?: string;
  completedAt?: UtcIsoString;
}

export interface EffectClaimV1 {
  idempotencyKey: IdempotencyKey;
  status: EffectClaimStatus;
  commandId: CommandId;
  workflowId?: WorkflowId;
  ownerId: string;
  leaseToken: string;
  leaseExpiresAt: UtcIsoString;
  attempts: number;
  resultRef?: EntityRef;
  errorCode?: string;
  createdAt: UtcIsoString;
  updatedAt: UtcIsoString;
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

/** 
 * THE VAULT (Wallet)
 * Holds specific assets belonging to a Character.
 */
export interface Wallet {
  jungleCoins: number;        // The J$ Coin Balance
  // Future: zaps?: number;
  // Future: nfts?: string[];
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
  coordinates?: { lat: number; lng: number }; // Optional precise coordinates on map
}

export interface DigitalSiteMetadata extends BaseSiteMetadata {
  type: SiteType.DIGITAL_SITE;
  digitalType: DigitalSiteType;
  url?: string;
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
export interface Site extends EntityEnvelope {
  name: string;
  description?: string;
  metadata: SiteMetadata;
  status: SiteStatus; // SiteStatus enum - Active or Inactive
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
export interface StockPointV1 {
  siteId: string;
  quantity: number;
}

export interface ItemPricingV1 {
  unitCost: Money;
  additionalCost?: Money;
  targetPrice: Money;
  actualSaleValue?: Money;
}

export interface ItemMediaV1 {
  main?: any;
  mainUrl?: string; // R2 Key
  thumbUrl?: string;
  galleryUrls?: string[];
}

export interface ItemContextV1 {
  kind: 'item-context';
  schemaVersion: 1;
  dimensions?: { width: number; height: number; area: number };
  size?: string;
  year?: number;
  subItemType?: SubItemType;
  sourceFileUrl?: string;
  keepInInventoryAfterSold?: boolean;
  restockToTarget?: boolean;
  targetAmount?: number;
  itemsPerBundle?: number;
  soldThisMonth?: number;
  lastRestockDate?: UtcIsoString;
  soldAt?: UtcIsoString;
}

export interface Item extends EntityEnvelope {
  type: ItemType;
  collection?: Collection;
  status: ItemStatus;
  
  // UNIFIED STOCK SYSTEM: Absolute source of truth for quantity
  stock: StockPointV1[];
  /** Present only on sold archive clones; live inventory derives quantity from stock. */
  quantitySold?: number;

  pricing: ItemPricingV1;
  media?: ItemMediaV1;

  // Ambassador Fields
  sourceTaskId?: EntityId | null;
  sourceRecordId?: EntityId | null;

  context: ItemContextV1;
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
export interface RecurrenceFacetV1 {
  isRecurrentGroup?: boolean;
  isTemplate?: boolean;
  frequencyConfig?: any;
  recurrenceStart?: UtcIsoString;
  recurrenceEnd?: UtcIsoString;
  lastSpawnedDate?: UtcIsoString;
  originTemplateId?: EntityId | null;
}

export interface TaskCounterpartyFacetV1 {
  counterpartyId?: EntityId | null; // e.g. Customer/Beneficiary CharacterId
  role?: CustomerCounterpartyRole;
}

export interface ProductionPlanFacetV1 {
  outputItemId?: EntityId;
  outputItemType?: string;
  outputItemSubType?: SubItemType;
  outputQuantity?: number;
  outputUnitCost?: Money;
  outputItemName?: string;
  outputItemCollection?: Collection;
  outputItemPrice?: Money;
  isNewItem?: boolean;
  isSold?: boolean;
  outputItemStatus?: ItemStatus;
}

export interface FinancialIntentFacetV1 {
  costIntent?: Money;
  revenueIntent?: Money;
}

export interface RewardIntentFacetV1 {
  kind: 'point-reward';
  points: PointAmountV1;
}

export interface TaskContextV1 {
  kind: 'task-context';
  schemaVersion: 1;
  recurrence?: RecurrenceFacetV1;
  counterparty?: TaskCounterpartyFacetV1;
  newCustomerName?: string;
  productionPlan?: ProductionPlanFacetV1;
  financialIntent?: FinancialIntentFacetV1;
  rewardIntent?: RewardIntentFacetV1;
}

export interface ProgressV1 {
  percentage: number; // 0-100
  lastUpdated?: UtcIsoString;
}

export interface TaskScheduleV1 {
  dueDate?: UtcIsoString;
  scheduledStart?: UtcIsoString;
  scheduledEnd?: UtcIsoString;
}

type StructuralTaskType =
  | TaskType.MISSION_GROUP
  | TaskType.RECURRENT_GROUP;

type ExecutableTaskType = Exclude<TaskType, StructuralTaskType>;

export interface TaskBaseV1 extends EntityEnvelope {
  priority: TaskPriority;
  station: Station;
  order: number;
  
  // Hierarchy
  parentId?: EntityId | null;
  outputItemId?: EntityId | null;

  // Ambassador Fields (routing)
  siteId?: EntityId | null;
  targetSiteId?: EntityId | null;
  sourceSaleId?: EntityId | null;
  playerCharacterId?: EntityId | null;
  ownerIds?: EntityId[] | null; // Multi-assignee support
}

export interface TaskGroupV1 extends TaskBaseV1 {
  type: StructuralTaskType;
  status: TaskStatus.NONE;
  context: TaskContextV1;
}

export interface ExecutableTaskV1 extends TaskBaseV1 {
  type: ExecutableTaskType;
  status: Exclude<TaskStatus, TaskStatus.NONE>;
  progress: ProgressV1;
  schedule?: TaskScheduleV1;

  // Lifecycle History
  doneAt?: UtcIsoString;
  collectedAt?: UtcIsoString;

  context: TaskContextV1;
}

export type Task = TaskGroupV1 | ExecutableTaskV1;

// ═══════════════════════════════════════════════════════════════════════════
// SECTION 5: FINANCIAL ENTITIES
// ═══════════════════════════════════════════════════════════════════════════

// Financial category types derived from BUSINESS_STRUCTURE
export type CompanyFinancialCategory = ReturnType<typeof getCompanyAreas>[number];
export type PersonalFinancialCategory = ReturnType<typeof getPersonalAreas>[number];
export type FinancialCategory = CompanyFinancialCategory | PersonalFinancialCategory;

export interface JournalPostingV1 {
  accountId: string;      // e.g. "asset:cash:usd", "liability:accounts-payable", "revenue:sales"
  asset: string;          // e.g. "USD", "J$", "BTC" (AssetCode)
  direction: 'debit' | 'credit';
  amountAtomic: string;   // Strict atomic units to ensure balanced postings
}

export interface FinancialJournalTransactionV1 extends EntityEnvelope {
  transactionDate: UtcIsoString; // OccurredAt
  sourceRecordId: EntityId; // Points back to FinancialRecord, Sale, or Contract
  transactionType:
    | 'financial-record-posted'
    | 'cost-settled'
    | 'revenue-received'
    | 'financial-record-voided'
    | 'financial-record-corrected'
    | 'financial-record-reversed'
    | 'digital-asset-exchanged';
  sequence: number;
  causationId: CommandId;
  idempotencyKey: IdempotencyKey;
  postings: JournalPostingV1[];
  sourceRefs: EntityRef[];
  correctionOf?: EntityId;
  reversalOf?: EntityId;
  status: 'posted' | 'voided';
  postedBy: ActorId;
  notes?: string;
}

export interface FinancialRecordContextV1 {
  kind: 'financial-record-context';
  schemaVersion: 1;
  counterparty?: TaskCounterpartyFacetV1;
  jungleCoins?: number; // J$ internal currency value
  /** Operational payment state replacing legacy root payment booleans. */
  paymentObservation?: {
    paid: boolean;
    charged: boolean;
  };
  productionPlan?: ProductionPlanFacetV1; // Replaces outputItem* fields
  exchangeType?: 'POINTS_TO_J$' | 'J$_TO_USD' | 'J$_TO_ZAPS';
  exchangeCounterAmount?: number;
  newCustomerName?: string;
  notes?: string;
}

/** Operational lifecycle timestamps for a FinancialRecord.
 *
 * Optional during the compatibility phase because legacy records persisted
 * these timestamps at the root (or only in lifecycle logs). New writers must
 * place them here.
 */
export interface FinancialRecordLifecycleV1 {
  doneAt?: UtcIsoString;
  collectedAt?: UtcIsoString;
}

/** 
 * Financial Record (The Event/Document)
 * This replaces the old loose record. It acts as the business document, 
 * whereas FinancialJournalTransactionV1 acts as the strict immutable ledger entry.
 */
export interface FinancialRecord extends EntityEnvelope {
  year: number;
  month: number; // 1-12
  station: Station;
  type: 'company' | 'personal';

  // Ambassador Fields (Links System)
  siteId?: EntityId | null;
  targetSiteId?: EntityId | null;
  characterId?: EntityId | null;
  playerCharacterId?: EntityId | null;
  sourceTaskId?: EntityId | null;
  sourceSaleId?: EntityId | null;
  salesChannel?: Station | null;

  // Financial Data (Calculated via strict Money objects)
  cost: Money;
  revenue: Money;
  netCashflow: Money; // Calculated: revenue - cost

  // Payment Tracking & Lifecycle
  status: FinancialStatus; // Strictly defined lifecycle
  lifecycle?: FinancialRecordLifecycleV1;

  context: FinancialRecordContextV1;
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

/** 
 * Atomic summary totals from rolling counters.
 * Used for instant "Summary View" dashboards.
 */
export interface SummaryTotals {
    revenue: number;
    costs: number;
    profit: number;
    salesRevenue: number;
    salesVolume: number;
    itemsSold: number;
    taskCount: number;
    jungleCoins: number;
    inventoryValue: number;
    inventoryCost: number;
    inventoryJ$: number;
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
  partnerShare: number;      // "Them" (Partner)
}

/** 
 * CONTRACT - The Agreement (Financial Instrument)
 * Defines the business relationship via a list of Clauses.
 */
export interface Contract extends EntityEnvelope {
  // Parties
  principalBusinessId: string;    // Me / The Company
  counterpartyBusinessId: string; // The Partner business (counterparty in contract/sale context)

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
export interface SaleLineSettlementV1 {
  usdExpression?: string;
  crcExpression?: string;
  totalUSD?: number;
  totalCRC?: number;
  originalAmountUSD?: number;
  originalAmountCRC?: number;
  category?: string;
  partnerId?: EntityId | null;
  partnerShare?: number;
  myCommission?: number;
}

export interface SaleLineBase {
  lineId: string;
  kind: 'item' | 'service';
  description?: string;
  taxAmount?: Money;
  discount?: Discount;     // line-level discount
  settlement?: SaleLineSettlementV1;
}

/** Product line: one inventory row */
export interface ItemSaleLine extends SaleLineBase {
  kind: 'item';
  itemId: EntityId;
  quantity: number;
  unitPrice: Money;
}

export interface ServiceLineContextV1 {
  kind: 'service-line-context';
  schemaVersion: 1;
  createTask?: boolean;
  taskId?: EntityId; // Existing task link
  taskType?: TaskType;
  taskParentId?: EntityId;
  taskDueDate?: UtcIsoString;
  taskTargetSiteId?: EntityId;
  taskRewards?: Rewards;
  taskCost?: Money;
  outputItemId?: EntityId;
  productionPlan?: ProductionPlanFacetV1; // Shared from TaskContextV1
}

/** Service sale: optional Task creation */
export interface ServiceLine extends SaleLineBase {
  kind: 'service';
  station: Station;
  revenue: Money;
  context?: ServiceLineContextV1;
}

export type SaleLine = ItemSaleLine | ServiceLine;

export interface SaleContextV1 {
  kind: 'sale-context';
  schemaVersion: 1;
  overallDiscount?: Discount;
  boothFee?: Money;
  paymentBreakdown?: {
    cashUSD?: Money;
    cashCRC?: Money;
    card?: Money;
    bitcoin?: Money;
  };
  newCustomerName?: string;
  source?: string;
  cancelReason?: string;
  cancelledAt?: UtcIsoString;
  m2m?: {
    tokenTrans?: string | null;
    reference?: string | null;
  };
  boothSaleContext?: BoothSaleContextV1;
  rewardIntent?: RewardIntentFacetV1; // Staged rewards
}

export interface BoothSaleBreakdownV1 {
  principalSharePct_Me: number;
  principalSharePct_Partner: number;
  partnerSharePct_Me: number;
  partnerSharePct_Partner: number;
  mySales: number;
  partnerSales: number;
  costMe: number;
  costPartner: number;
}

export interface BoothSaleCalculatedTotalsV1 {
  grossSales: number;
  myNet: number;
  partnerNet: number;
  myCommissions: number;
  partnerCommissions: number;
  breakdown: BoothSaleBreakdownV1;
}

export interface BoothPaymentDistributionV1 {
  bitcoin: number;
  card: number;
  cashCRC: number;
  cashUSD: number;
}

export interface BoothSaleContextV1 {
  principalBusinessId?: EntityId | null;
  counterpartyBusinessId?: EntityId | null;
  contractId?: EntityId | null;
  boothCost: number;
  calculatedTotals?: BoothSaleCalculatedTotalsV1;
  paymentDistribution?: BoothPaymentDistributionV1;
}

export interface SaleLifecycleV1 {
  postedAt?: UtcIsoString;
  chargedAt?: UtcIsoString;
  doneAt?: UtcIsoString;
  cancelledAt?: UtcIsoString;
  collectedAt?: UtcIsoString;
}

export interface SaleWorkflowRefsV1 {
  reconciliationWorkflowId?: WorkflowId;
  restockWorkflowId?: WorkflowId;
  createdTaskId?: EntityId;
}

/** Main Sale entity */
export interface Sale extends EntityEnvelope {
  type: SaleType;
  status: SaleStatus;
  saleDate: UtcIsoString; // Immutable once set

  // Ambassador Fields
  siteId: EntityId;
  counterpartyName?: string;
  characterId?: EntityId | null; // Customer
  partnerId?: EntityId | null;   // Booth partner
  playerCharacterId?: EntityId | null;

  // Lines & Payments
  lines: SaleLine[];
  payments?: Payment[];

  // Precomputed totals
  totals: {
    subtotal: Money;
    discountTotal?: Money;
    taxTotal?: Money;
    totalRevenue: Money;
    totalCost?: Money;
  };

  lifecycle: SaleLifecycleV1;
  workflowRefs?: SaleWorkflowRefsV1;

  context: SaleContextV1;
}





// ═══════════════════════════════════════════════════════════════════════════
// SECTION 7: PLAYER & CHARACTER ENTITIES
// ═══════════════════════════════════════════════════════════════════════════

/** Player Metrics - Performance tracking */
export interface PlayerMetrics {
  LATENCY: number;        // Time to complete a task
  EFFICIENCY: number;     // Coefficient of performance in Task Completion (10/10)
  DISCIPLINE: number;     // Coefficient of performance in Schedule Compliance (20/20) and Inhibition (-0)
  REVIEW: boolean;        // Whether the player has reviewed its accomplishments this month
  REVIEW_DATE: Date;      // Last Date of the review
}



/** Relationship with another entity (future social graph) */
export interface Relationship {
  targetCharacterId: string;     // references another Character entity
  role: CharacterRole;       // how they relate (customer, collaborator, etc.)
  strength?: number;             // 0..100 perceived relationship strength
  since?: Date;                  // when this relationship started
  notes?: string;                // additional context
}

/** Player Badge - Role-based recognition */
export interface PlayerBadge {
  id: string;
  name: string;
  description?: string;
  requiredRoles: CharacterRole[];  // Roles the Character must have to earn this badge
  createdAt: Date;
}

/** Character Achievement - User-defined milestones */
export interface CharacterAchievement {
  id: string;
  name: string;
  description?: string;
  createdAt: Date;
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

export interface PointAmountV1 {
  hp: number;
  fp: number;
  rp: number;
  xp: number;
}

export interface Player extends EntityEnvelope {
  // 1. PROGRESSION & REWARDS - Earned from business activities
  level: number;                 // Player level (starts at 0)
  totalPoints: PointAmountV1;    // Aggregate of all earned points
  points: PointAmountV1;         // Current available (vested) points
  pendingPoints?: PointAmountV1; // Earned but not vested (staged) points

  // 2. CHARACTER MANAGEMENT
  characterId?: EntityId | null;   // 🏛️ Main character managed by this player

  // 3. BADGES
  badges: PlayerBadge[];           // Role-based recognition badges

  // 4. LIFECYCLE & METRICS
  lastActiveAt: UtcIsoString;
  totalTasksCompleted: number;
  totalSalesCompleted: number;
  totalItemsSold: number;
  metrics?: PlayerMetrics;

  isActive: boolean;
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
 * - Token Holders: Token-based role (TOKENHOLDER role, set by Founder)
 * 
 * Key Concepts:
 * - NO login/authentication (managed by Player)
 * - NO RPG stats (Skills, Intellectual Functions, Attributes) - those belong to Player
 * - YES CommColor - KEY for knowing how to communicate with them!
 * - Has CP (Character Points) - different from Player points
 * - Has Character-specific achievements - different from Player achievements
 * - Roles define their relationship to system AND Player
 */
export interface Character extends EntityEnvelope {
  // 1. IDENTITY & AUTHENTICATION
  accountId?: EntityId | null;     // 🏛️ AMBASSADOR FIELD (links to Account entity)

  // 1.1 OPTIONAL CHARACTER CONTACT
  // Characters may be real people without an authenticated Account. These
  // fields describe the contact channel known for the Character and are not
  // required to create or use a Character. When an Account exists, Account is
  // the authentication identity; Character contact remains valid business data.
  contactEmail?: string;
  contactPhone?: string;
  contactPhoneCountryCode?: string;

  // 2. ROLES - Core: defines WHO they are to the system AND Player
  roles: CharacterRole[];    // [PLAYER, FOUNDER, CUSTOMER, FAMILY, TEAM, etc.]

  // 3. COMM COLOR - Communication style
  commColor?: CommColor;         // How to communicate with this person

  // 4. CHARACTER PROGRESSION - Character-specific metrics
  CP?: number;                            // Character Points
  MP?: number;                            // Mastery Points
  skills?: Partial<Record<CognitiveSkill | EmotionalSkill | PracticalSkill, number>>;
  achievements: CharacterAchievement[];   // Character milestones/achievements

  // 5. BUSINESS METRICS
  purchasedAmount: number;       // What they've bought from the business
  beneficiaryPaidAmount?: number; // Amount paid to this character

  // 6. RELATIONSHIPS (Ambassador Fields)
  playerId?: EntityId | null;
  siteId?: EntityId | null;

  // 7. LIFECYCLE
  lastActiveAt: UtcIsoString;
  isActive: boolean;
}

/**
 * Character Projection (UI View)
 * This interface is used by the frontend to combine the Character entity
 * with its database-driven canonical properties (Links, Items, Financials).
 */
export interface CharacterViewV1 {
  character: Character;
  walletProjection?: Wallet;
  inventoryProjection?: EntityId[];
  relationshipProjection?: Relationship[];
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
export interface Business extends EntityEnvelope {
  type: BusinessType;
  taxId?: string;               // Optional Tax ID / SSN / Cedula

  // Connections
  linkedCharacterId?: string | null;  // The person behind this entity (e.g. Akiles)
  linkedSiteId?: string | null;       // The HQ or main contract site (e.g. Ecosystem)

  isActive: boolean;
}

export interface AiAgentEducationState {
  lessonCreated: boolean;
  educated: boolean;
  consolidated: boolean;
  pro: boolean;
}

/**
 * AGENT - Pixelbrain AI Agent (Character Infra-Entity)
 * 
 * Represents an autonomous or semi-autonomous worker in the system.
 */
export interface Agent extends EntityEnvelope {
  slug: string;             // The kebab-case identifier (e.g., "strategist/timer")
  
  // Knowledge & Education
  knowledgeFields: string[]; 
  educationState: AiAgentEducationState;
  
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
export interface Account extends EntityEnvelope {
  // IDENTITY (Single Source of Truth)
  email: string;              // Real person's email (unique, required)
  phone?: string;             // Real person's phone
  phoneCountryCode?: string;  // Optional country code for phone normalization
  requiresFounderAuth?: boolean;

  // AUTHENTICATION (Security Layer)
  passwordHash: string;
  sessionToken?: string;
  lastLoginAt?: UtcIsoString;
  loginAttempts: number;

  // ACCESS CONTROL
  isActive: boolean;
  isVerified: boolean;
  verificationToken?: string;
  resetToken?: string;
  resetTokenExpiry?: UtcIsoString;

  // PRIVACY SETTINGS
  privacySettings: {
    showEmail: boolean;
    showPhone: boolean;
    showRealName: boolean;
  };

  // RELATIONSHIPS
  playerId?: EntityId | null;
  characterId: EntityId;

  // LIFECYCLE
  lastActiveAt: UtcIsoString;
  character?: Character; // UI convenience field
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
export interface Notebook extends EntityEnvelope {
  type: string; // NotebookType enum value
  color: string; // Color theme for visual organization
  icon: string; // Lucide icon name
  notes: Note[];
}

export interface Note extends EntityEnvelope {
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
export interface AISession extends EntityEnvelope {
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
  /** Preset aligned with Pixelbrain agents */
  systemPreset?: AISystemPreset;
  /** Pixelbrain routing: `auto` (LLM routing), `orchestrator`, or specialist id */
  pixelbrainTargetAgent?: string;
}

export * from './player-point-grant';
