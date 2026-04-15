// types/enums.ts
// All enums and constants - single source of truth for application state

// ============================================================================
// BUSINESS STRUCTURE - Single source of truth for sections and stations
// ============================================================================

/** Business Structure - single source of truth; values are kebab-case slugs for storage/API. */
export const BUSINESS_STRUCTURE = {
  admin: ['strategy', 'finances', 'team', 'inventory', 'transport', 'rents', 'partnerships', 'projects', 'items'],
  research: ['library', 'studies', 'processes', 'reviews', 'ebooks', 'innovation', 'classes'],
  dev: ['systems-dev'],
  'art-design': ['paint', 'digital-art', 'design', 'animation'],
  'maker-space': ['craft'],
  sales: ['direct-sales', 'booth-sales', 'network', 'marketing', 'online-sales', 'portfolio', 'dispatches', 'gallery-store', 'bookings'],
  personal: ['family', 'food', 'health', 'rewards', 'transport-p', 'rent-p', 'other-p'],
} as const;

// Areas (top-level business areas)
export const COMPANY_AREAS = ['admin', 'research', 'dev', 'art-design', 'maker-space', 'sales'] as const;
export const PERSONAL_AREAS = ['personal'] as const;
export const ALL_AREAS = [...COMPANY_AREAS, ...PERSONAL_AREAS] as const;

// Type exports
export type Area = typeof ALL_AREAS[number];
export type Station = typeof BUSINESS_STRUCTURE[Area][number];

// ============================================================================
// STATION CATEGORIES - Derived from BUSINESS_STRUCTURE for SearchableSelect
// ============================================================================

/** Station categories for SearchableSelect grouping - derived from BUSINESS_STRUCTURE */
export const STATION_CATEGORIES = {
  admin: BUSINESS_STRUCTURE.admin,
  research: BUSINESS_STRUCTURE.research,
  dev: BUSINESS_STRUCTURE.dev,
  'art-design': BUSINESS_STRUCTURE['art-design'],
  'maker-space': BUSINESS_STRUCTURE['maker-space'],
  sales: BUSINESS_STRUCTURE.sales,
  personal: BUSINESS_STRUCTURE.personal,
} as const;

/** Company areas shown on finance dashboard breakdown (excludes dev). */
export const FINANCE_DASHBOARD_COMPANY_AREA_KEYS = [
  'admin',
  'research',
  'art-design',
  'maker-space',
  'sales',
] as const;

// ============================================================================
// LOCATION STRUCTURE
// ============================================================================

/** Geographic Location Structure - Single source of truth for geographic hierarchy */
export const LOCATION_STRUCTURE = {
  'north-america': {
    'united-states': ['united-states'],
    canada: ['canada']
  },
  'central-america': {
    'costa-rica': ['puntarenas', 'san-jose', 'guanacaste', 'limon'],
    panama: ['panama'],
    nicaragua: ['nicaragua'],
    'el-salvador': ['el-salvador']
  },
  'south-america': {
    venezuela: ['margarita-island', 'caracas'],
    colombia: ['bogota'],
    uruguay: ['montevideo'],
    chile: ['santiago'],
    argentina: ['buenos-aires'],
    brasil: ['rio-de-janeiro'],
    peru: ['lima']
  },
} as const;

// Export the structure for components to use
export const LOCATION_HIERARCHY = LOCATION_STRUCTURE;

/** Settlement categories for SearchableSelect grouping - based on LOCATION_STRUCTURE regions */
// SETTLEMENT_CATEGORIES removed - now using dynamic Settlement entities with country field

// ============================================================================
// SITE ENUMS
// ============================================================================

/** Physical Site Business Types */
export enum PhysicalBusinessType {
  STORE = 'store',                          // Physical store (Smoking Lounge, Tagua...)
  SELLING_POINT = 'selling-point',          // Stores, Ferias, Festivals that buy at discount (El Hornito, Eco Feria, Envision...)
  TEACHING_SPACE = 'teaching-space',        // Teaching sites (Jungle Academy...)
  HQ = 'hq',                                // HQ sites (Home, Feria Box...)
  ART_GALLERY = 'art-gallery',              // Gallery sites (Gallery 1084...)
  DESIGN_SPACE = 'design-space',            // Design hub sites (Design Hub...)
  WORKSHOP = 'workshop',                    // Workshop sites (Workshop...)
  STORAGE = 'storage',                      // Warehouse sites (Home, Feria Box...)
  PROVIDER = 'provider',                    // Provider sites (Colono, Iguana Verde, Art Depot...)
  LIVING_SPACE = 'living-space',            // Living sites (Rents for Living Space...)
  BANK = 'bank',                            // Bank sites (BCR, BN...)
}

/** Cloud Digital Types */
export enum DigitalSiteType {
  REPOSITORY = 'repository',                  // Repos
  DATABASE = 'database',                      // Drives, Cloud Storage
  WEBSITEAPP = 'website-app',                 // Websites Apps
  NFT_PLATFORM = 'nft-platform',              // NFT Platforms
  SOCIAL_MEDIA = 'social-media',              // Social Media Platforms
  LLM_AGENT = 'llm-agent',                    // LLM Agents (ChatGPT, Gemini, Claude, etc.)
  BANKING_PLATFORM = 'banking-platform',      // Banking Platforms
}

/** System Site Purposes */
export enum SystemSiteType {
  UNIVERSAL_TRACKING = 'universal-tracking', // Items no longer at specific sites
  SOLD_ITEMS = 'sold-items',         // Sold items tracking
  ARCHIVED = 'archived',           // Archived/historical items
}

/** SiteType enum for backward compatibility with entities */
export enum SiteType {
  PHYSICAL = 'physical',  // Physical locations with addresses
  DIGITAL = 'digital',    // Digital/cloud storage locations
  SYSTEM = 'system'       // System-managed locations
}

/** Status of Sites - controls state */
export enum SiteStatus {
  ACTIVE = 'active',    // Site is in use
  INACTIVE = 'inactive',  // Site is not being used
}

/** Site categories for UI organization and SearchableSelect grouping */
export const SITE_CATEGORIES = {
  [SiteType.PHYSICAL]: [
    PhysicalBusinessType.STORE,
    PhysicalBusinessType.SELLING_POINT,
    PhysicalBusinessType.TEACHING_SPACE,
    PhysicalBusinessType.HQ,
    PhysicalBusinessType.ART_GALLERY,
    PhysicalBusinessType.DESIGN_SPACE,
    PhysicalBusinessType.WORKSHOP,
    PhysicalBusinessType.STORAGE,
    PhysicalBusinessType.PROVIDER,
    PhysicalBusinessType.LIVING_SPACE,
    PhysicalBusinessType.BANK,
  ],
  [SiteType.DIGITAL]: [
    DigitalSiteType.REPOSITORY,
    DigitalSiteType.DATABASE,
    DigitalSiteType.WEBSITEAPP,
    DigitalSiteType.NFT_PLATFORM,
    DigitalSiteType.SOCIAL_MEDIA,
    DigitalSiteType.LLM_AGENT,
    DigitalSiteType.BANKING_PLATFORM,
  ],
  [SiteType.SYSTEM]: [
    SystemSiteType.UNIVERSAL_TRACKING,
    SystemSiteType.SOLD_ITEMS,
    SystemSiteType.ARCHIVED,
  ]
} as const;

// ============================================================================
// TASK ENUMS
// ============================================================================

/** Mission Tree & hierarchies */
export enum TaskType {
  MISSION_GROUP = 'mission-group',   // Folder/container for missions tree tasks
  MISSION = 'mission',
  MILESTONE = 'milestone',
  GOAL = 'goal',
  ASSIGNMENT = 'assignment',
  RECURRENT_GROUP = 'recurrent-group',      // Folder/container for recurrent tree tasks
  RECURRENT_TEMPLATE = 'recurrent-template',   // Sets frequency pattern for instances
  RECURRENT_INSTANCE = 'recurrent-instance',    // Spawned with due date from templates or Individual creation
  AUTOMATION = 'automation'            // Automation tasks (e.g., monthly close) for User and Agents
}

/** Task categories for UI organization and SearchableSelect grouping */
export const TASK_CATEGORIES = {
  MISSION: [
    TaskType.MISSION_GROUP,
    TaskType.MISSION,
    TaskType.MILESTONE,
    TaskType.GOAL,
    TaskType.ASSIGNMENT,
  ],
  RECURRENT: [
    TaskType.RECURRENT_GROUP,
    TaskType.RECURRENT_TEMPLATE,
    TaskType.RECURRENT_INSTANCE,
  ],
  AUTOMATION: [TaskType.AUTOMATION],
} as const;

/** Recurrent task frequency options */
export enum RecurrentFrequency {
  ONCE = 'once',
  DAILY = 'daily',
  WEEKLY = 'weekly',
  MONTHLY = 'monthly',
  CUSTOM = 'custom',
  ALWAYS = 'always'
}

/** Workflow state of a Task */
export enum TaskStatus {
  CREATED = 'created',
  ON_HOLD = 'on-hold',
  IN_PROGRESS = 'in-progress',
  FINISHING = 'finishing',
  DONE = 'done',
  COLLECTED = 'collected',
  FAILED = 'failed',
  NONE = 'none',        // no status
}

/** Optional urgency flag (--► replaces "Awaiting / Urgent …") */
export enum TaskPriority {
  NOT_NOW = 'not-now',
  SLOW = 'slow',
  NORMAL = 'normal',
  IMPORTANT = 'important',
  URGENT = 'urgent',
}

// ============================================================================
// FINANCIAL ENUMS
// ============================================================================

/** Status of Records (completed tasks) */
export enum FinancialStatus {
  PENDING = 'pending',  // When isNotPaid or isNotCharged - excluded from cashflow
  DONE = 'done',        // When paid/charged and processed
}

/** In-game currency system */
export enum Currency {
  USD = 'USD',              // US Dollars - primary business currency for inventories, payments, etc.
  JUNGLE_COINS = 'J$',               // Jungle Coins - reward tokens that convert to USD (like Zelda gems)
  BTC = 'BTC',              // Bitcoin - cryptocurrency asset
  CRC = 'CRC',              // Costa Rica Colon - local currency
}


// ============================================================================
//  POINTS ENUMS
// ============================================================================

/** Points System Enums */
export enum PointType {
  XP = 'xp',   // Experience Points
  RP = 'rp',    // Research Points
  FP = 'fp',    // Family Points 
  HP = 'hp',    // Health Points
}

// ============================================================================
// ITEM ENUMS
// ============================================================================

/** All Items - Products, Bundles, Materials and Equipment */
export enum ItemType {
  // MODEL_ITEM - Individual products that can be separated by model, subtype, site and collection
  DIGITAL = 'digital',
  ARTWORK = 'artwork',
  PRINT = 'print',
  STICKER = 'sticker',
  MERCH = 'merch',
  CRAFT = 'craft',
  // BUNDLE_ITEM - Business Logic Items that are Packs of the same Type of Item.
  BUNDLE = 'bundle',            // Pack of Stickers or Prints
  // RESOURCE_ITEM - Materials and Equipment for production
  MATERIAL = 'material',
  EQUIPMENT = 'equipment',
}

/** Item Categories for UI organization and business logic */
export enum ItemCategory {
  MODEL_ITEM = 'MODEL_ITEM',      // Individual products (Digital, Artwork, Print, Sticker, Merch)
  BUNDLE_ITEM = 'BUNDLE_ITEM',     // Business Logic Items (Sticker Bundle, Print Bundle)
  RESOURCE_ITEM = 'RESOURCE_ITEM',   // Production resources (Material, Equipment)
}

/** Inventory tab values - Organized by Item Categories */
export enum InventoryTab {
  // MODEL_ITEM tabs
  DIGITAL = 'digital',
  ARTWORKS = 'artworks',
  STICKERS = 'stickers',
  PRINTS = 'prints',
  MERCH = 'merch',
  CRAFT = 'crafts',
  // BUNDLE_ITEM tabs
  BUNDLES = 'bundles',    // Business Logic Items (Bundles)
  // RESOURCE_ITEM tabs
  MATERIALS = 'materials',
  EQUIPMENT = 'equipment',
  // LIFECYCLE tabs
  SOLD_ITEMS = 'sold-items',  // Items that have been sold
}

/** Lifecycle state of ONE Item /SKU */
export enum ItemStatus {
  CREATED = 'created',
  FOR_SALE = 'for-sale',
  SOLD = 'sold',
  TO_ORDER = 'to-order',
  TO_DO = 'to-do',
  GIFTED = 'gifted',
  RESERVED = 'reserved',
  CONSIGNMENT = 'consignment',
  OBSOLETE = 'obsolete',
  DAMAGED = 'damaged',
  IDLE = 'idle',
}

/** Creative collections */
export enum Collection {
  NO_COLLECTION = 'no-collection',
  ORGANIC_IMAGINARY = 'organic-imaginary',
  ANIMAL_KINGDOM = 'animal-kingdom',
  MUSHLAND = 'mushland',
  SEVEN_ELEMENTS = 'seven-elements',
  BITCOIN = 'bitcoin',
  DOPE_CREW = 'dope-crew',
  WORDS = 'words',
  FRUITS_VEGGIES = 'fruits-veggies',
  FLOWERS = 'flowers',
  KINGS_QUEENS = 'kings-queens',
  POLYGONAL_HD = 'polygonal-hd',
  RELIQUIAS = 'reliquias',
  BITUAYA = 'bituaya',
  LANDSCAPES = 'landscapes',
  EXILIADO = 'exiliado',
}

// ============================================================================
// ITEM SUBTYPES ENUMS
// ============================================================================

/** Digital Item SubTypes */
export enum DigitalSubType {
  DIGITAL_ART = "digital-art",
  DIGITIZATION = "digitization",
  ANIMATION = "animation",
  NFT = "nft"
}

/** Artwork Item SubTypes */
export enum ArtworkSubType {
  ACRYLIC_CANVAS = "acrylic-on-canvas",
  ACRYLIC_WOOD = "acrylic-on-wood",
  ASSEMBLAGE = "assemblage",
  MURAL = "mural",
  FURNITURE_ART = "furniture-art"
}

/** Print Item SubTypes */
export enum PrintSubType {
  GICLEE_PRINT = "giclee-print",
  POSTER_PRINT = "poster-print",
  PRINT_ON_FRAME = "print-on-frame"
}

/** Sticker Item SubTypes */
export enum StickerSubType {
  BRILLIANT_WHITE = "brilliant-white",
  REFLECTIVE = "reflective",
  MATE = "mate"
}

/** Merch Item SubTypes */
export enum MerchSubType {
  T_SHIRT = "t-shirt",
  BAG = "bag",
  SHOES = "shoes",
  RASHGUARD = "rashguard",
  SPORTS_BRA = "sports-bra",
  T_SHIRT_ALLOVER = "t-shirt-allover",
  MERCHANDISE = "merchandise"
}

/** Craft Item SubTypes */
export enum CraftSubType {
  FRAME = "frame",
  FURNITURE = "furniture",
  STANDS = "stands",
}

/** Bundle Item SubTypes */
export enum BundleSubType {
  STICKERS = "sticker",
  PRINTS = "print"
}

/** Material Item SubTypes */
export enum MaterialSubType {
  ART_MATERIAL = "art-material",
  DESIGN_MATERIAL = "design-material",
  WORKSHOP_MATERIAL = "workshop-material"
}

/** Equipment Item SubTypes */
export enum EquipmentSubType {
  ART_EQUIPMENT = "art-equipment",
  DESIGN_EQUIPMENT = "design-equipment",
  WORKSHOP_EQUIPMENT = "workshop-equipment",
  SALES_EQUIPMENT = "store-equipment",
  PERSONAL_EQUIPMENT = "personal-equipment",
  VEHICLE = "vehicle",
}

// ============================================================================
// SALES ENUMS
// ============================================================================

/** Sales transaction types */
export enum SaleType {
  DIRECT = 'direct',
  BOOTH = 'booth',
  NETWORK = 'network',
  ONLINE = 'online',
}

/** Sales transaction status */
export enum SaleStatus {
  PENDING = 'pending',      // Sale isNotCharged
  ON_HOLD = 'on-hold',      // Waiting for other reasons
  CHARGED = 'charged',      // Sale is Charged
  COLLECTED = 'collected',  // Sale is Collected for reporting
  CANCELLED = 'cancelled',  // Sale is Cancelled
}

/** Payment methods for sales */
export enum PaymentMethod {
  // Regular payment methods
  FIAT_USD = 'fiat-usd',
  FIAT_CRC = 'fiat-crc',
  BTC = 'btc',
  CARD = 'card',
  SINPE = 'sinpe',
  PAYPAL = 'paypal',
  WIRE_TRANSFER = 'wire-transfer',

  // Special payment methods
  GIFT = 'gift',
  EXCHANGE = 'exchange',
  OTHER = 'other',
}

/** Payment method categories for UI organization */
export const PAYMENT_METHOD_CATEGORIES: {
  REGULAR: PaymentMethod[];
  SPECIAL: PaymentMethod[];
} = {
  REGULAR: [
    PaymentMethod.FIAT_USD,
    PaymentMethod.FIAT_CRC,
    PaymentMethod.BTC,
    PaymentMethod.CARD,
    PaymentMethod.SINPE,
    PaymentMethod.PAYPAL,
    PaymentMethod.WIRE_TRANSFER,
  ],
  SPECIAL: [PaymentMethod.GIFT, PaymentMethod.EXCHANGE, PaymentMethod.OTHER],
};

// ============================================================================
// CHARACTER ENUMS
// ============================================================================

/** Character roles */
export enum CharacterRole {
  FOUNDER = 'founder',
  TEAM = 'team',
  AI_AGENT = 'ai-agent',
  CUSTOMER = 'customer',
  BENEFICIARY = 'beneficiary',
  PLAYER = 'player',
  APPRENTICE = 'apprentice',
  FAMILY = 'family',
  TOKENHOLDER = 'token-holder',
  PARTNER = 'partner',
  ADMIN = 'admin',
  DESIGNER = 'designer',
  MAKER = 'maker',
  SELLER = 'seller',
  RESEARCHER = 'researcher',
  DEVELOPER = 'developer',
  BOSS = 'boss',
  ASSISTANT = 'assistant',
  COLLABORATOR = 'collaborator',
  STUDENT = 'student',
  FRIEND = 'friend'
}

/** Character role types for UI organization and permissions */
export const CHARACTER_ROLE_TYPES = {
  REGULAR: [
    CharacterRole.ADMIN,
    CharacterRole.RESEARCHER,
    CharacterRole.DEVELOPER,
    CharacterRole.DESIGNER,
    CharacterRole.MAKER,
    CharacterRole.SELLER,
    CharacterRole.COLLABORATOR,
    CharacterRole.BOSS,
    CharacterRole.ASSISTANT,
    CharacterRole.STUDENT,
    CharacterRole.FRIEND
  ],
  SPECIAL: [
    CharacterRole.FOUNDER,
    CharacterRole.PLAYER,
    CharacterRole.APPRENTICE,
    CharacterRole.TEAM,
    CharacterRole.FAMILY,
    CharacterRole.TOKENHOLDER,
    CharacterRole.PARTNER,
    CharacterRole.AI_AGENT,
    CharacterRole.CUSTOMER,
    CharacterRole.BENEFICIARY
  ]
} as const;

export enum IntelectualFunction {
  SELF_AWARE = 'self-awareness',     // Self-monitoring / error monitoring: Notice performance drift, catch mistakes, adjust in-flight.
  EMOTION_CONTROL = 'emotion-control',    // Emotional regulation: Modulate frustration, stress, and reward-seeking so you can execute.
  DECISION_MAKING = 'decision-making',    // Decision-making (valuation & risk): Choose under uncertainty; weigh cost/benefit and risk.
  CREATIVITY = 'creativity',         // ability to generate original ideas, view situations from new perspectives, and produce novel outcomes. 
  PROBLEM_SOLVING = 'problem-solving',    // Problem solving (strategy generation): Diagnose blockers, generate options, test and iterate.
  SELF_CONTROL = 'self-control',       // Inhibitory control: Resist impulses and delay gratification to stay aligned with goals.
  WORK_MEMORY = 'working-memory',     // Hold and manipulate information in mind while acting.
  ADAPTABILITY = 'adaptability',       // Cognitive flexibility: Switch tasks/strategies and adapt when conditions change.
  INITIATIVE = 'initiative',         // Task initiation: Start without over-prepping, perfectionism, or avoidance.
  PLANNING = 'planning',           // Planning & prioritization: Choose strategy, order steps, and decide what matters now vs later.
  ORGANIZATION = 'organization',       // Organization & sequencing: Structure info, assets, and steps into workable sequences.
  TIME_MNGM = 'time-management',    // Time management & estimation: Estimate durations, pace work, respect timeboxes, finish on time.
  CONCENTRATION = 'concentration',      // Sustained attention (focus): Maintain engagement, reduce distractibility.
  DETERMINATION = 'determination',      // Goal-directed persistence: Keep advancing long arcs despite friction or boredom.
}

export enum Attribute {
  PERCEPTION = 'perception',     // also rection
  LOGIC = 'logic',          // also analysis
  FITNESS = 'fitness',        // also strength, physical attractiveness, physical health
  CHARISMA = 'charisma',       // also charm
  WISDOM = 'wisdom',         // also knowledge
  LEADERSHIP = 'leadership',     // also authority
  COMMUNICATION = 'communication',  // also rhetoric
  VISION = 'vision',
  RESILIENCE = 'resilience',     // also endurance
  EMPATHY = 'empathy',
  INTEGRITY = 'integrity',      // also honesty
}

export enum Skill {
  DESIGN_THINKING = 'design-thinking',
  PROJECT_MANAGEMENT = 'project-management',
  TEACHING = 'teaching',
  NEGOTIATION = 'negotiation',
  NARRATIVE = 'narrative',
  DEVELOPING = 'developing',
  HANDCRAFTING = 'handcrafting',
  PAINTING = 'painting',
  ILLUSTRATION = 'illustration',
}

/** Skills categories for UI organization and SearchableSelect grouping */
export const SKILLS_CATEGORIES = {
  COGNITIVE: [
    IntelectualFunction.SELF_AWARE,
    IntelectualFunction.EMOTION_CONTROL,
    IntelectualFunction.DECISION_MAKING,
    IntelectualFunction.CREATIVITY,
    IntelectualFunction.PROBLEM_SOLVING,
    IntelectualFunction.SELF_CONTROL,
    IntelectualFunction.WORK_MEMORY,
    IntelectualFunction.ADAPTABILITY,
    IntelectualFunction.INITIATIVE,
    IntelectualFunction.PLANNING,
  ],
  CHARACTER: [
    Attribute.PERCEPTION,
    Attribute.LOGIC,
    Attribute.FITNESS,
    Attribute.CHARISMA,
    Attribute.WISDOM,
    Attribute.LEADERSHIP,
    Attribute.COMMUNICATION,
    Attribute.VISION,
    Attribute.RESILIENCE,
    Attribute.EMPATHY,
  ],
  PRACTICAL: [
    Skill.DESIGN_THINKING,
    Skill.PROJECT_MANAGEMENT,
    Skill.TEACHING,
    Skill.NEGOTIATION,
    Skill.NARRATIVE,
    Skill.DEVELOPING,
    Skill.HANDCRAFTING,
    Skill.PAINTING,
    Skill.ILLUSTRATION,
  ],
} as const;

export enum CommColor {
  RED = 'red',               // Explained in detail later
  YELLOW = 'yellow',            // Explained in detail later
  GREEN = 'green',             // Explained in detail later
  BLUE = 'blue',              // Explained in detail later
  PURPLE = 'purple',            // Explained in detail later
  ORANGE = 'orange',            // Explained in detail later
  TURQUOISE = 'turquoise',         // Explained in detail later
  BROWN = 'brown',              // RARE: Red-Green, Pacific Bossy, traits unknown
  YELLOW_BLUE = 'yellow-blue',        // RARE: Yellow-Blue, Joyful Techinical, traits unknown
  YELLOW_GREEN = 'yellow-green',       // RARE: Yellow-Green, Pacific Joyful, possibly a Bob Marley
}

// ============================================================================
// LINK & ENTITY ENUMS
// ============================================================================

/** Link types (Rosetta Stone / Links system) — each value names one kind of link between two entities. */
export enum LinkType {
  // TASK relationships
  TASK_ITEM = 'TASK_ITEM',      // Task created Item
  TASK_FINREC = 'TASK_FINREC',    // Task linked to Financial Record
  TASK_SALE = 'TASK_SALE',      // Task spawned from Sale
  TASK_PLAYER = 'TASK_PLAYER',    // Task earned Player points (only for PLAYERS)
  TASK_CHARACTER = 'TASK_CHARACTER', // Task assigned to Character (customer, team member, etc.)
  TASK_SITE = 'TASK_SITE',      // Task is performed at a Site

  // ITEM relationships
  ITEM_TASK = 'ITEM_TASK',      // Item was created by Task
  ITEM_SALE = 'ITEM_SALE',      // Item was sold in Sale
  ITEM_FINREC = 'ITEM_FINREC',    // Item tracked in Financial Record
  ITEM_PLAYER = 'ITEM_PLAYER',    // Item earned Player points (only for PLAYERS)
  ITEM_CHARACTER = 'ITEM_CHARACTER', // Item owned by Character (customer, team member, etc.)
  ITEM_SITE = 'ITEM_SITE',      // Item is located at a Site

  // SALE relationships
  SALE_TASK = 'SALE_TASK',      // Sale created Task
  SALE_ITEM = 'SALE_ITEM',      // Sale sold Item
  SALE_FINREC = 'SALE_FINREC',    // Sale linked to Financial Record
  SALE_PLAYER = 'SALE_PLAYER',    // Sale earned Player points (only for PLAYERS)
  SALE_CHARACTER = 'SALE_CHARACTER', // Sale customer is Character (customer, team member, etc.)
  SALE_BUSINESS = 'SALE_BUSINESS',   // Sale counterparty is a Business
  SALE_SITE = 'SALE_SITE',      // Sale is performed at a Site

  // FINANCIAL RECORD relationships
  FINREC_TASK = 'FINREC_TASK',    // Financial Record tracks Task
  FINREC_ITEM = 'FINREC_ITEM',    // Financial Record tracks Item
  FINREC_SALE = 'FINREC_SALE',    // Financial Record linked to Sale
  FINREC_PLAYER = 'FINREC_PLAYER',  // Financial → Player (legacy / generic points link type; finrec workflow does not award points)
  FINREC_CHARACTER = 'FINREC_CHARACTER', // Financial Record assigned to Character (customer, team member, etc.)
  FINREC_BUSINESS = 'FINREC_BUSINESS', // Financial Record assigned to Business
  FINREC_SITE = 'FINREC_SITE',      // Financial Record is related to a Site

  // CHARACTER relationships
  CHARACTER_TASK = 'CHARACTER_TASK',     // Character assigned to Task (customer, team member, etc.)
  CHARACTER_ITEM = 'CHARACTER_ITEM',     // Character owns/possesses this Item (customer, team member, etc.)
  CHARACTER_SALE = 'CHARACTER_SALE',     // Character is customer of this Sale (customer, team member, etc.)
  CHARACTER_FINREC = 'CHARACTER_FINREC',   // Character is assigned to this Financial Record (customer, team member, etc.)
  CHARACTER_SITE = 'CHARACTER_SITE',     // Character is related to a Site (owner, lives at, works at, customer of, etc.)
  CHARACTER_PLAYER = 'CHARACTER_PLAYER',   // When a Character belongs to a Player
  CHARACTER_BUSINESS = 'CHARACTER_BUSINESS', // Character is related to a Business (owner, rep, etc.)

  // SITE relationships (locations and places)
  SITE_TASK = 'SITE_TASK', // Site has Tasks performed there (reverse)
  SITE_CHARACTER = 'SITE_CHARACTER', // Site has a related Character (reverse)
  SITE_FINREC = 'SITE_FINREC',    // Site has a related Financial Record (reverse)
  SITE_ITEM = 'SITE_ITEM',      // Site has a related Item (reverse)
  SITE_SALE = 'SITE_SALE',      // Site has a related Sale (reverse)
  SITE_SITE = 'SITE_SITE',      // Site connected to another Site (inventory movement, logistics, etc.)

  // PLAYER relationships
  PLAYER_TASK = 'PLAYER_TASK', // Player has Tasks Points (reverse)
  PLAYER_SALE = 'PLAYER_SALE', // Player has Sales Points (reverse)
  PLAYER_FINREC = 'PLAYER_FINREC', // Player its tied to this Financial Record (reverse)
  PLAYER_ITEM = 'PLAYER_ITEM', // Player owns/possesses this Item (reverse)
  PLAYER_CHARACTER = 'PLAYER_CHARACTER', // Player interacts with or manages this Character (reverse)

  // ACCOUNT relationships (authentication & identity)
  ACCOUNT_PLAYER = 'ACCOUNT_PLAYER',    // Account owns Player (optional)
  ACCOUNT_CHARACTER = 'ACCOUNT_CHARACTER', // Account owns Character (required)
  PLAYER_ACCOUNT = 'PLAYER_ACCOUNT',    // Player belongs to Account (reverse)
  CHARACTER_ACCOUNT = 'CHARACTER_ACCOUNT', // Character belongs to Account (reverse)

  // CONTRACT relationships
  CONTRACT_CHARACTER = 'CONTRACT_CHARACTER', // Contract applies to Character (Partner)
}

/** Entity Types for Link System */
export enum EntityType {
  // ULTRA ENTITIES - System Foundation
  ACCOUNT = 'account',       // Accounts entity for authentication login and are character and player linked
  LINK = 'link',          // link rows that connect other entities

  // CORE ENTITIES - Business Logic
  TASK = 'task',            // Tasks Missions, Milestones, Goals, Assignments, and Recurrents Tree
  ITEM = 'item',            // Items with Inventory and Stock tracking
  SALE = 'sale',            // Sales with lines and Payment Methods
  FINANCIAL = 'financial',   // Financial RecordS and Done Tasks
  CHARACTER = 'character',   // Main entity - Characters can have multiple roles (FOUNDER, PLAYER, CUSTOMER, etc.)
  SITE = 'site',            // Sites and locations can now be linked to Tasks, Sales and other entities
  PLAYER = 'player',        // Players are real people with authentication and progression

  // INFRA ENTITIES - Supporting Data
  SESSION = 'session',          // AI assistant conversation sessions
  SETTLEMENT = 'settlement',     // Settlement reference data for Sites
  BUSINESS = 'business',         // Business Entities for contracts and finance
  CONTRACT = 'contract',        // Financial Contracts between Business Entities
}

// ============================================================================
// CHARACTER INFRA ENUMS
// ============================================================================

/** Types of Business Entities */
export enum BusinessType {
  COMPANY = 'company',        // A registered business entity
  INDIVIDUAL = 'individual',  // A person acting as a business entity
  DAO = 'dao',                // Decentralized Autonomous Organization
  NON_PROFIT = 'non-profit'   // Non-profit organization
}

// ============================================================================
// FINANCE INFRA ENUMS
// ============================================================================

/** Status of Contracts */
export enum ContractStatus {
  DRAFT = 'draft',            // Being created/negotiated
  ACTIVE = 'active',          // Currently in effect
  PAUSED = 'paused',           // Temporarily paused
  TERMINATED = 'terminated'  // Ended before expiration
}

/** Types of Contract Clauses */
export enum ContractClauseType {
  SALES_COMMISSION = 'commission',      // Products sold by Partner (Company pays commission)
  SALES_SERVICE = 'sales-service',      // My service performed for Partner (Company provides service)
  EXPENSE_SHARING = 'expense-sharing',   // Shared costs (e.g. Booth Fee)
  OTHER = 'other'
}

// ============================================================================
// LOG EVENT TYPES - Lifecycle events for entity logging
// ============================================================================

/** Log Event Types - Lifecycle events for entity logging */
export enum LogEventType {
  // Universal events (all entities)
  CREATED = 'CREATED',
  UPDATED = 'UPDATED',
  DONE = 'DONE',
  COLLECTED = 'COLLECTED',
  CANCELLED = 'CANCELLED',

  // Sale-specific events
  CHARGED = 'CHARGED',
  PENDING = 'PENDING',

  // Item-specific events
  SOLD = 'SOLD',
  MOVED = 'MOVED',

  // Player-specific events
  LEVEL_UP = 'LEVEL_UP',
  POINTS_CHANGED = 'POINTS_CHANGED',
  WIN_POINTS = 'WIN_POINTS',
  LOST_POINTS = 'LOST_POINTS',

  // Character-specific events
  ROLE_CHANGED = 'ROLE_CHANGED',
  OWNS_ITEM = 'OWNS_ITEM',           // Character owns an item
  REQUESTED_TASK = 'REQUESTED_TASK', // Character requested a task
  PURCHASED = 'PURCHASED',            // Character made a purchase
  TRANSACTED = 'TRANSACTED',          // Character in financial transaction
  BUSINESS_LINKED = 'BUSINESS_LINKED', // Business entity linked to character

  // Account-specific events
  EMAIL_VERIFIED = 'EMAIL_VERIFIED',
  PASSWORD_RESET = 'PASSWORD_RESET',
  LOGIN = 'LOGIN',
  LOGOUT = 'LOGOUT',

  // Site-specific events
  ACTIVATED = 'ACTIVATED',
  DEACTIVATED = 'DEACTIVATED',

  // Task-specific events
  UNCOMPLETED = 'UNCOMPLETED',

  // Task status events - match TaskStatus enum values
  ON_HOLD = 'ON_HOLD',           // Task goes to On Hold
  IN_PROGRESS = 'IN_PROGRESS',   // Task goes to In Progress
  FINISHING = 'FINISHING',       // Task goes to Finishing
  FAILED = 'FAILED',             // Task goes to Failed

  // Bulk operations
  BULK_IMPORT = 'BULK_IMPORT',
  BULK_EXPORT = 'BULK_EXPORT',
}

// ============================================================================
// NOTE SYSTEM
// ============================================================================

/** Note color themes - mapped to business structure */
export enum NoteColor {
  WHITE = 'white',    // General, neutral
  ORANGE = 'orange',   // Ideas, creativity
  PURPLE = 'purple',   // Admin, strategy, management
  GREEN = 'green',    // Design, creative processes
  BLUE = 'blue',     // Research, studies, development
  YELLOW = 'yellow',   // Production, manufacturing
  PINK = 'pink',     // Sales, marketing
  RED = 'red',      // Challenges, problems, urgent
  GRAY = 'gray'      // Personal, private
}

/** Notebook types for the note-taking system */
export enum NotebookType {
  ALL_NOTES = 'all',
  CURRENT_SPRINT = 'current-sprint',
  CHALLENGES = 'challenges',
  ROAD_AHEAD = 'road-ahead',
  STRATEGY = 'strategy',
  IDEAS = 'ideas',
  GENERAL = 'general'
}

/** Status of Dev Sprints/Phases */
export enum DevSprintStatus {
  NOT_STARTED = 'not-started',
  IN_PROGRESS = 'in-progress',
  DONE = 'done',
}

// ============================================================================
// BOOTSTRAP CONSTANTS
// ============================================================================

/** 
 * FOUNDATIONAL BOOTSTRAP IDs 
 * These IDs are used to initialize the "First User" (The Triforce) in the system.
 * They must remain constant to ensure the bootstrap process and founder-only logic
 * (like special UI permissions) are deterministic.
 */
export const FOUNDER_CHARACTER_ID = 'cc4ba319-8788-436e-ab46-56a7a92b2564';
export const FOUNDER_PLAYER_ID = 'c83b2249-60a1-4b09-9874-5612f95c5da2';

// ============================================================================
// NOTE SYSTEM TAGS
// ============================================================================

/** Available tags derived from business structure - DRY principle */
export const NOTE_TAGS = Object.values(BUSINESS_STRUCTURE).flat();