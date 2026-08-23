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
  TechnicalSkill,
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
  /** Optional external lookup/reference; map coordinates and shapes are authoritative. */
  googleMapsAddress?: string;
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

/** Shared persisted link envelope. It contains no relationship-specific data. */
export interface LinkCore {
  id: string;
  linkType: LinkType | CanonicalLinkType;
  source: EntityRef;
  target: EntityRef;
  createdAt: UtcIsoString;
  endedAt?: UtcIsoString;
}
/** Runtime storage envelope. Concrete link types define valid relationships. */
export type Link = LinkCore & {
  relationship?: string;
};

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
 * Canonical unidirectional relationship edge with a typed relationship.
 */
export type LinkEnvelopeV1<
  TType extends CanonicalLinkType,
  TRelationship extends { relationship: string }
> = LinkCore & {
  linkType: TType;
  relationship: TRelationship['relationship'];
};

  // ═══════════════════════════════════════════════════════════════════════════
  // CANONICAL LINK DEFINITIONS
  // ═══════════════════════════════════════════════════════════════════════════

export type TaskItemLinkV1 = LinkEnvelopeV1<
  CanonicalLinkType.TASK_ITEM,
  { relationship: 'requested' | 'produced' | 'repaired' }
>;

export type ItemSiteLinkV1 = LinkEnvelopeV1<
  CanonicalLinkType.ITEM_SITE,
  { relationship: 'stored-at' | 'displayed-at' | 'in-transit' }
>;

export type AccountCharacterLinkV1 = LinkEnvelopeV1<
  CanonicalLinkType.ACCOUNT_CHARACTER,
  { relationship: 'primary' }
>;

export type CharacterPlayerLinkV1 = LinkEnvelopeV1<
  CanonicalLinkType.CHARACTER_PLAYER,
  { relationship: 'primary' }
>;

export type CharacterSiteLinkV1 = LinkEnvelopeV1<
  CanonicalLinkType.CHARACTER_SITE,
  { relationship: 'owns' }
>;

export type TaskTaskLinkV1 = LinkEnvelopeV1<
  CanonicalLinkType.TASK_TASK,
  { relationship: 'parent' }
>;

export type TaskSiteLinkV1 = LinkEnvelopeV1<
  CanonicalLinkType.TASK_SITE,
  { relationship: 'performed-at' }
>;

export type TaskCharacterLinkV1 = LinkEnvelopeV1<
  CanonicalLinkType.TASK_CHARACTER,
  { relationship: 'owner' | 'customer' | 'beneficiary' | 'creator' }
>;

export type TaskPlayerLinkV1 = LinkEnvelopeV1<
  CanonicalLinkType.TASK_PLAYER,
  { relationship: 'points-earned' }
>;

export type TaskFinRecLinkV1 = LinkEnvelopeV1<
  CanonicalLinkType.TASK_FINREC,
  { relationship: 'task-record' }
>;

export type ItemCharacterLinkV1 = LinkEnvelopeV1<
  CanonicalLinkType.ITEM_CHARACTER,
  { relationship: 'owned-by' }
>;

export type SaleItemLinkV1 = LinkEnvelopeV1<
  CanonicalLinkType.SALE_ITEM,
  { relationship: 'sold-item' }
>;

export type SaleTaskLinkV1 = LinkEnvelopeV1<
  CanonicalLinkType.SALE_TASK,
  { relationship: 'sold-service' }
>;

export type SaleFinRecLinkV1 = LinkEnvelopeV1<
  CanonicalLinkType.SALE_FINREC,
  { relationship: 'sale-record' }
>;

export type SalePlayerLinkV1 = LinkEnvelopeV1<
  CanonicalLinkType.SALE_PLAYER,
  { relationship: 'points-earned' }
>;

export type SaleCharacterLinkV1 = LinkEnvelopeV1<
  CanonicalLinkType.SALE_CHARACTER,
  { relationship: 'customer' | 'owner' | 'partner' }
>;

export type FinrecSiteLinkV1 = LinkEnvelopeV1<
  CanonicalLinkType.FINREC_SITE,
  { relationship: 'source-site' | 'target-site' }
>;

export type FinrecItemLinkV1 = LinkEnvelopeV1<
  CanonicalLinkType.FINREC_ITEM,
  { relationship: 'item-bought' }
>;

export type SaleSiteLinkV1 = LinkEnvelopeV1<
  CanonicalLinkType.SALE_SITE,
  { relationship: 'sold-at' }
>;

export type SiteSettlementLinkV1 = LinkEnvelopeV1<
  CanonicalLinkType.SITE_SETTLEMENT,
  { relationship: 'located-in' }
>;

export type FinrecCharacterLinkV1 = LinkEnvelopeV1<
  CanonicalLinkType.FINREC_CHARACTER,
  { relationship: 'customer' | 'beneficiary' }
>;

export type SiteSiteLinkV1 = LinkEnvelopeV1<
  CanonicalLinkType.SITE_SITE,
  { relationship: 'moved-to' }
>;

export type CharacterContractLinkV1 = LinkEnvelopeV1<
  CanonicalLinkType.CHARACTER_CONTRACT,
  // owner is the issuing Character; counterparty is the other Character.
  { relationship: 'owner' | 'counterparty' }
>;

export type CharacterBusinessLinkV1 = LinkEnvelopeV1<
  CanonicalLinkType.CHARACTER_BUSINESS,
  { relationship: 'owns' | 'represents' }
>;

/**
 * The Strict Master Union for all Relationships
 */
export type CanonicalLink =
  | TaskItemLinkV1
  | ItemSiteLinkV1
  | AccountCharacterLinkV1
  | CharacterPlayerLinkV1
  | CharacterSiteLinkV1
  | TaskTaskLinkV1
  | TaskSiteLinkV1
  | TaskCharacterLinkV1
  | TaskPlayerLinkV1
  | TaskFinRecLinkV1
  | ItemCharacterLinkV1
  | SaleItemLinkV1
  | SaleTaskLinkV1
  | SaleFinRecLinkV1
  | SalePlayerLinkV1
  | SaleCharacterLinkV1
  | SaleSiteLinkV1
  | SiteSettlementLinkV1
  | FinrecSiteLinkV1
  | FinrecItemLinkV1
  | TaskFinRecLinkV1
  | FinrecCharacterLinkV1
  | SiteSiteLinkV1
  | CharacterContractLinkV1
  | CharacterBusinessLinkV1;


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
 * Wallet read model.
 *
 * A wallet balance is projected from the financial ledger and canonical Links
 * for a Character or Player. It is not authoritative balance state on either
 * entity.
 */
export interface Wallet {
  jungleCoins: number;        // Projected J$ balance
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

/** Root classification shared by all Site variants. */
export type SiteSubtype = PhysicalBusinessType | DigitalSiteType | SystemSiteType;

/** Site Entity - Core entity for all locations */
export interface Site extends EntityEnvelope {
  name: string;
  description?: string;
  type: SiteType;
  subtype: SiteSubtype;
  /** Physical-site fields, required/used when `type` is `physical`. */
  settlementId?: string;
  googleMapsAddress?: string;
  coordinates?: { lat: number; lng: number };
  /** Digital-site field, used when `type` is `digital-site`. */
  url?: string;
  /** @deprecated Legacy nested classification. New persistence uses root `type`/`subtype`. */
  metadata?: SiteMetadata;
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
  collection?: Collection;
  dimensions?: { width: number; height: number; area: number };
  size?: string;
  year?: number;
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
  /** Required classification used by inventory tabs and subtype selectors. */
  subItemType: SubItemType;
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
 * - Transitional routing fields: siteId, targetSiteId, parentId; canonical relationships are Links
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
  points: PointAmountV1;
}

export interface TaskContextV1 {
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

/** Canonical operational timestamps for executable Tasks. */
export interface TaskLifecycleV1 {
  doneAt?: UtcIsoString;
  collectedAt?: UtcIsoString;
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
  context?: TaskContextV1;
}

export interface ExecutableTaskV1 extends TaskBaseV1 {
  type: ExecutableTaskType;
  status: Exclude<TaskStatus, TaskStatus.NONE>;
  progress: ProgressV1;
  schedule?: TaskScheduleV1;

  lifecycle?: TaskLifecycleV1;

  // Transitional runtime aliases. Canonical persisted rows use lifecycle.
  doneAt?: UtcIsoString;
  collectedAt?: UtcIsoString;

  context?: TaskContextV1;
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

  // Read-only/transient command compatibility. The persistence boundary strips
  // these values; canonical relationships live in the Link Registry.
  /** @deprecated transient relation input; use FINREC_SITE Links. */
  siteId?: EntityId | null;
  /** @deprecated transient relation input; use FINREC_SITE Links. */
  targetSiteId?: EntityId | null;
  /** @deprecated transient relation input; use FINREC_CHARACTER Links. */
  characterId?: EntityId | null;
  /** @deprecated transient creator input; never persisted. */
  playerCharacterId?: EntityId | null;
  /** @deprecated transient relation input; use FINREC_TASK Links. */
  sourceTaskId?: EntityId | null;
  /** @deprecated transient relation input; use FINREC_SALE Links. */
  sourceSaleId?: EntityId | null;
  salesChannel?: Station | null;

  // Financial Data (Calculated via strict Money objects)
  cost: Money;
  revenue: Money;
  netCashflow: Money; // Calculated: revenue - cost

  // Payment Tracking & Lifecycle
  status: FinancialStatus; // Strictly defined lifecycle
  lifecycle?: FinancialRecordLifecycleV1;

  context?: FinancialRecordContextV1;
}

/**
 * Transient relationship input accepted by financial commands. These values
 * may be used to reconcile canonical Links, but are never persisted on the
 * FinancialRecord entity.
 */
export interface FinancialRecordRelationInput {
  siteId?: EntityId | null;
  targetSiteId?: EntityId | null;
  characterId?: EntityId | null;
  playerCharacterId?: EntityId | null;
  sourceTaskId?: EntityId | null;
  sourceSaleId?: EntityId | null;
  characterRelationship?: CustomerCounterpartyRole | null;
}

export type FinancialRecordRuntime = FinancialRecord & {
  __financialRelations?: FinancialRecordRelationInput;
};

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
 * Defines agreement terms via a list of Clauses. Party identity is resolved
 * through CHARACTER_CONTRACT links; Business is reached from Character via
 * CHARACTER_BUSINESS when needed by a workflow.
 */
export interface Contract extends EntityEnvelope {
  // Current agreement state. The Contract is not a task and has no doneAt.
  status: ContractStatus;

  // The "Real World" Terms: A list of specific agreements
  clauses: ContractClause[];

  // Metadata
  isExclusive?: boolean;
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
  amount: Money;
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
  /**
   * When true, this service line represents a charged task and the sale
   * workflow creates that Task. Booth partner-selling services intentionally
   * omit this flag: they are recurring sales services, not task work.
   */
  createTask?: boolean;
  /** Canonical description sent to the Task created for this service line. */
  taskDescription?: string;
  /** Canonical station sent to the Task created for this service line. */
  taskStation?: Station;
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

/**
 * Service sale line. Direct sales may use it to create a Task; Booth sales
 * also use it for the reciprocal service of selling a partner's products.
 */
export interface ServiceLine extends SaleLineBase {
  kind: 'service';
  /** @deprecated Transient compatibility input; use context.taskStation for Task creation. */
  station?: Station;
  revenue: Money;
  context?: ServiceLineContextV1;
}

export type SaleLine = ItemSaleLine | ServiceLine;

export interface SaleContextV1 {
  overallDiscount?: Discount;
  /** Canonical booth operating cost/rental amount, stored in USD. */
  boothCost?: Money;
  /** Active Booth contract used by settlement calculations. */
  contractId?: EntityId | null;
  newCustomerName?: string;
  source?: string;
  cancelReason?: string;
  cancelledAt?: UtcIsoString;
  m2m?: {
    tokenTrans?: string | null;
    reference?: string | null;
  };
  boothSaleContext?: BoothSaleContextV1;
  onlineSaleContext?: OnlineSaleContextV1;
  rewardIntent?: RewardIntentFacetV1; // Staged rewards
}

/** Customer-facing additions included in an Online checkout total. */
export interface OnlineSaleContextV1 {
  checkoutCharges?: {
    shipping?: Money;
    transactionFee?: Money;
    processingFee?: Money;
  };
}

export interface BoothSaleContextV1 {
  /** Legacy Booth party references; new writes use canonical Links and Sale.context.contractId. */
  principalBusinessId?: EntityId | null;
  counterpartyBusinessId?: EntityId | null;
}

export interface SaleLifecycleV1 {
  /** Canonical timestamp when the sale payment was received/charged. */
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
  /** @deprecated Transient legacy UI/read compatibility. Canonical Sale creation time is createdAt. */
  saleDate?: UtcIsoString;

  // Ambassador Fields
  /** @deprecated Transient command/read-model compatibility field. Canonical authority is SALE_SITE. */
  siteId?: EntityId;
  /** @deprecated Transient command/read-model compatibility field. Canonical customer authority is SALE_CHARACTER. */
  counterpartyName?: string;
  /** @deprecated Transient command input. Canonical customer authority is SALE_CHARACTER. */
  characterId?: EntityId | null; // Customer
  /** @deprecated Transient Booth input; canonical partner authority is SALE_CHARACTER(partner). */
  partnerId?: EntityId | null;
  /** @deprecated Transient command input. Canonical owner authority is SALE_CHARACTER(owner). */
  ownerId?: EntityId | null;

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

  context?: SaleContextV1;
}





// ═══════════════════════════════════════════════════════════════════════════
// SECTION 7: PLAYER ENTITY
// ═══════════════════════════════════════════════════════════════════════════

/** Player Badge - Role-based recognition */
export interface PlayerBadge {
  id: string;
  name: string;
  description?: string;
  requiredRoles: CharacterRole[];  // Roles the Character must have to earn this badge
  createdAt: Date;
}

/** Player achievement - game reward/progression recognition. */
export interface PlayerAchievement {
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
 * Player → Rewards & Currency → Player Gamification → Character Management
 * 
 * Key Concepts:
 * - Controls ALL business operations (tasks, inventory, sales)
 * - Earns Points (HP, FP, RP, XP) as REWARDS for real-life actions
 * - May receive J$ through the points-exchange workflow, but does not own an authoritative J$ field
 * - J$ is a financial-ledger asset and its balance is a projection, not Player state
 * - Player progression is based on points, levels, achievements, and badges
 * - Additional player progression systems may come in future versions
 */

export interface PointAmountV1 {
  hp: number;
  fp: number;
  rp: number;
  xp: number;
}

/**
 * Player reward projection.
 *
 * `pending` is earned by completed but uncollected work.
 * `vested` is the lifetime amount released by collection.
 * `current` is the amount currently available to exchange.
 * `exchanged` is the lifetime amount consumed by an exchange.
 * `historic` is the lifetime amount earned, including pending and vested
 * rewards and amounts already exchanged.
 */
export interface PlayerRewardsV1 {
  points: {
    pending: PointAmountV1;
    vested: PointAmountV1;
    current: PointAmountV1;
    exchanged: PointAmountV1;
    historic: PointAmountV1;
  };
  achievements: PlayerAchievement[];
  badges: PlayerBadge[];
}

export interface Player extends EntityEnvelope {
  // 1. PROGRESSION & REWARDS - Earned from business activities
  level: number;                 // Player level (starts at 0)
  rewards: PlayerRewardsV1;

  /** @deprecated Read-only migration aliases. New writes use `rewards`. */
  totalPoints?: PointAmountV1;
  /** @deprecated Read-only migration alias for `rewards.points.current`. */
  points?: PointAmountV1;
  /** @deprecated Read-only migration alias for `rewards.points.pending`. */
  pendingPoints?: PointAmountV1;

  // 2. CHARACTER MANAGEMENT
  /** @deprecated Read-only/transient migration input. Canonical authority is CHARACTER_PLAYER. */
  characterId?: EntityId | null;

  // 3. BADGES
  /** @deprecated Read-only migration alias; badges now live in rewards. */
  badges?: PlayerBadge[];

  // 4. LIFECYCLE
  lastActiveAt: UtcIsoString;

  isActive: boolean;
}

// ═══════════════════════════════════════════════════════════════════════════
// SECTION 7.1: CHARACTER ENTITY
// ═══════════════════════════════════════════════════════════════════════════

/** Character Qualification - Character-specific progression evidence */
export interface CharacterQualification {
  id: string;
  name: string;
  description?: string;
  createdAt: Date;
}

/**
 * CHARACTER ENTITY - People (Customers, Family, Collaborators, Team Members)
 * 
 * Represents all people who interact with the business:
 * - External: Customers, family, collaborators
 * - Internal: The Player's identity in the game world (player-character)
 * 
 * Architecture Hierarchy:
 * Character → Roles → Information → CommColor → Character Points CP → Qualifications
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
 * - NO login/authentication (managed by Account)
 * - YES RPG/skill progression (Cognitive, Emotional, and Technical skills)
 * - YES CommColor - KEY for knowing how to communicate with them!
 * - Has CP and MP (Character/Mastery Points) - different from Player points
 * - Has Character-specific qualifications - different from Player achievements
 * - May receive J$ as a financial counterparty; any wallet display is a ledger projection
 * - Roles define their relationship to system AND Player
 */
export interface Character extends EntityEnvelope {
  // 1. IDENTITY & AUTHENTICATION

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
  skills?: Partial<Record<CognitiveSkill | EmotionalSkill | TechnicalSkill, number>>;
  qualifications: CharacterQualification[]; // Character qualifications

  // 5. RELATIONSHIPS (Ambassador Fields)
  /** @deprecated Read-only/transient migration input. Canonical authority is CHARACTER_PLAYER. */
  playerId?: EntityId | null;
  /** @deprecated Read-only/transient migration input. Canonical authority is CHARACTER_SITE. */
  siteId?: EntityId | null;

  // 6. LIFECYCLE
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
}

// ═══════════════════════════════════════════════════════════════════════════
// SECTION 7.2: CHARACTER INFRA-ENTITIES (Legal Entities)
// ═══════════════════════════════════════════════════════════════════════════

/**
 * BUSINESS - The "Business Identity" (Business Persona Layer)
 * 
 * Separates the Persona (Character) from the Business (Tax/Legal).
 * Can be linked to a Site (HQ) and a Character (Representative).
 */
export interface Business extends EntityEnvelope {
  type: BusinessType;
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
// - Player has gamification progression: levels, rewards, points, achievements, and badges
// - Character has RPG/skill progression: CP, MP, Cognitive, Emotional, and Technical skills
// - BOTH have CommColor (Player for self-awareness, Character for knowing how to communicate with them)
// - Player may receive J$ through points exchange; Character may receive J$ as a financial counterparty
// - Neither stores an authoritative J$ balance; wallet views are financial-ledger projections
// - Main currency is USD ($), Jungle Coins (J$) are crypto-like in-game asset ($10 each)
// - Points can be exchanged for Jungle Coins, which can be exchanged for USD
// - Links System handles all relationships (canonical CHARACTER_PLAYER)

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
 * - Links to Character (required); an optional Player is reached through Character
 */
/**
 * Safe Account view used by TheGame UI, APIs, and entity boundaries.
 *
 * Credential material belongs to the private IAM record in lib/iam-service.ts
 * and must never be represented by this application-facing type.
 */
export interface Account extends EntityEnvelope {
  // IDENTITY (single source of truth; IAM-owned)
  name: string;
  email: string;
  phone?: string;
  phoneCountryCode?: string;

  // SAFE ACCESS STATUS (not credentials)
  isActive: boolean;
  isVerified: boolean;
  loginAttempts: number;

  // PRIVACY VIEW
  privacySettings: {
    showEmail: boolean;
    showPhone: boolean;
    showRealName: boolean;
  };

  // RELATIONSHIP VIEW (ACCOUNT_* Links are authoritative)

  // LIFECYCLE / UI HYDRATION
  lastActiveAt: UtcIsoString;
  character?: Character;
  /** Compatibility discriminator for safe M2M account views. */
  type?: string;
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
// - Founder/Player: Account + Character (FOUNDER, PLAYER roles) + optional Player → full access

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

