# THEGAME WIKI - COMPACT REFERENCE

## CORE CONCEPT
**Gamified Admin Web-app** - Transform business management into a strategic game using game mechanics to overcome human limitations and make life management engaging.

## PLAYER PROFILE: AKILES
- **Multi-disciplinary artist/designer/developer**
- **Current Situation**: Gentrification, no studio, visa issues, time scarcity, weak art market, $2K capital
- **Primary Quests**: Residency approval, $1.5-2K monthly revenue, live admin app, operational HQ
- **Skills**: Strategic Vision (9), Systems Thinking (9), Creative Output (8), Resourcefulness (8)

## BUSINESS STRUCTURE
- **Stations**: ADMIN, RESEARCH, INVENTORY, TRANSPORT, TEAM, DESIGN, GAME-DESIGN, PRODUCTION, SALES, MARKETING, CLASSES
- **Item Types**: DIGITAL, PRINT, STICKER, ARTWORK, MERCH, MATERIAL, EQUIPMENT
- **Sites**: HOME_STORAGE, FERIA_BOX, CONSIGNMENT_NETWORK, HQ
- **Brand**: Akiles (artist/business), TheGame (admin app), akiles-ecosystem (venture)

## ENTITY HIERARCHY

### ULTRA ENTITIES (System Foundation)
1. **Account** - Identity & authentication (WHO the user is)
2. **Links** - Connector entity bridging all workflows (The Rosetta Stone)

### CORE ENTITIES (Business Logic)
1. **Task** - Future missions, recurrent work, strategic planning
2. **Item** - Physical/digital assets - created by Item modal, CSV/json imports, or Tasks/Records
3. **Sale** - Transaction records
4. **FinancialRecord** - Entities financial records and past completed financial actions
5. **Site** - Locations of different types
6. **Character** - Character Roles Business role - Achievements - Inventory - (HOW they interact)
7. **Player** - Game progression - Points, Level, Achievements - (WHAT they've achieved)

### INFRA ENTITIES (Supporting Data)
1. **Settlement** - Location areas/territories (reference data for Sites)

## THE TRIFORCE
**Account ↔ Player ↔ Character** - Permanently linked from system start

## CURRENCY SYSTEM
- **USD** - Primary currency for business operations
- **Jungle Coins (J$)** - Reward currency, 1 J$ = $10 USD
- **Points** - Real progression (HP, FP, RP, XP) separate from game mechanics

## KEY ARCHITECTURE PATTERNS

### Diplomatic Fields Pattern
- **Native Fields**: Core entity properties, always present
- **Ambassador Fields**: Cross-entity references, always present, create links
- **Emissary Fields**: Conditional entity creation, conditionally present, create links

### Molecular Pattern: Modal → Section → ClientAPI → API Routes → Workflows
- **Modal**: Pure UI forms, emits `onSave(entity)` - no flags
- **Section**: Orchestrates data flow, calls ClientAPI
- **ClientAPI**: Simple fetch-based API calls to 34 routes
- **API Routes**: Server-side CRUD + KV operations
- **Workflows**: The Ribosome - reads DNA, creates Links, synthesizes entities

### Best of Both Worlds Pattern: Logging Architecture
- **Append-Only Logs**: All logs strictly append-only for clean history
- **Effects Registry**: Tiny checklist prevents duplicate side effects
- **Entity Purity**: Each entity logs only what defines it
- **Links System**: Handles relationships between entities

## CURRENT STATUS (v0.1)
✅ **Production Ready (A+ 99/100)**: All systems operational with KV-only architecture
✅ **Working Systems**: Control Room, Finances, Inventory, Map, DataCenter, Links System, Settings
✅ **Architecture**: 100% complete with proper enums, entities, data flow
✅ **Security**: All 34 API routes protected with authentication
✅ **Links System**: 100% operational with 30+ createLink() calls
✅ **Settlement System**: Dynamic settlements as reference data for Sites
✅ **Data Management**: Import/Export/Seed data with settlements support

## CRITICAL UI PATTERNS
- **ALWAYS use `NumericInput`** for number fields (never `type="number"`)
- **Z-Index Layers**: BASE(0), MODALS(100), INNER_MODALS(200), CRITICAL(1000)
- **Status Colors**: Orange(Created), Gray(On Hold), Blue(In Progress), Green(Done), Red(Failed)

## TERMINOLOGY
- **LOCATION** = Geographical area (Uvita, Puntarenas, Costa Rica)
- **SITE** = Specific area where items exist (El Hornito, Home, World, Google Drive)
- **SETTLEMENT** = Area of influence/territory (Uvita, Dominical, Ojochal) - user-creatable reference data for Sites

## ROADMAP
- **Phase 1**: Minimum Viable Empire (ONGOING) - v0.1 architecture complete
- **Phase 2**: Ultra Modern UI - v0.2 visual design
- **Phase 3**: Full-Fledged Empire - 3D Board, live KPIs
- **Phase 4+**: Advanced Features - Tech Tree, Multiplayer, DAO

## TECH STACK
Next.js 14.2.3, React 18.2.0, TypeScript, Tailwind CSS, Radix UI + Shadcn/ui, Three.js, jose (JWT auth)
