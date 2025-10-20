// types/enums.ts
// All enums and constants - single source of truth for application state

// ============================================================================
// BUSINESS STRUCTURE - Single source of truth for sections and stations
// ============================================================================

/** Business Structure - Single source of truth for sections and stations */
export const BUSINESS_STRUCTURE = {
  ADMIN:      ['Strategy', 'Projects', 'Inventory', 'Transport', 'Team', 'Materials', 'Equipment', 'Rent', 'Director'],
  RESEARCH:   ['Classes', 'Studies', 'Development'],
  DESIGN:     ['Digital Art', 'Art Creative Processes', 'Game Design', '3D Modeling', 'Animation'],
  PRODUCTION: ['Artworks', 'Murals', 'Prints', 'Stickers', 'Merch', 'Woodworks', 'NFTs'],
  SALES:      ['Direct Sales', 'Feria Sales', 'Network Sales', 'Online Sales', 'Store Sales', 'Marketing', 'Bookings', 'Other Sales'],
  PERSONAL:   ['Health', 'Family', 'Food', 'Home', 'Transport P', 'Rent P', 'Other P']
} as const;

// Areas (top-level business areas)
export const COMPANY_AREAS = ['ADMIN', 'RESEARCH', 'DESIGN', 'PRODUCTION', 'SALES'] as const;
export const PERSONAL_AREAS = ['PERSONAL'] as const;
export const ALL_AREAS = [...COMPANY_AREAS, ...PERSONAL_AREAS] as const;

// Type exports
export type Area = typeof ALL_AREAS[number];
export type Station = typeof BUSINESS_STRUCTURE[Area][number];

// ============================================================================
// STATION CATEGORIES - Derived from BUSINESS_STRUCTURE for SearchableSelect
// ============================================================================

/** Station categories for SearchableSelect grouping - derived from BUSINESS_STRUCTURE */
export const STATION_CATEGORIES = {
  ADMIN: BUSINESS_STRUCTURE.ADMIN,
  RESEARCH: BUSINESS_STRUCTURE.RESEARCH,
  DESIGN: BUSINESS_STRUCTURE.DESIGN,
  PRODUCTION: BUSINESS_STRUCTURE.PRODUCTION,
  SALES: BUSINESS_STRUCTURE.SALES,
  PERSONAL: BUSINESS_STRUCTURE.PERSONAL
} as const;

// ============================================================================
// LOCATION STRUCTURE
// ============================================================================

/** Geographic Location Structure - Single source of truth for geographic hierarchy */
export const LOCATION_STRUCTURE = {
  'North America': {
    'United States': ['United States'],
    'Canada': ['Canada']
    },
  'Central America': {
    'Costa Rica': ['Puntarenas', 'San Jose', 'Guanacaste', 'Limon'],
    'Panama': ['Panama'],
    'Nicaragua': ['Nicaragua'],
    'El Salvador': ['El Salvador']
    },
  'South America': {
    'Venezuela': ['Margarita Island', 'Caracas'],
    'Colombia': ['Bogota'],
    'Uruguay': ['Montevideo'],
    'Chile': ['Santiago'],
    'Argentina': ['Buenos Aires'],
    'Brasil': ['Rio de Janeiro'],
    'Peru': ['Lima']
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
  STORAGE           = 'storage',                // Warehouse sites (Home, Feria Box...)
  CONSIGNMENT       = 'consignment',            // Items left to sell (Smoking Lounge, Tagua...)
  SELLING_POINT     = 'selling point',          // Stores that buy at discount (El Hornito, Perezoso Feliz...)
  FERIA             = 'feria',                  // Feria sites (Eco Feria...)
  TEACHING_SPACE    = 'teaching space',         // Teaching sites (Jungle Academy...)
  HQ                = 'HQ',                     // HQ sites (Home, Feria Box...)
  ART_GALLERY       = 'art gallery',            // Gallery sites (Gallery 1084...)
  DESIGN_SPACE      = 'design space',           // Design hub sites (Design Hub...)
  WORKSHOP          = 'workshop'                // Production sites for creating items
}

/** Cloud Digital Types */
export enum CloudSiteType {
  REPOSITORY          = 'repository',             // Source files, templates, digital assets
  DIGITAL_STORAGE     = 'digital storage',        // Drives, digital art folder, online galleries
  NFT_WALLET          = 'nft wallet'              // NFt assets
}

/** Special Site Purposes */
export enum SpecialSiteType {
  UNIVERSAL_TRACKING = 'universal tracking', // Items no longer at specific sites
  SOLD_ITEMS         = 'sold items',         // Sold items tracking
  ARCHIVED           = 'archived',           // Archived/historical items
  DELETED            = 'deleted'             // Deleted items
}

/** SiteType enum for backward compatibility with entities */
export enum SiteType {
  PHYSICAL = 'PHYSICAL',  // Physical locations with addresses
  CLOUD = 'CLOUD',        // Digital/cloud storage locations
  SPECIAL = 'SPECIAL'     // Special system-managed locations
}

/** Status of Sites - controls state */
export enum SiteStatus {
  CREATED  = 'Created',   // First created
  ACTIVE   = 'Active',    // Has Item or Task links
  UPDATED  = 'Updated',   // Data edited
  INACTIVE = 'Inactive',  // No relationships
}

/** Site Structure - Single source of truth for sites and their types */
const SITE_STRUCTURE = {
  PHYSICAL: {
    HOME: 'Home',
    FERIA_BOX: 'Feria Box',
    SMOKING_LOUNGE: 'Smoking Lounge',
    TAGUA: 'Tagua',
    CAFE_VIVO: 'Cafe Vivo',
    XIVA: 'Xiva',
    PEREZOSO_FELIZ: 'Perezoso Feliz',
    EL_HORNITO: 'El Hornito',
    JUNGLE_ACADEMY: 'Jungle Academy',
    LA_TRIBU: 'La Tribu',
    OSA_DE_RIO: 'Osa de Rio',
    GALLERY_1084: 'Gallery 1084',
    CAT_CAFE: 'Cat Cafe',
    ECO_FERIA: 'Eco Feria',
    ESCUELA_VERDE: 'Escuela Verde',
    PRINT_MASTERS: 'Print Masters',
  },
  CLOUD: {
    DIGITAL_SPACE: 'Digital Space',
    DESKTOP_PC: 'Desktop PC',
    LAPTOP: 'Laptop',
    GOOGLE_DRIVE: 'Google Drive',
    GITHUB: 'Github',
    MAGIC_EDEN: 'Magic Eden',
    OPENSEA: 'OpenSea',
  },
  SPECIAL: {
    NONE: 'None',
    WORLD: 'World',
    SOLD_ITEMS_THIS_MONTH: 'Sold Items',
    ARCHIVED_HISTORICAL: 'Archived',
    DELETED_ITEMS_THIS_MONTH: 'Deleted Items',
  }
} as const;

// Export the structure for components to use
export const SITE_GROUPS = SITE_STRUCTURE;

/** Site categories for UI organization and SearchableSelect grouping */
export const SITE_CATEGORIES = {
  PHYSICAL: ['HOME', 'FERIA_BOX', 'SMOKING_LOUNGE', 'TAGUA', 'CAFE_VIVO', 'XIVA', 'PEREZOSO_FELIZ', 'EL_HORNITO', 'JUNGLE_ACADEMY', 'LA_TRIBU', 'OSA_DE_RIO', 'GALLERY_1084', 'CAT_CAFE', 'ECO_FERIA', 'ESCUELA_VERDE', 'PRINT_MASTERS'],
  CLOUD: ['DIGITAL_SPACE', 'DESKTOP_PC', 'LAPTOP', 'GOOGLE_DRIVE', 'GITHUB', 'MAGIC_EDEN', 'OPENSEA'],
  SPECIAL: ['NONE', 'WORLD', 'SOLD_ITEMS_THIS_MONTH', 'ARCHIVED_HISTORICAL', 'DELETED_ITEMS_THIS_MONTH']
} as const;

// Settlement enum removed - now using dynamic Settlement entities


// ============================================================================
// TASK ENUMS
// ============================================================================

/** Mission Tree & hierarchies */
export enum TaskType {
  MISSION               = 'Mission',
  MILESTONE             = 'Milestone',
  GOAL                  = 'Goal',
  ASSIGNMENT            = 'Assignment',
  RECURRENT_PARENT      = 'Recurrent Parent',     // NEW: Folder/container for recurrent tasks
  RECURRENT_TEMPLATE    = 'Recurrent Template',   // NEW: Sets frequency pattern
  RECURRENT_INSTANCE    = 'Recurrent Instance'    // NEW: Spawned with due date
}

/** Task categories for UI organization and SearchableSelect grouping */
export const TASK_CATEGORIES = {
  MISSION: ['Mission', 'Milestone', 'Goal', 'Assignment'],
  RECURRENT: ['Recurrent Parent', 'Recurrent Template', 'Recurrent Instance']
} as const;

/** Recurrent task frequency options */
export enum RecurrentFrequency {
  ONCE = 'Once',
  DAILY = 'Daily',
  WEEKLY = 'Weekly', 
  MONTHLY = 'Monthly',
  CUSTOM = 'Custom',
  ALWAYS = 'Always'
}

/** Workflow state of a Task */
export enum TaskStatus {
  CREATED     = 'Created',
  ON_HOLD     = 'On Hold',
  IN_PROGRESS = 'In Progress',
  FINISHING   = 'Finishing',
  DONE        = 'Done',
  COLLECTED   = 'Collected',
  FAILED      = 'Failed',
  NONE        = 'None',        // no status
}

/** Optional urgency flag (--► replaces "Awaiting / Urgent …") */
export enum TaskPriority {
  NOT_NOW    = 'Not Now',
  SLOW       = 'Slow',
  NORMAL     = 'Normal',
  IMPORTANT  = 'Important',
  URGENT     = 'Urgent',
}

// ============================================================================
// FINANCIAL & POINTS ENUMS
// ============================================================================

/** Status of Records (completed tasks) */
export enum FinancialStatus {
  DONE = 'Done',        // as soon as they are created
  COLLECTED = 'Collected', // they stay done until they are collected
}

/** Status of Dev Sprints/Phases */
export enum DevSprintStatus {
  NOT_STARTED = 'Not Started',
  IN_PROGRESS = 'In Progress',
  DONE = 'Done',
}

// New Points System Enums
export enum PointType {
  XP = 'XP',     // Experience Points
  RP = 'RP',    // Research Points
  FP = 'FP',    // Family Points 
  HP = 'HP',    // Health Points
}

/** In-game currency system */
export enum Currency {
  USD           = 'USD',              // US Dollars - primary business currency for inventories, payments, etc.
  JUNGLE_COINS  = 'J$',               // Jungle Coins - reward tokens that convert to USD (like Zelda gems)
  BTC           = 'BTC',              // Bitcoin - cryptocurrency asset
  CRC           = 'CRC',              // Costa Rica Colon - local currency
}

// ============================================================================
// ITEM ENUMS
// ============================================================================

/** All Items - Products, Bundles, Materials and Equipment */
export enum ItemType {
  // MODEL_ITEM - Individual products that can be separated by model, subtype, site and collection
  DIGITAL         = 'Digital',
  ARTWORK         = 'Artwork',
  PRINT           = 'Print',
  STICKER         = 'Sticker',
  MERCH           = 'Merch',
  
  // BUNDLE_ITEM - Business Logic Items that are Packs of the same Type of Item
  STICKER_BUNDLE  = 'Sticker Bundle',    // Pack of Stickers
  PRINT_BUNDLE    = 'Print Bundle',      // Pack of Prints
  
  // RESOURCE_ITEM - Materials and Equipment for production
  MATERIAL        = 'Material',
  EQUIPMENT       = 'Equipment',
}

/** Item Categories for UI organization and business logic */
export enum ItemCategory {
  MODEL_ITEM      = 'MODEL_ITEM',      // Individual products (Digital, Artwork, Print, Sticker, Merch)
  BUNDLE_ITEM     = 'BUNDLE_ITEM',     // Business Logic Items (Sticker Bundle, Print Bundle)
  RESOURCE_ITEM   = 'RESOURCE_ITEM',   // Production resources (Material, Equipment)
}

/** Inventory tab values - Organized by Item Categories */
export enum InventoryTab {
  // MODEL_ITEM tabs
  DIGITAL     = 'digital',
  ARTWORKS    = 'artworks',
  STICKERS    = 'stickers',
  PRINTS      = 'prints',
  MERCH       = 'merch',
  
  // BUNDLE_ITEM tabs
  BUNDLES     = 'bundles',    // Business Logic Items (Bundles)
  
  // RESOURCE_ITEM tabs
  MATERIALS   = 'materials',
  EQUIPMENT   = 'equipment',
}

/** Lifecycle state of ONE Item /SKU */
export enum ItemStatus {
  CREATED     = 'Created',
  FOR_SALE    = 'For Sale',
  SOLD        = 'Sold',
  TO_ORDER    = 'To Order',
  TO_DO       = 'To Do',
  GIFTED      = 'Gifted',
  RESERVED    = 'Reserved',
  OBSOLETE    = 'Obsolete',
  DAMAGED     = 'Damaged',
  IDLE        = 'Idle',
  COLLECTED   = 'Collected',
  // Temporary while building
  ON_HOLD     = 'On Hold',
  STORED      = 'Stored',
  TO_REPAIR   = 'To Repair',
}

/** Creative collections */
export enum Collection {
  NO_COLLECTION     = 'No Collection',
  ORGANIC_IMAGINARY = 'Organic Imaginary',
  ANIMAL_KINGDOM    = 'Animal Kingdom',
  MUSHLAND          = 'Mushland',
  SEVEN_ELEMENTS    = 'Seven Elements',
  BITCOIN           = 'Bitcoin',
  DOPE_CREW         = 'Dope Crew',
  WORDS             = 'Words',
  FRUITS_VEGGIES    = 'Fruits & Veggies',
  FLOWERS           = 'Flowers',
  KINGS_QUEENS      = 'Kings & Queens',
  POLYGONAL_HD      = 'Polygonal HD',
  RELIQUIAS         = 'Reliquias',
  BITUAYA           = 'Bituaya',
  LANDSCAPES        = 'Landscapes',
  EXILIADO          = 'Exiliado',
}

/** Item categories for UI organization and SearchableSelect grouping */
export const ITEM_CATEGORIES = {
  MODEL_ITEM: ['DIGITAL', 'ARTWORK', 'PRINT', 'STICKER', 'MERCH'],
  BUNDLE_ITEM: ['STICKER_BUNDLE', 'PRINT_BUNDLE'],
  RESOURCE_ITEM: ['MATERIAL', 'EQUIPMENT']
} as const;


// ============================================================================
// SALES ENUMS
// ============================================================================

/** Sales transaction types */
export enum SaleType {
  DIRECT = 'DIRECT',
  FERIA = 'FERIA',
  BUNDLE_SALE = 'BUNDLE',
  CONSIGNMENT = 'CONSIGNMENT',
  ONLINE = 'ONLINE',
  NFT = 'NFT',
}

/** Cash-drawer state */
export enum SalesSessionStatus {
  PENDING_RECONCILIATION = 'Pending Reconciliation',
  RECONCILED             = 'Reconciled',
}

/** Sales transaction status */
export enum SaleStatus {
  PENDING = 'PENDING',      // Sale isNotCharged
  ON_HOLD = 'ON_HOLD',      // Waiting for other reasons
  CHARGED = 'CHARGED',      // Sale is Charged
  CANCELLED = 'CANCELLED',  // Sale is Cancelled
}

/** Payment methods for sales */
export enum PaymentMethod {
  // Regular payment methods
  FIAT_USD =      '$ CASH',
  FIAT_CRC =      '₡ CASH',
  BTC =           'BITCOIN',
  CARD =          'CARD',
  SINPE =         'SINPE',
  PAYPAL =        'PAYPAL',
  WIRE_TRANSFER = 'WIRE',
  
  // Special payment methods
  GIFT =          'GIFT',
  EXCHANGE =      'EXCHANGE',
  OTHER =         'OTHER',
}

/** Payment method categories for UI organization */
export const PAYMENT_METHOD_CATEGORIES = {
  REGULAR: ['FIAT_USD', 'FIAT_CRC', 'BTC', 'CARD', 'SINPE', 'PAYPAL', 'WIRE_TRANSFER'],
  SPECIAL: ['GIFT', 'EXCHANGE', 'OTHER']
} as const;

// ============================================================================
// CHARACTER ENUMS
// ============================================================================

/** Character roles */
export enum CharacterRole {
  FOUNDER       = 'founder',
  PLAYER        = 'player',
  PADAWAN       = 'padawan',
  INVESTOR      = 'investor',
  TEAM          = 'team',
  FAMILY        = 'family',
  FRIEND        = 'friend',
  ADMIN         = 'admin',
  DESIGNER      = 'designer',
  PRODUCER      = 'producer',
  SELLER        = 'seller',
  RESEARCHER    = 'researcher',
  DEVELOPER     = 'developer',
  AI_AGENT      = 'ai-agent',
  ASSOCIATE     = 'associate',
  COLLABORATOR  = 'collaborator',
  CUSTOMER      = 'customer',
  STUDENT       = 'student',
  OTHER         = 'other'
}

/** Character role types for UI organization and permissions */
export const CHARACTER_ROLE_TYPES = {
  REGULAR: ['admin', 'designer', 'producer', 'seller', 'researcher', 'developer', 'associate', 'collaborator', 'customer', 'student', 'ai-agent', 'other'],
  SPECIAL: ['founder', 'player', 'padawan', 'team', 'family', 'friend', 'investor' ]
} as const;

export enum IntelectualFunction {
  SELF_AWARE      = 'Self Awareness',     // Self-monitoring / error monitoring: Notice performance drift, catch mistakes, adjust in-flight.
  EMOTION_CONTROL = 'Emotion Control',    // Emotional regulation: Modulate frustration, stress, and reward-seeking so you can execute.
  DECISION_MAKING = 'Decision Making',    // Decision-making (valuation & risk): Choose under uncertainty; weigh cost/benefit and risk.
  CREATIVITY      = 'Creativity',         // ability to generate original ideas, view situations from new perspectives, and produce novel outcomes. 
  PROBLEM_SOLVING = 'Problem Solving',    // Problem solving (strategy generation): Diagnose blockers, generate options, test and iterate.
  SELF_CONTROL    = 'Self Control',       // Inhibitory control: Resist impulses and delay gratification to stay aligned with goals.
  WORK_MEMORY     = 'Working Memory',     // Hold and manipulate information in mind while acting.
  ADAPTABILITY    = 'Adaptability',       // Cognitive flexibility: Switch tasks/strategies and adapt when conditions change.
  INITIATIVE      = 'Initiative',         // Task initiation: Start without over-prepping, perfectionism, or avoidance.
  PLANNING        = 'Planning',           // Planning & prioritization: Choose strategy, order steps, and decide what matters now vs later.
  ORGANIZATION    = 'Organization',       // Organization & sequencing: Structure info, assets, and steps into workable sequences.
  TIME_MNGM       = 'Time Management',    // Time management & estimation: Estimate durations, pace work, respect timeboxes, finish on time.
  CONCENTRATION   = 'Concentration',      // Sustained attention (focus): Maintain engagement, reduce distractibility.
  DETERMINATION   = 'Determination',      // Goal-directed persistence: Keep advancing long arcs despite friction or boredom.
}

export enum Attribute {
  PERCEPTION            = 'Perception',     // also rection
  LOGIC                 = 'Logic',          // also analysis
  FITNESS               = 'Fitness',        // also strength, physical attractiveness, physical health
  CHARISMA              = 'Charisma',       // also charm
  WISDOM                = 'Wisdom',         // also knowledge
  LEADERSHIP            = 'Leadership',     // also authority
  COMMUNICATION         = 'Communication',  // also rhetoric
  VISION                = 'Vision',
  RESILIENCE            = 'Resilience',     // also endurance
  EMPATHY               = 'Empathy',   
  INTEGRITY             = 'Integrity',      // also honesty
}

export enum Skill {
  DESIGN_THINKING       = 'Design Thinking',
  PROJECT_MANAGEMENT    = 'Project Management',
  TEACHING              = 'Teaching',
  NEGOTIATION           = 'Negotiation',
  NARRATIVE             = 'Narrative',
  DEVELOPING            = 'Developing',
  HANDCRAFTING          = 'Handcrafting',
  PAINTING              = 'Painting',
  ILLUSTRATION          = 'Illustration',
}

/** Skills categories for UI organization and SearchableSelect grouping */
export const SKILLS_CATEGORIES = {
  COGNITIVE: [
    'SELF_AWARE', 'EMOTION_CONTROL', 'DECISION_MAKING', 'CREATIVITY', 
    'PROBLEM_SOLVING', 'SELF_CONTROL', 'WORK_MEMORY', 'ADAPTABILITY', 
    'INITIATIVE', 'PLANNING'
  ],
  CHARACTER: [
    'PERCEPTION', 'LOGIC', 'FITNESS', 'CHARISMA', 'WISDOM', 
    'LEADERSHIP', 'COMMUNICATION', 'VISION', 'RESILIENCE', 'EMPATHY'
  ],
  PRACTICAL: [
    'DESIGN_THINKING', 'PROJECT_MANAGEMENT', 'TEACHING', 'NEGOTIATION', 
    'NARRATIVE', 'DEVELOPING', 'HANDCRAFTING', 'PAINTING', 'ILLUSTRATION'
  ]
} as const;

export enum CommColor {
  RED               = 'Red',               // Explained in detail later
  YELLOW            = 'Yellow',            // Explained in detail later
  GREEN             = 'Green',             // Explained in detail later
  BLUE              = 'Blue',              // Explained in detail later
  PURPLE            = 'Purple',            // Explained in detail later
  ORANGE            = 'Orange',            // Explained in detail later
  TURQUOISE         = 'Turquoise',         // Explained in detail later
  BROWN             = 'Brown',              // RARE: Red-Green, Pacific Bossy, traits unknown
  YELLOW_BLUE       = 'Yellow-Blue',        // RARE: Yellow-Blue, Joyful Techinical, traits unknown
  YELLOW_GREEN      = 'Yellow-Green',       // RARE: Yellow-Green, Pacific Joyful, possibly a Bob Marley
}

// ============================================================================
// LINK & ENTITY ENUMS
// ============================================================================

/** Link Types - The Rosetta Stone Communication Pattern */
export enum LinkType {
  // TASK relationships
  TASK_ITEM         = 'TASK_ITEM',      // Task created Item
  TASK_FINREC       = 'TASK_FINREC',    // Task linked to Financial Record
  TASK_SALE         = 'TASK_SALE',      // Task spawned from Sale
  TASK_PLAYER       = 'TASK_PLAYER',    // Task earned Player points (only for PLAYERS)
  TASK_CHARACTER    = 'TASK_CHARACTER', // Task assigned to Character (customer, team member, etc.)
  TASK_SITE         = 'TASK_SITE',      // Task is performed at a Site
  
  // ITEM relationships
  ITEM_TASK         = 'ITEM_TASK',      // Item was created by Task
  ITEM_SALE         = 'ITEM_SALE',      // Item was sold in Sale
  ITEM_FINREC       = 'ITEM_FINREC',    // Item tracked in Financial Record
  ITEM_PLAYER       = 'ITEM_PLAYER',    // Item earned Player points (only for PLAYERS)
  ITEM_CHARACTER    = 'ITEM_CHARACTER', // Item owned by Character (customer, team member, etc.)
  ITEM_SITE         = 'ITEM_SITE',      // Item is located at a Site

  // SALE relationships
  SALE_TASK         = 'SALE_TASK',      // Sale created Task
  SALE_ITEM         = 'SALE_ITEM',      // Sale sold Item
  SALE_FINREC       = 'SALE_FINREC',    // Sale linked to Financial Record
  SALE_PLAYER       = 'SALE_PLAYER',    // Sale earned Player points (only for PLAYERS)
  SALE_CHARACTER    = 'SALE_CHARACTER', // Sale customer is Character (customer, team member, etc.)
  SALE_SITE         = 'SALE_SITE',      // Sale is performed at a Site
  
  // FINANCIAL RECORD relationships
  FINREC_TASK       = 'FINREC_TASK',    // Financial Record tracks Task
  FINREC_ITEM       = 'FINREC_ITEM',    // Financial Record tracks Item
  FINREC_SALE       = 'FINREC_SALE',    // Financial Record linked to Sale
  FINREC_PLAYER     = 'FINREC_PLAYER',  // Financial Record earned Player points (only for PLAYERS)
  FINREC_CHARACTER  = 'FINREC_CHARACTER', // Financial Record assigned to Character (customer, team member, etc.)
  FINREC_SITE       = 'FINREC_SITE',      // Financial Record is related to a Site
  
  // CHARACTER relationships
  CHARACTER_TASK    = 'CHARACTER_TASK',     // Character assigned to Task (customer, team member, etc.)
  CHARACTER_ITEM    = 'CHARACTER_ITEM',     // Character owns/possesses this Item (customer, team member, etc.)
  CHARACTER_SALE    = 'CHARACTER_SALE',     // Character is customer of this Sale (customer, team member, etc.)
  CHARACTER_FINREC  = 'CHARACTER_FINREC',   // Character is assigned to this Financial Record (customer, team member, etc.)
  CHARACTER_SITE    = 'CHARACTER_SITE',     // Character is related to a Site (owner, lives at, works at, customer of, etc.)
  CHARACTER_PLAYER  = 'CHARACTER_PLAYER',   // When a Character belongs to a Player

  // SITE relationships (locations and places)
  SITE_TASK         = 'SITE_TASK', // Site has Tasks performed there (reverse)
  SITE_CHARACTER    = 'SITE_CHARACTER', // Site has a related Character (reverse)
  SITE_FINREC       = 'SITE_FINREC',    // Site has a related Financial Record (reverse)
  SITE_ITEM         = 'SITE_ITEM',      // Site has a related Item (reverse)
  SITE_SALE         = 'SITE_SALE',      // Site has a related Sale (reverse)
  SITE_SITE         = 'SITE_SITE',      // Site connected to another Site (inventory movement, logistics, etc.)

  // PLAYER relationships
  PLAYER_TASK       = 'PLAYER_TASK', // Player has Tasks Points (reverse)
  PLAYER_SALE       = 'PLAYER_SALE', // Player has Sales Points (reverse)
  PLAYER_FINREC     = 'PLAYER_FINREC', // Player its tied to this Financial Record (reverse)
  PLAYER_ITEM       = 'PLAYER_ITEM', // Player owns/possesses this Item (reverse)
  PLAYER_CHARACTER  = 'PLAYER_CHARACTER', // Player interacts with or manages this Character (reverse)
  
  // ACCOUNT relationships (authentication & identity)
  ACCOUNT_PLAYER    = 'ACCOUNT_PLAYER',    // Account owns Player (optional)
  ACCOUNT_CHARACTER = 'ACCOUNT_CHARACTER', // Account owns Character (required)
  PLAYER_ACCOUNT    = 'PLAYER_ACCOUNT',    // Player belongs to Account (reverse)
  CHARACTER_ACCOUNT = 'CHARACTER_ACCOUNT', // Character belongs to Account (reverse)
}

/** Entity Types for Link System */
export enum EntityType {
  TASK          = 'task',            // Tasks Missions, Milestones, Goals, Assignments, and Recurrents Tree
  ITEM          = 'item',            // Items with Inventory and Stock tracking
  SALE          = 'sale',            // Sales with lines and Payment Methods
  FINANCIAL     = 'financial',   // Financial RecordS and Done Tasks
  CHARACTER     = 'character',   // Main entity - Characters can have multiple roles (FOUNDER, PLAYER, CUSTOMER, etc.)
  SITE          = 'site',            // Sites and locations can now be linked to Tasks, Sales and other entities
  PLAYER        = 'player',        // Players are real people with authentication and progression
  ACCOUNT       = 'account',       // Accounts entity for authentication login and are character and player linked
}

// ============================================================================
// LOG EVENT TYPES - Lifecycle events for entity logging
// ============================================================================

/** Log Event Types - Lifecycle events for entity logging */
export enum LogEventType {
  // Universal lifecycle events (all entities)
  CREATED = 'CREATED',
  UPDATED = 'UPDATED',
  
  // State transition events
  STATUS_CHANGED = 'STATUS_CHANGED',
  DONE = 'DONE',
  COLLECTED = 'COLLECTED',
  MOVED = 'MOVED',
  
  // Financial events
  CHARGED = 'CHARGED',
  CANCELLED = 'CANCELLED',
  
  // Item-specific events
  SOLD = 'SOLD',
  
  // Player-specific events
  LEVEL_UP = 'LEVEL_UP',
  POINTS_CHANGED = 'POINTS_CHANGED',
  
  // Character-specific events
  ROLE_CHANGED = 'ROLE_CHANGED',
  
  // Site-specific events
  ACTIVATED = 'ACTIVATED',
  DEACTIVATED = 'DEACTIVATED',
  
  // Task-specific events
  UNCOMPLETED = 'UNCOMPLETED',
  
  // Bulk operations
  BULK_IMPORT = 'BULK_IMPORT',
  BULK_EXPORT = 'BULK_EXPORT',
}

// ============================================================================
// NOTE SYSTEM
// ============================================================================

/** Note color themes - mapped to business structure */
export enum NoteColor {
  WHITE   = 'white',    // General, neutral
  ORANGE  = 'orange',   // Ideas, creativity
  PURPLE  = 'purple',   // Admin, strategy, management
  GREEN   = 'green',    // Design, creative processes
  BLUE    = 'blue',     // Research, studies, development
  YELLOW  = 'yellow',   // Production, manufacturing
  PINK    = 'pink',     // Sales, marketing
  RED     = 'red',      // Challenges, problems, urgent
  GRAY    = 'gray'      // Personal, private
}

/** Notebook types for the note-taking system */
export enum NotebookType {
  ALL_NOTES      = 'all',
  CURRENT_SPRINT = 'current_sprint',
  CHALLENGES     = 'challenges',
  ROAD_AHEAD     = 'road_ahead',
  STRATEGY       = 'strategy',
  IDEAS          = 'ideas',
  GENERAL        = 'general'
}

/** Available tags derived from business structure - DRY principle */
export const NOTE_TAGS = Object.values(BUSINESS_STRUCTURE).flat();