# TheGame Wiki • Gamified Admin Web-app

────────────────────────────────────────

## TABLE OF CONTENTS

**COMMANDS:**
- NOSKIM, HONEST, INTERNALIZE, VERIFY, ANALYSE, CLEAN, UPDATE, DEBUG

**CONTENT:**
1. The General Situation (Reality Layer)
2. The Board (Game Surface)
3. The Business (Art & Design Studio)
4. The Player (Profile)
5. The System (Rules, Tech & Data)
6. The Roadmap (Phased Build Plan)
7. Reference Appendix

────────────────────────────────────────

## **UI PATTERNS - CRITICAL FOR AI INTERNALIZATION**

### **NumericInput Pattern**
- **ALWAYS use `NumericInput` for number fields** - allows empty string editing, normalizes on blur
- **NEVER use `type="number"`** - causes "can't delete zero" UX pain
- **Pattern**: `<NumericInput value={num} onChange={setNum} placeholder="0.00" />`
- **Applied to**: Cost, Revenue, Price, Quantities, Dimensions, Exchange Rates, etc.

## **ENTITIES ARCHITECTURE PATTERN - CRITICAL FOR AI INTERNALIZATION**

**The entire system follows a strict architectural pattern defined in `ENTITIES_ARCHITECTURE_PATTERN.md`:**

### **Diplomatic Fields Pattern (Modal Field Display)**
- **Native Fields**: Core entity properties, always present, safe for parent UI
- **Ambassador Fields**: Cross-entity references, always present, safe for parent UI, create links
- **Emissary Fields**: Conditional fields for entity creation, conditionally present, NOT safe for parent UI, create links
- **Implementation**: `types/diplomatic-fields.ts` defines field categorization for all entities
- **UI Pattern**: TaskModal implements 4-column layout (Native, Native, Ambassadors, Emissaries) with collapsible Emissary section

### **Modal Layer (UI Only)**
- **Purpose**: Pure UI forms for data collection and validation
- **Pattern**: `onSave(entity) => void` - emits pure entity to parent (no flags)
- **Responsibilities**: Form validation, user input, UI state management
- **What it DOES NOT do**: Call APIs, mutate global state, perform side effects, handle persistence
- **Implementation**: TaskModal, ItemModal, SalesModal, FinancialsModal all follow this pattern

### **Parent Layer (Orchestration)**
- **Purpose**: Owns UI state, orchestrates data flow, updates UI
- **Pattern**: Receives entity from modal, calls `ClientAPI.upsertX(entity)` - direct API route calls
- **Responsibilities**: Modal state management, ClientAPI calls, UI updates
- **What it DOES NOT do**: Perform side effects, handle business logic, call APIs directly

### **API Layer (Server-Side)**
- **Purpose**: Server-side persistence and side effect orchestration
- **Pattern**: API route → DataStore orchestrator → Repository (KV) → Workflows → Links
- **Responsibilities**: KV persistence, workflow execution, authoritative response

### **Workflow Layer (The Ribosome)**
- **Purpose**: Universal entity processor that reads DNA and creates Links
- **Entry Point**: `processLinkEntity(entity, entityType)` - inspects properties, creates links automatically
- **Pattern**: Called by API routes after entity persistence
- **Implementation**: workflows/entities-workflows/*.workflow.ts (per-entity files) with createLink() calls
- **Responsibilities**: Link creation, item synthesis, financial logging, character/player rewards
- **DNA/RNA Pattern**: Reads entity properties (DNA) → Creates Links (RNA) → Synthesizes new entities

**CRITICAL**: This pattern is MANDATORY for all entity operations. Any deviation breaks the system architecture and must be fixed immediately.
#




────────────────────────────────────────

## 1. THE GENERAL SITUATION OF PLAYER: GAMEPLAY

### Key Environmental Threats:
- **Gentrification** ⇒ High Rent and Costs of Living
- **No House/Studio** ⇒ In Search
- **Mom's Visa Runway** ⇒ from VE to CR
- **Bureaucracy** ⇒ Horrible Delays and Costs
- **No Residency** ⇒ in Process for more than a Year
- **Time Scarcity** ⇒ Family Responsibilities (single-parent duties) + Teaching Schedule
- **Weak Local Art Market** ⇒ Very hard to sell Artworks at their fair price
- **Cash-Flow** ⇒ Low Capital ($2000) + High Expenses + Irregular Revenue

────────────────────────────────────────

## 2. THE GAME BOARD

### Current State:
- **Primary Surface**: The Gamified Admin App we are building
- **Game Views**: Control Room (v0.1), Finances (v0.1), Inventory (v0.1), others are placeholders
- **Core Mechanic**: Turn-based pacing by timeframe (e.g., "each day = a turn")

### Control Room Architecture (v0.1)
- **Control Room**: Main container with custom resizable sidebar and DndContext provider
- **Task Tree**: Hierarchical navigation with expand/collapse and drag-and-drop
- **Task Detail View**: Comprehensive task information display
- **Task Modal**: Create/edit interface with validation
- **Event System**: Real-time updates via custom events
- **Order System**: Persistent sort order with order-based tree building
- **Filter System**: Station and category filtering with hierarchy preservation
- **Custom Resizable Sidebar**: Lightweight, dependency-free resizing without external libraries
- **Tab System**: Mission Tree, Recurrent Tree, Schedule, and Calendar views

### Inventory System (v0.1)
- **Unified Stock Management**: `stock[]` array as single source of truth for item quantities
- **Smart Location System**: Items can exist at multiple sites with individual quantities
- **Hybrid Status Management**: Smart suggestions instead of automatic status changes
- **Working Move System**: Items can be moved between locations with proper quantity management and immediate UI updates
- **Business Rule Engine**: Automated value calculations while preserving user control
- **Type-Safe Foundation**: Strict adherence to enums and entities throughout the system

### Location System Architecture
- **4-Tier Hierarchical Structure**: Continent → Country → Region → Settlement
- **Smart Data-Driven Design**: Single source of truth like `BUSINESS_STRUCTURE` pattern
- **Auto-Derived Relationships**: Pick a settlement, system knows region, country and continent automatically
- **Game-Ready Foundation**: Perfect for business expansion mechanics and mission unlocking
- **Type-Safe & Maintainable**: Easy to add new locations, no manual type updates needed
- **Settlement Support**: Specific locations like Uvita, Dominical, Ojochal within Puntarenas
- **Business Type Integration**: Each location has business type (consignment, selling_point, storage, etc.)

### **CRITICAL TERMINOLOGY CLARIFICATION** 🎯

- **LOCATION** = Broader geographical area (Uvita, Puntarenas, Costa Rica, Central America)
  - Used for: Map, business expansion, regional planning
  - 4-tier hierarchy: Continent → Country → Region → Settlement
  - Physical sites are "located at" these locations

- **SITE** = Specific, defined area where items exist (El Hornito, Home, World, Google Drive, Characters like Akiles)
  - Used for: Inventory management, item movement, stock tracking
  - Only Physical Sites have a Location reference
  - Digital/Character/Special Sites don't have physical locations

**This clarification eliminates confusion between "location" (geographical) and "site" (inventory point).**

### Future Expansions (Under Development):
- **Resources** = Resources flows (cash, materials, Jungle Coins)

### Core Vision: Gamifying Real Life
**TheGame is not just a business management tool - it's about using game mechanics to overcome human limitations and make life management more engaging and strategic.**

**The Vision:**
Create a universal system that helps people see their lives as a strategic game where every task contributes to larger missions and goals. This game isn't about escaping reality - it's about making reality more manageable, strategic, and rewarding.

**The Problem:**
- Humans have limited focus and memory
- Long-term planning is difficult to visualize
- Daily tasks feel disconnected from bigger goals
- Strategic decision-making is hard without clear feedback

**The Solution:**
- **Gamify daily tasks** as achievements and progress markers
- **Visualize life patterns** over time through dashboards and analytics
- **Break down complex life goals** into manageable missions and milestones
- **Track gains/losses** and strategic decisions with clear feedback
- **Make long-term planning** tangible through mission trees and roadmaps
- **Transform productivity** into an engaging game with clear rewards

**Business Expansion as a Game Mechanic:**
- **Location Unlocking**: Establish business presence to unlock new regions
- **Network Building**: Build consignment networks, selling points, and agent networks
- **Strategic Expansion**: Choose where to expand based on business opportunities
- **Victory Points**: Multiple paths to success (Business Empire, Regional Dominance, Global Expansion)

- **Gamification Features**:
  - Dashboards à la Football Manager
  - Resources (materials / cash / J$ / data) à la Civilization
  - Tech tree and Map (Three.js isometric) à la Disco Elysium
  - Board (Three.js isometric) à la Civilization
  - Events and Research à la Disco Elysium
  - Character traits and Events Cards à la Crusader Kings

### Gameplay Archetype: Hybrid TBS/RTS/RPG
- **TBS**: Planning & logging stage
  - Real-world timeframes = a "turn" for planning and development
- **RTS**: Execution & real-time adaptation
  - Daily actions execute those turns and Business development
- **RPG**: XP, $, J$ gained via completing tasks
  - Personal Skills growth, character relationships & development

### Default Difficulty (Founder Player): Very High, must be very strategic.

### Primary Quests:
- **O-1** Residency/Mother's Visa approved
- **O-2** ≥ $1,500–2,000 / mo net revenue
- **O-3** TheGame Admin App live with Front-End
- **O-4** HQ (Physical Studio) operational

────────────────────────────────────────

## 3. THE BUSINESS

### Stations (Departments)
ADMIN • RESEARCH • INVENTORY • TRANSPORT • TEAM • DESIGN • GAME-DESIGN • PRODUCTION • SALES • MARKETING • CLASSES

### Offerings
**Item-Types**: DIGITAL, PRINT, STICKER, ARTWORK, MERCH, MATERIAL, EQUIPMENT

**Service-Types**: ART-DESIGN_CLASSES, GRAPHIC_DESIGN, WEB_APP_DESIGN

### Materials & Equipment
DESIGN_EQUIPMENT • TOOLS • MACHINES • MATERIALS

### Sites (Stock Points)
HOME_STORAGE • FERIA_BOX • CONSIGNMENT_NETWORK[≈ 5 stores] • HQ{placeholder}

### Brand Lexicon
- **Akiles** (the player and the business as an artist)
- **TheGame** (the admin webapp system)
- **akiles-ecosystem** (whole venture)
- **akiles.space** (future web3 gallery)
- **TheCompany** (future DAO-like innovation org)

**Candidate Studio Names**: Portal Art & Design, Root Studio, Vertex Studio, Prisma Arts, ...

────────────────────────────────────────

## 4. THE PLAYER

### Profile: Akiles
Multi-disciplinary artist / designer / developer

### Core Skills
Digital illustration, acrylic & mural painting, graphic design, 3D modelling, game/web/app dev, woodworking, teaching

### Dependents
- 2-year-old daughter (CR)
- 12-year-old son (CR resident)
- Mother in Venezuela (72)

### Starting Capital
≈ $2,000 cash + $5,000 of inventory value (Artworks, Prints, Stickers, Merchandise)

### Equipment
- PC + Wacom (Digital Unit)
- Woodworking machines & tools in storage (Maker Unit)

### Traits (AI Analysis)
**Strengths**:
- Talented Designer, Highly Creative, Strategist
- High-level systems thinker, Future-oriented
- Rare blend of creativity + structure
- Values: Innovation, Ingenious, Deep Analysis, Design Thinking
- Likes: Making the complex simple, Pursues elegant simplicity, Solid foundations
- Dislikes: Unnecessary extra work, Shallow 'feature-first' thinking

**Overall Stats Block (1–10)** {relative to indie-founder peers}:
- Strategic Vision:     9       //  Visión Estratégica
- Systems Thinking:     9       //  Diseño de Sistemas
- Creative Output:      8       //  Creatividad     
- Resourcefulness:      8       //  Ingenio, Resolución de Problemas
- Execution Velocity:   7       //  Velocidad
- Stress Management:    6       //  Manejo del Estrés
- Risk Management:      4       //  Manejo del Riesgo
- Delegation:           2       //  Delegation
- Social Relationship:  5       //  Relación Sociales
- Details Attention:    8       //  Perfeccionismo
- Determination:        8       //  Determinación

**Skills**:
- Art & Design:         9     
- Teaching:             5 
- Woodworking:          7
- Developer:            4
- Game Design:          6

### AI Analysis Summary

**Strengths**:
- **Systems-First Mindset** – Refuses to bolt features onto shaky ground. Protects from 90% of technical traps
- **High Abstraction Agility** – Juggles entities, schemas, real-world constraints and immediately sees where a single wrong field would contaminate downstream logic
- **Strategic Patience under Pressure** – Even with eviction clocks ticking, willing to staircase features and postpone vanity projects
- **Creative-Technical Hybrid** – Can design a mural, then write the React component. 10× versatility – rare combo
- **Brutal Self-Honesty** – Asks for the "harsh truth," which keeps blind spots small

**Weak Points**:
- **Perfection Drag** – The same high bar can stall shipping. Guard against "one more refactor" syndrome
- **Cognitive Overload** – Running parent duties, survival cashflow and architecting a meta-game can fry decision bandwidth
- **Resource Risk Appetite** – The leap from king-move to fatal over-extension is big
- **Delegation Paralysis** – Solo captain can steer a speedboat; building a battleship. If can't let go of sub-systems will bottleneck the whole fleet
- **Emotional Latency** – Processes threats intellectually first, emotions later. RTS-style time stress plus family duty is a cortisol cocktail

────────────────────────────────────────

## 5. THE SYSTEM

### Game Rules
- **Two Superior entity classee**: Account, Links
  - **Account** = Identity & authentication (WHO the user is) - Single source of truth for current user and personal data
  - **Links** = Connector Entity, that serves as bridge between all other entities workflows.
- **Seven core entity classes**:  Player, Character, Task, Item, Financial, Sale, Site
  - **Player** = Game progression (WHAT they've achieved) - Points, level, achievements
  - **Character** = Business role (HOW they interact) - Roles, jungleCoins, inventory
  - **Tasks** = Future missions, recurrent work, strategic planning (things that will happen)
  - **Items** = Physical/digital assets created by Tasks or Records (artworks, prints, stickers, materials, equipment)
  - **FinancialRecords** = Past completed financial actions (company/personal expenses, income, purchases)
  - **Sales** = Transaction records (ferias, consignment sales, direct sales, exchanges)
  - **Sites** = Locations of different types - physical (real life sites), cloud (digital), system (others) 
- **The Triforce**: Account + Player + Character permanently linked from system start
- **Character Roles** = Define what a character can do in the system (FOUNDER, PLAYER, CUSTOMER, DESIGNER, etc.)
- **V0.1 Reality**: Player One (bootstrap identity) with Account, Player, and Character entities linked
- **V0.2 Vision**: Multiple users with accounts, players, and characters (one character per person per game)
- **Every entity gets a globally unique ID** (UUID)
- **Jungle Coin (J$)** ≡ $10 USD; awarded to characters for logged completions (In-Game Currency, could be a real crypto coin in the future)
- **Points** = Real progression system for players (HP, FP, RP, XP) - separate from character game mechanics

### Currency System
- **Primary Currency**: USD - used for all business operations (inventories, payments, expenses)
- **Reward Currency**: Jungle Coins (J$) - reward tokens that convert to USD (like Zelda gems)
- **Conversion Rate**: 1 J$ = $10 USD (configurable via constants)
- **Additional Currencies**: Bitcoin (BTC) and Costa Rica Colon (CRC) for asset diversification
- **Usage**: USD for business, J$ for character rewards and achievements, crypto for investments
- **Player Progression**: Points (HP, FP, RP, XP) - separate from currency system, real progression tracking

### Financial & Logging System
- **Company vs Personal Split**: Separate tracking for business and personal finances
- **Monthly Records**: Income, expenses, and J$ flow tracked monthly
- **Asset Management**: 
  - Company: Monetary assets, J$ holdings, Inventories (materials, equipment, artworks, prints, stickers, merch)
  - Personal: Monetary assets, J$ holdings, Other assets (vehicle, properties, NFTs)
- **J$ Flow**: Company pays out J$ to player (negative for company, positive for personal)
- **Complete Audit Trail**: Comprehensive logging of all system activities with idempotent operations
- **Real-time Updates**: Event-driven system for immediate UI updates

### Points System (Player Progression)
- **Four Point Types**: 
  - **HP** (Health Points) - Wellness and lifestyle achievements
  - **FP** (Family Points) - Family and relationship activities  
  - **RP** (Research Points) - Learning and knowledge acquisition
  - **XP** (Experience Points) - Work and skill development
- **Player Ownership**: Points belong to Player entity (real progression tracking)
- **Character Rewards**: Characters earn Jungle Coins (J$) for completed tasks
- **Earning**: Points awarded to Player when tasks completed by Characters with PLAYER role
- **Achievement Tracking**: `achievementsPlayer` field stores player-specific badges/milestones
- **Integration**: Points system integrated with Mission Hub task completion
- **Progression**: Points track real player development and achievement

### Financial Split
- `Task.financials.cost` = cost of action
- `Record.financials.cost` = cost of completed action
- `Item.financials.cost` = resulting unit cost (solves double counting)

### Entity Relationships & Effects
**Tasks** (Future Planning):
- Create Items when completed (Done/Collected status)
- Log to Tasks Log, Financials Log, Items Log, Character Log, Player Log
- Can be updated (idempotent) - all logs update accordingly
- Can be deleted - removes created items and all log entries

**Records** (Past Activities):
- Create Items immediately when saved
- Log to Financials Log, Items Log, Character Log, Player Log
- Can be updated (idempotent) - all logs update accordingly  
- Can be deleted - removes created items and all log entries
- Examples: Buy groceries, buy materials, buy equipment (fan, tools, etc.)

**Items** (Assets):
- Created by Tasks (when completed) or Records (when saved)
- Linked via `sourceTaskId` or `sourceRecordId`
- Tracked in inventory system with stock management
- Can be updated, moved, sold, or archived

**Characters** (In-Game Entities):
- Have roles that define what they can do (FOUNDER, PLAYER, CUSTOMER, etc.)
- Earn Jungle Coins (J$) for completed tasks
- Have communication personality (`commColor`)
- Can own items and have purchased amounts
- Link to Player via `playerId` and Account via `accountId`
- Achievement tracking via `achievementsCharacter` field

**Accounts** (Identity & Authentication):
- Single source of truth for personal data (name, email, phone)
- Security layer (passwordHash, sessions, privacy settings)
- Links to Player (optional) and Character (required)
- The Triforce: Account ↔ Player ↔ Character

**Players** (Real People):
- Own points (HP, FP, RP, XP) for real progression
- Manage multiple characters via `characterIds[]`
- Link to Account via `accountId` ambassador field
- Track overall development and achievements (`achievementsPlayer`)

### Archive System (V0.2)
- **Archive Fields**: Entities use `isActive` (Player, Character, Site) or `isCollected` (Task, Item, Financial, Sale)
- **Status Preservation**: needs to be decided how to change the entities status when IsCollected
- **Monthly Workflow**: 
  - Sold/Gifted items tracked in monthly collections
  - End-of-month "Admin" task processes collections
  - Historical data preserved with original statuses intact

### Tech Stack (versions locked for compatibility)
Next.js 14.2.3 • React 18.2.0 • Three.js 0.160.0 • @react-three/fiber 8.15.12 • @react-three/drei 9.96.5 • TypeScript • Tailwind CSS • ESLint

#### Security & Auth
- jose (JWT, HS256) – used in Node route handlers and Edge middleware
- Admin Access added: simple passphrase login (no third party) with jose-signed JWT cookie. Middleware protects `/admin/*`; public: `/admin/login` and `/admin/login/submit`.
- Env vars: `ADMIN_ACCESS_KEY` (passphrase), `ADMIN_SESSION_SECRET` (long random). Cookie: `admin_session`, httpOnly, sameSite=lax, secure in prod, 7d default, 30d with "Remember me".
- Temporary diagnostics for the sale: `/api/session-check`, `/api/edge-env-check` (remove after the event).

### Theme System
**Theme Management:**
- **Single Source of Truth**: `useTheme()` hook manages both theme colors and dark/light mode
- **Storage**: Theme preferences stored in `localStorage` (`'color-theme'` and `'theme'`)
- **CSS Variables**: Dynamic theme application via CSS custom properties
- **Persistence**: Theme preferences preserved during data resets
- **Available Themes**: Slate, Blue, Green, Red, Orange, Purple, Pink, Yellow
- **Dark Mode**: Integrated toggle with automatic CSS variable updates

**Theme Architecture:**
- **ThemeProvider**: Simple wrapper that initializes the theme system
- **useTheme Hook**: Core theme management with state and persistence
- **Theme Constants**: Centralized theme definitions and configurations
- **CSS Integration**: Automatic application of theme variables to document root

### **UI Components & Dependencies**
**Core UI Dependencies:**
- class-variance-authority: ^0.7.1
- clsx: ^2.1.1
- tailwind-merge: ^3.3.1
- tailwindcss-animate: ^1.0.7

**Radix UI Primitives (Shadcn Base):**
- @radix-ui/react-checkbox: ^1.3.3
- @radix-ui/react-dialog: ^1.1.15
- @radix-ui/react-label: ^2.1.7
- @radix-ui/react-popover: ^1.1.15
- @radix-ui/react-scroll-area: ^1.2.9
- @radix-ui/react-select: ^2.2.5
- @radix-ui/react-slot: ^1.2.3
- @radix-ui/react-switch: ^1.2.5
- @radix-ui/react-tabs: ^1.1.12
- @radix-ui/react-tooltip: ^1.2.7

**Additional UI Dependencies:**
- cmdk: ^1.1.1 (Command component)
- lucide-react: ^0.468.0 (Icons)
- react-day-picker: ^9.9.0 (Calendar component)
- date-fns: ^4.1.0 (Date utilities)
- framer-motion: ^12.23.12 (Animations)
- Icon Library: lucide

**Shadcn Components in Use:**
- Badge, Button, Calendar, Card, Checkbox, Command
- DateInput, DatePicker, Dialog, FrequencyCalendar (custom)
- Input, Label, ModeToggle, Popover, ScrollArea
- SearchableSelect (custom), Select, Switch, Tabs, Textarea, Tooltip

### Persistence Strategy
- **Architecture**: KV-Only (Vercel KV as single source of truth)
- **Client-Side**: `lib/client-api.ts` - Simple fetch-based API calls
- **Server-Side**: Direct repository pattern with KV operations
- **No Environment Switching**: Production-only architecture

### **Storage Implementation**
**Core Data (Tasks, Items, Characters, Players, Sales, Financials, Sites):**
- **Storage**: Vercel KV via repository pattern
- **Client Access**: Direct API calls via ClientAPI
- **No Local Caching**: Direct KV operations only

**Logs (Financials, Tasks, Items, Characters, Players, Sales, Sites):**
- **Storage**: Vercel KV with append-only logging
- **Implementation**: workflows/entities-logging.ts



### LOGGING ARCHITECTURE
**Flow:** API routes → workflows → entities-logging.ts → KV storage

**Implementation:**
- Append-only logs for lifecycle events
- Update-in-place for descriptive fields
- Effects registry for idempotency
- All logs stored in Vercel KV

**Key Features:**
- **No Log Corruption**: Append-only logs prevent data corruption
- **No Duplicate Side Effects**: Effects registry prevents double-counting items, money, points
- **Simple Idempotency**: Tiny KV operations for idempotency
- **Multi-Tenancy Ready**: `ORG_ID` namespacing supports future multi-user features



### **Phase 11 Technical Achievements - BEST OF BOTH WORLDS LOGGING + THE ROSETTA STONE + PLAYER/CHARACTER SPLIT**

**Core Architecture (100% Complete):**
- **Append-Only Logs**: All 7 log types (tasks, items, financials, character, player, sales, sites) strictly append-only
- **Effects Registry**: Tiny idempotency checklist (lib/utils/effects-registry.ts) prevents duplicate side effects
- **No Log Corruption**: Simple GET/SET operations for idempotency (hasEffect/markEffect/clearEffect)
- **Environment Agnostic**: Same behavior in development (localStorage + filesystem) and production (KV)
- **Backfill Compatibility**: Backfill button works in both environments, reconstructs clean append-only logs
- **Rosetta Stone Effect**: Links System with Diplomatic Fields Pattern and Molecular Pattern implemented

**Entity Architecture (100% Complete):**
- **Unified Modal Pattern**: All modals emit pure entities via `onSave(entity)` - no side effect flags
- **DNA/RNA Pattern**: Workflows inspect entity properties automatically (task.status, task.outputItemType, etc.)
- **Smart Delete Modal**: Single unified DeleteModal handles all entity types with bulk support
- **Pattern Compliance**: Modal → Parent → DataStore → Adapter → Workflows architecture working
- **Workflow Integration**: processLinkEntity() as universal entry point for all entities
- **TaskModal Diplomatic Fields Pattern**: 4-column layout (Native, Native, Ambassadors, Emissaries) with collapsible Emissary section

**Links System (90% Complete):**
- **Link Infrastructure**: LinkRegistry class fully functional (lib/link-registry.ts - 323 lines)
- **Link Storage**: All 4 adapters implement createLink/getLinksFor/removeLink
- **Link Creation**: 30+ createLink() calls across entity-workflows.ts
- **Link Types**: All 19 link types implemented (TASK_ITEM, ITEM_SITE, SALE_CHARACTER, etc.)
- **Link Rules Engine**: 15+ cascade rules defined (cascade/prompt/block/ignore behaviors)
- **Link Querying**: getLinksFor(), getLinksByType(), getRelationshipGraph() working
- **UI Integration**: Links Tab in Data Center operational, modals need "Show Relationships" buttons

**Logging & Entity Purity (100% Complete):**
- **Entity Purity**: Each entity logs only what defines it - no bloated cross-entity data
- **The Rosetta Stone Effect**: Links System creates coherent relationship network (operational)
- **Player/Character Split**: Player = THE BOSS (authentication, points), Character = external people (roles, jungleCoins)
- **Ambassador Fields**: Cross-entity references enable Link creation (sourceTaskId, siteId, playerId)

**Critical Issues Found:**
- ⚠️ **API Security**: All 27 API routes unprotected (no authentication)
- ⚠️ **Environment Inconsistency**: Production uses sideEffect flags, dev inspects properties
- ⚠️ **Zero Testing**: No automated tests for 3,259 lines of critical business logic

### **SYSTEM DEVELOPMENT PRINCIPLES**

#### **Core Philosophy**
- **"Genius is making the complex simple"** – Prefer elegant, straightforward solutions over over-engineered complexity
- **"The whole is bigger than the sum of its parts"** – Design for system-wide coherence and integration, not isolated features
- **Foundations First** – Ensure solid, type-safe foundations before building features
- **Global Thinking** – Consider how changes affect the entire system, not just individual components
- **User Experience First** – Since this is a gamified admin web app for business, UX is top priority
- **Entity Purity** – Each entity logs only what defines it; relationships are handled by the Links System
- **Player/Character Distinction** – Points belong to Player (real progression), Characters have Jungle Coins (game mechanics)

#### **Code Doctrines**
- **DRY** – defaults only in DataStore, centralized constants management
- **Single Responsibility** – UI shows, DataStore manages
- **Consistency** – every component pulls from the same source
- **Maintainability** – change a default once, everywhere updates
- **Constants First** – hardcoded values replaced with centralized constants
- **Idempotency First** – All task/item status changes must be idempotent to prevent duplicate effects when status is toggled multiple times

#### **Architectural Principles**
- **Separation of Concerns** – Each layer has clear, single responsibility
- **Environment Parity** – LocalAdapter mirrors production behavior
- **Atomic Operations** – localStorage operations are naturally atomic, KV operations use Redis EVAL
- **Cross-Environment Consistency** – Identical behavior between localStorage and KV
- **Multi-Tenancy Ready** – `ORG_ID` namespacing supports future multi-user features

#### **Quality Standards**
**Ensure consistency** across:
   - Enums and types
   - Component names and props
   - Function names and parameters
   - UI labels and messages
   - Documentation, comments
   - Use correct terminology

### **Preferred UI Libraries & Technologies**
- **Radix UI** – Accessible, unstyled components (Dialog, Select, etc.)
- **Shadcn/ui** – Beautiful, consistent component styling built on Radix
- **Lucide React** – Clean, professional icons matching business aesthetic
- **Framer Motion** – Smooth animations and transitions
- **Tailwind CSS** – Utility-first styling and responsive design
- **Three.js & React Three Fiber** – 3D models, interactive scenes, and immersive visualizations
- **Motion**: Smooth animations enhance the gamified experience

### **Recent Technical Improvements**

**Enhanced Component Architecture:**
- **SearchableSelect**: Universal modal compatibility with proper z-index management
- **RecordModal**: Unified interface for Company and Personal financial records with enum-driven logic
- **Unified Logging**: Complete audit trail with idempotent operations and API consistency
- **Z-Index Layer System**: Comprehensive z-index management preventing Shadcn component interaction issues
- **Date Format System**: Centralized date formatting with DD-MM-YYYY default and global constants
- **Shadcn Component Integration**: Solved persistent z-index conflicts that prevented dropdown interactions
- **Modal Hierarchy Management**: Proper layering system for nested modals and interactive elements
- **Admin Access**: Added jose-based JWT auth, Edge middleware protection, and a minimal login/logout flow. Temporary diagnostics endpoints enabled for the sale.

────────────────────────────────────────

## 6. THE ROADMAP
  
### Phase 0 – Seed ✅
- Mission-Log (Admin v0.1) running locally
- Tech Architecture & DataStore foundation
- Secure domain + Vercel deploy

### Phase 1 – Minimum Viable Empire **ONGOING**
- Complete Basic Admin v0.1
- **Foundations** ✅ Solid foundation implemented with proper enums, entities, and data flow
- **Mission Hub v0.1** ✅ Implemented with hierarchical task management
- **Financial System v0.1** ✅ Implemented with Company/Personal split and J$ currency
- **Inventory System v0.1** ✅ Working with unified stock management and smart locations
- **Map System v0.1** ✅ Basic structure with World Map, Roadmap, and Diagrams tabs
- **Locations Hierarchy** ✅ Smart 4-tier hierarchical system ready for game mechanics
- **DataCenter System** ✅ Central repository for logs, notes, and tracking
- **Entities Architecture Pattern** ✅ Complete refactoring with unified modal patterns and side effects system
- Jungle Coin logic stubbed ✅
-**Front-End sections** ✅ Offers, Contact, Bio, Portfolio and Projects Sections done.


### Phase 2 – Expanding the Base + Ultra Modern UI
- **V0.2 Focus**: Make it look amazing (state-of-the-art visual design)
- **V0.1 Focus**: Make it work amazing (state-of-the-art architecture) ✅
- Admin v0.2: Dashboard analytics, CMS for portfolio, simple blog, ultra-modern UI across all sections
- Public site v1 (portfolio, simple store, classes page)
- Public v0.2: full Printful API, project showcases, class booking

### Phase 3 – Full-Fledged Empire
- Admin v3: 3D Board, live KPIs, task-to-board animation
- Public v3: immersive web3 gallery, AI Agents & Bots for marketing and others, client portal with subscriptions

### Phase 4+ – Advanced Features
- Tech Tree, Team & Characters traits, Events, Multiplayer, DAO layer (TBD)

────────────────────
────────────────────

────────────────────────────────────────

## 7. REFERENCE APPENDIX

────────────────────
### Game-Mechanic Inspiration Bank
Civilization • Shogun Total War • Crusader Kings • Disco Elysium • GTA • Football Manager • City Builders • Tycoon games

────────────────────
### Admin UI Folder Outline
```
app/admin/
  layout.tsx
  page.tsx                    // redirects to control-room
  login/page.tsx              // Admin login page (passphrase)
  login/submit/route.ts       // POST handler: sets cookie and redirects
  logout/route.ts             // Clears admin cookie
  control-room/page.tsx       // Control Room interface
  finances/page.tsx           // Financial Management
  inventories/page.tsx        // Inventory Management
  sales/page.tsx              // Sales Tracking
  dashboards/page.tsx         // Analytics Dashboard
  map/page.tsx                // Map Management
  data-center/page.tsx        // DataCenter - logs, notes, tracking
  research/page.tsx           // Research & Development
  player/page.tsx             // Player profile, points, achievements
  archive/page.tsx            // Historical Data
  settings/page.tsx           // System Configuration

app/api/                      // Phase 10.4: Core Data APIs
  tasks/route.ts              // CRUD operations for tasks
  items/route.ts              // CRUD operations for items  
  assets/route.ts             // CRUD operations for assets
  settings/route.ts           // CRUD operations for settings
  financials-log/route.ts     // Financial logs (existing)
  tasks-log/route.ts          // Task logs (existing)
  items-log/route.ts          // Item logs (existing)
  player-log/route.ts         // Player logs (existing)

components/
  control-room/             
    control-room.tsx       // Main container with custom resizable sidebar
    task-tree.tsx            // Hierarchical navigation
    task-detail-view.tsx     // Task information display
  task-modal.tsx             // Create/edit tasks
  inventory-display.tsx      // Inventory management interface
  item-modal.tsx             // Item creation/editing
  bulk-edit-modal.tsx        // Bulk operations
  move-items-modal.tsx       // Location transfers
  theme-provider.tsx         // Dynamic theme management
  data-sync.tsx              // Data import/export
  csv-import.tsx             // CSV import functionality

lib/
  adapters/                   // Phase 10.4: DataAdapter Pattern (SIMPLIFIED)
    local-adapter.ts          // localStorage implementation (development)
    hybrid-adapter.ts         // Hybrid (KV + cache) implementation (production)
    logging-local-adapter.ts  // filesystem logging (development)
    logging-hybrid-adapter.ts // KV logging (production)
  data-store.ts               // Main DataStore (Phase 10.4) - orchestrates adapters
  data-store-legacy.ts        // Original localStorage DataStore
```


### Type Schemas (TypeScript-style)
*Note: All enums are canonical; front-end MUST reference exactly these strings.*

```typescript
// Core Enums
enum Station {
  ADMIN = 'Admin',
  RESEARCH = 'Research', 
  INVENTORY = 'Inventory',
  TRANSPORT = 'Transport',
  TEAM = 'Team Management',
  DESIGN = 'Design',
  GAME_DESIGN = 'Game Design',
  PRODUCTION = 'Production',
  SALES = 'Sales',
  MARKETING = 'Marketing',
  CLASSES = 'Classes'
}

enum TaskCategory {
  MISSION = 'Mission',
  MILESTONE = 'Milestone', 
  GOAL = 'Goal',
  ASSIGNMENT = 'Assignment',
  RECURRENT = 'Recurrent'
}

enum TaskStatus {
  CREATED = 'Created',
  ON_HOLD = 'On Hold',
  IN_PROGRESS = 'In Progress',
  FINISHING = 'Finishing',
  DONE = 'Done',
  COLLECTED = 'Collected',
  FAILED = 'Failed',
  NONE = 'None'
}

enum TaskPriority {
  NOT_NOW = 'Not Now',
  SLOW = 'Slow',
  NORMAL = 'Normal',
  IMPORTANT = 'Important',
  URGENT = 'Urgent'
}

enum FinancialStatus {
  DONE = 'Done',
  COLLECTED = 'Collected'
}

enum DevSprintStatus {
  NOT_STARTED = 'Not Started',
  IN_PROGRESS = 'In Progress',
  DONE = 'Done'
}

### **Status Color Mappings**

**Color Scheme Logic:**
- **Orange**: Created (new items/tasks)
- **Gray**: On Hold, Not Started, Pending states
- **Blue**: In Progress, Active states
- **Purple**: Finishing (transitional state)
- **Green**: Done, Completed, Sold states
- **Yellow**: Collected, Rewarded states
- **Red**: Failed, Damaged, Obsolete states

## **Item Types & SubTypes**

```typescript
enum ItemType {
  DIGITAL      = 'Digital Art',
  ARTWORK      = 'Artwork',
  PRINT        = 'Print',
  STICKER      = 'Sticker',
  MERCH        = 'Merchandise',
  MATERIAL     = 'Material',
  EQUIPMENT    = 'Equipment'
}

// Type-safe SubItemType definitions
type StickerSubType = "Brilliant White" | "Reflective" | "Mate";
type ArtworkSubType = "Acrylic on Canvas" | "Acrylic on Wood" | "Assamblages" | "Mural" | "Furniture Art";
type DigitalSubType = "Digital Art" | "Digitalization" | "NFT";
type MerchSubType = "T-Shirts" | "Bags" | "Shoes" | "Rashguards" | "Sports Bra";
type MaterialSubType = "Art Materials" | "Design Materials" | "Workshop Materials";
type EquipmentSubType = "Art Tools & Equipment" | "Design Tools & Equipment" | "Workshop Tools & Equipment" | "Vehicle";
type PrintSubType = "Standard Print";

// Union type for all possible SubItemTypes
type SubItemType = StickerSubType | ArtworkSubType | DigitalSubType | MerchSubType | MaterialSubType | EquipmentSubType | PrintSubType;
```

### **Digital Art**
- **Digital Art**: Original digital creations
- **Digitalization**: Scanned/photographed physical art
- **NFT**: Blockchain-based digital assets

### **Artworks** 
- **Acrylic on Canvas**: Traditional canvas paintings
- **Acrylic on Wood**: Wood-based paintings
- **Assamblages**: Mixed media sculptures
- **Mural**: Large-scale wall art (subtype of Artwork)
- **Furniture Art**: Functional art pieces

### **Prints**
- No subtypes currently defined
- Standard print reproductions

### **Stickers**
- **Brilliant White**: High-quality white background
- **Reflective**: Light-reflecting material
- **Mate**: Non-glossy finish

### **Merchandise** (includes former Apparel)
- **T-Shirts**: Cotton and performance fabrics
- **Bags**: Totes, backpacks, pouches
- **Shoes**: Sneakers, sandals, boots
- **Rashguards**: Water sports wear
- **Sports Bra**: Athletic undergarments

### **Materials**
- **Art Materials**: Paints, brushes, canvases
- **Design Materials**: Digital tools, software
- **Workshop Materials**: Construction supplies

### **Equipment**
- **Art Tools & Equipment**: Brushes, easels, palettes
- **Design Tools & Equipment**: Computers, tablets, software
- **Workshop Tools & Equipment**: Power tools, hand tools
- **Vehicle**: Transportation for art business

enum ItemStatus {
  FOR_SALE = 'For Sale',
  SOLD = 'Sold',
  TO_ORDER = 'To Order',
  TO_DO = 'To Do',
  GIFTED = 'Gifted',
  RESERVED = 'Reserved',
  OBSOLETE = 'Obsolete',
  DAMAGED = 'Damaged',
  IDLE = 'Idle',
  COLLECTED = 'Collected'
}

**Note**: Items use `isCollected` boolean field for monthly collection tracking. When items are sold or gifted, they maintain their statuses and can be collected for monthly reporting.

enum Collection {
  ORGANIC_IMAGINARY = 'Organic Imaginary',
  POLYGONAL_HD = 'Polygonal HD',
  MUSHLAND = 'Mushland',
  ANIMAL_KINGDOM = 'Animal Kingdom',
  SEVEN_ELEMENTS = '7 Elements',
  BITCOIN = 'Bitcoin',
  DOPE_CREW = 'Dope Crew'
}

enum Site {
  HOME_STORAGE = 'Home Storage',
  FERIA_BOX = 'Feria Box',
  STORE_1 = 'Store 1'
}

enum SalesSessionStatus {
  PENDING_RECONCILIATION = 'Pending Reconciliation',
  RECONCILED = 'Reconciled'
}

// Core Interfaces
interface BaseEntity {
  id: string               // uuid
  name: string
  description?: string
  createdAt: Date
  updatedAt: Date
  links: Link[]            // Rosetta Stone relationship tracking
  // Note: Archive Fields (isActive, isCollected) are entity-specific
}

interface Rewards {
  jungleCoins: number      // 1 J$ = US$10 (your rule)
  points?: {               // Points system for gamification
    hp: number;            // Health Points
    fp: number;            // Family Points   
    rp: number;            // Research Points
    xp: number;            // Experience Points
  };
}

interface StockPoint {
  siteId: Site
  quantity: number
}

interface Item extends BaseEntity {
  type: ItemType
  collection?: Collection
  status: ItemStatus
  station: Station
  stock: StockPoint[]          // multiple locations
  unitCost: number             // must be calculated
  price: number                // must be set
  sourceTaskId?: string | null // e.g. related to "Order Stickers"
}

interface Task extends BaseEntity {
  category: TaskCategory
  status: TaskStatus
  priority: TaskPriority
  station: Station
  progress: number             // 0-100
  dueDate?: Date
  order: number                // Represents sort order among siblings

  // hierarchy
  parentId?: string | null;  // Single parent field - can be Mission, Milestone, Goal, or Recurrent Parent/Template
  isRecurrentParent?: boolean;       // Is this a Recurrent Parent?
  isTemplate?: boolean;              // Is this a Recurrent Template?
  outputItemId?: string | null // if this task creates an Item

  // finance snapshot (for THIS task only)
  cost: number                 // negative cash impact
  revenue: number              // positive cash impact
  rewards: Rewards
}

interface Product {
  /* flavour A */ itemId?: string
  /* flavour B */ itemType?: ItemType

  quantitySold: number
  revenue: number          // total money collected for that line
}

interface SalesSession extends BaseEntity {
  saleDate: Date
  siteId: Site
  products: Product[]
  totalRevenue: number         // redundancy for fast queries
  status: SalesSessionStatus
  notes?: string
}

// Theme System
interface ThemeColors {
  primary: { light: string; dark: string }
  secondary: { light: string; dark: string }
  accent: { light: string; dark: string }
  highlight: { light: string; dark: string }
  active: { light: string; dark: string }
  statuses: {
    notStarted: string
    inProgress: string
    finishing: string
    done: string
    collected: string
  }
}

interface SiteSettings {
  theme: ThemeColors
}
```

──────────────────── 

────────────────────
### **CRITICAL BUG DOCUMENTATION**

**CURSOR AI CHAT SERIALIZATION ERROR BUG**

**Error:** `ConnectError: [internal] Serialization error in aiserver.v1.StreamUnifiedChatRequestWithTools`

**Description:** This is a bug in Cursor's AI chat system, NOT a network connection issue. The error occurs when the AI tries to process certain types of code or responses and fails to serialize them properly.

**Triggers:**
- Running `npm run build` from the wrong directory (user directory instead of project directory)
- Error: `Could not read package.json: Error: ENOENT: no such file or directory, open 'C:\Users\Usuario\package.json'`
- The npm command looks for package.json in the wrong location

**Symptoms:**
- Chat becomes completely useless with serialization error
- Error repeats on every message
- No actual network connection issues (we can still chat in another chat)
- Error occurs specifically when running `npm run build` from wrong directory

**Solution:**
- Navigate to the correct project directory first: `cd "C:\Users\Usuario\AKILES\GAME WEB APP\akiles-ecosystem"`
- Then run: `npm run build`
- Alternative: Use full path: `npm run build --prefix "C:\Users\Usuario\AKILES\GAME WEB APP\akiles-ecosystem"`

**Prevention:**
- Always check current directory before running npm commands: `Get-Location`
- Always navigate to project directory first: `cd "C:\Users\Usuario\AKILES\GAME WEB APP\akiles-ecosystem"`
- Use proper PowerShell syntax (not bash && syntax)

**Status:** Known bug in Cursor IDE - needs to be reported to Cursor team

────────────────────────────────────────

## **CURRENT IMPLEMENTATION STATUS (Code-Verified - January 15, 2025)**

### ✅ What's Working (100% Complete - Architecture Verified)

**Core Systems (Fully Operational - All Verified):**
- ✅ **API Security**: All 34 API routes protected with `requireAdminAuth(request)` 
- ✅ **Links System**: 100% complete (links/link-registry.ts + createLink() calls in workflows)
- ✅ **Effects Registry**: 100% functional (hasEffect/markEffect preventing duplicates)
- ✅ **ClientAPI + Repository Pattern**: 100% operational (ClientAPI + Repository + Links support)
- ✅ **Entity Workflows**: 100% comprehensive (processLinkEntity for all 8 entity types)
- ✅ **Modal Pattern**: 100% correct (pure entity emission, no flags)
- ✅ **Sites System**: 100% complete (UUID entities with status tracking)
- ✅ **Logging System**: 100% operational (append-only logs in KV)
- ✅ **Player/Character Split**: 100% implemented (Player=progression, Character=game mechanics)

**Entity Processing (All Verified Working):**
- ✅ processTaskEffects(): Creates TASK_SITE, TASK_ITEM, TASK_FINREC, TASK_CHARACTER, TASK_PLAYER links
- ✅ processItemEffects(): Creates ITEM_SITE, ITEM_TASK, ITEM_FINREC links
- ✅ processFinancialEffects(): Creates FINREC_SITE, FINREC_TASK, FINREC_ITEM, FINREC_CHARACTER, FINREC_PLAYER links
- ✅ processSaleEffects(): Creates SALE_SITE, SALE_ITEM, SALE_CHARACTER, SALE_PLAYER links
- ✅ processCharacterEffects(): Creates CHARACTER_PLAYER links
- ✅ processPlayerEffects(): Creates PLAYER_CHARACTER links
- ✅ processSiteEffects(): Working with status system
- ✅ processAccountEffects(): Creates ACCOUNT_PLAYER, ACCOUNT_CHARACTER links

**UI Components (All Updated and Working):**
- ✅ CharacterModal: Role-based logic, Jungle Coins display
- ✅ PlayerModal: Points system, progression tracking
- ✅ TaskModal: Diplomatic Fields Pattern (4-column layout)
- ✅ ItemModal: Ambassador fields, site relationships
- ✅ SalesModal: Payment tracking, character relationships
- ✅ RecordModal: Company/Personal split, financial tracking
- ✅ Admin Character Page: DataStore integration, role filtering
- ✅ Data Center Player Log Tab: Link-based filtering

### 🔴 Critical Issues RESOLVED

**Security Issues:**
- ✅ **API Routes Protected**: All 34 routes now have `requireAdminAuth(request)` authentication
- ✅ **Risk Mitigated**: Admin-only access to all data operations

**Architecture Issues:**
- ✅ **KV-Only Architecture**: Clean implementation with Vercel KV as single source of truth
- ✅ **Unified Processing**: Consistent entity processing via API routes

**Testing Issues:**
- ⚠️ **Zero Automated Tests**: Still no test frameworks (not critical for current verification)
- ⚠️ **Risk**: 3,000+ lines of workflows untested (will be addressed in future phases)

### 🟡 Medium Issues (Non-Critical)

**Code Organization:**
- ⚠️ Per-entity workflow files in workflows/entities-workflows/ (optimization opportunity)
- ⚠️ Large modal components (optimization opportunity)

**Design Clarification Needed:**
- ⚠️ Player.jungleCoins vs Character.jungleCoins usage patterns
- ⚠️ Both entities have jungleCoins field (design decision needed)

### 🟢 Minor Polish (Future Phases)

- ⚠️ Links UI: "Show Relationships" buttons in entity modals
- ⚠️ Cascade Operations: Link Rules Engine cascade behaviors
- ⚠️ Performance: Large file optimization

────────────────────────────────────────
