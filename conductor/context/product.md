# Product Context: TheGame

## Vision
**TheGame** is a gamified admin web-application designed to manage the life and business of "Akiles" (the player). It applies game mechanics (RTS, TBS, RPG) to real-world tasks, finances, and business expansion.

**Core Philosophy**:
- **Gamify Daily Tasks**: Turn chores into missions and quests.
- **Strategic Management**: View life as a strategy game (Civilization/Football Manager).
- **Reality Layer**: The "Player" is a real person (Akiles) with real constraints (cash flow, time, legal status).

## The Player: Akiles
- **Profile**: Multi-disciplinary artist, designer, developer.
- **Current Situation**: Gentrification, no studio, visa issues, time scarcity, weak art market, ~$2K capital.
- **Primary Quests**: 
  - Residency/Visa stability.
  - Financial stability ($1,500-$2,000/mo net).
  - Business expansion (Studio, physical products).
  - Live Admin App (TheGame).
- **Stats**: Strategic Vision (9), Systems Thinking (9), Creative Output (8), Resourcefulness (8).

## The Business: Akiles Ecosystem
- **Stations (Departments)**: ADMIN, RESEARCH, INVENTORY, TRANSPORT, TEAM, DESIGN, GAME-DESIGN, PRODUCTION, SALES, MARKETING, CLASSES.
- **Offerings**:
  - **Items**: DIGITAL, PRINT, STICKER, ARTWORK, MERCH, MATERIAL, EQUIPMENT.
  - **Services**: Classes, Graphic Design, Web App Design.
- **Sites**: HOME_STORAGE, FERIA_BOX, CONSIGNMENT_NETWORK, HQ.
- **Brand**: Akiles (artist/business), TheGame (admin app), akiles-ecosystem (venture).

## Entity Hierarchy

### 1. Ultra Entities (System Foundation)
- **Account**: Identity & authentication (WHO the user is). Single source of truth for personal data and security.
- **Links**: Connector entity bridging all workflows (The Rosetta Stone).

### 2. Core Entities (Business Logic)
- **Task**: Future missions, recurrent work, strategic planning.
- **Item**: Physical/digital assets.
- **Sale**: Transaction records.
- **FinancialRecord**: Past completed financial actions.
- **Site**: Locations (Physical/Virtual).
- **Character**: In-game roles (Founder, Player, Customer) with Inventory and JungleCoins.
- **Player**: Real progression (Points, Levels, Achievements).

### 3. Infra Entities (Supporting Data)
- **Settlement**: Location areas/territories serving as reference data for Sites.

## The Triforce
**Account ↔ Player ↔ Character** are permanently linked from system start.

## Game Mechanics
- **Currencies**: 
  - **USD**: Real business operations.
  - **Jungle Coins (J$)**: In-game reward currency (1 J$ = $10 USD).
  - **Points**: HP (Health), FP (Family), RP (Research), XP (Experience) for Player progression.
- **Loop**: 
  1. Plan (TBS phase)
  2. Execute (RTS phase)
  3. Log & Reward (RPG phase - J$/Points)

## Roadmap & Status (v0.1)
**Current Status**: ✅ **Production Ready (A+ 99/100)**
- **Architecture**: KV-only, ClientAPI + 34 protected API routes.
- **Systems**: Control Room, Finances, Inventory, Map, DataCenter, Links System (100% operational).
- **Security**: All API routes protected (jose/JWT).

**Phases**:
- **Phase 0 (Seed)**: ✅ Admin v0.1 local, Tech Architecture.
- **Phase 1 (MVE)**: ✅ Foundations, Mission Hub, Financials, Inventory, Links System, Map. (ONGOING)
- **Phase 2 (Expansion)**: State-of-the-art UI, Admin v0.2, Public Site.
- **Phase 3 (Empire)**: 3D Board, Web3 Gallery, AI Agents.
