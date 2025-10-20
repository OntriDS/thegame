# TheGame Admin

A gamified admin web-app for business management with Vercel-only architecture. Built with Next.js 14, TypeScript, and modern UI libraries.

## Features

- **Next.js 14** with App Router
- **TypeScript** for type safety
- **Tailwind CSS** for styling
- **Dark mode** by default with theme switching
- **Vercel KV** data persistence
- **Responsive design** with mobile-first approach

### Core Systems

- **Rosetta Stone Links System**: Entity relationship management with 35+ link types
- **Mission Hub**: Hierarchical task management with recurrent tasks
- **Financial System**: Company vs Personal split with monthly tracking
- **Inventory System**: Unified stock management across multiple sites
- **Settlement System**: Dynamic territory management for business expansion
- **Points System**: XP, RP, FP, HP gamification with Jungle Coins
- **Data Management**: Import/Export/Seed data with full entity support

### UI Components

- **Radix UI** for accessible primitives
- **Shadcn/ui** for beautiful, consistent components
- **Lucide React** for clean, professional icons
- **Framer Motion** for smooth animations
- **Custom resizable sidebar** for optimal workspace layout

## Tech Stack

- Next.js 14.2.3
- React 18.2.0
- TypeScript
- Tailwind CSS
- Radix UI + Shadcn/ui
- Lucide React
- Framer Motion
- @dnd-kit for drag-and-drop
- @vercel/kv for data persistence

## Getting Started

1. Install dependencies:
```bash
npm install
```

2. Run the development server:
```bash
npm run dev
```

3. Open [http://localhost:3000](http://localhost:3000) in your browser.

## Architecture

Following the Rosetta Stone System architecture with clear entity hierarchy:

### Entity Hierarchy
- **ULTRA ENTITIES**: Account (authentication), Links (connectors)
- **CORE ENTITIES**: Task, Item, Sale, FinancialRecord, Site, Character, Player
- **INFRA ENTITIES**: Settlement (reference data for Sites)

### System Flow
```
ENUMS → ENTITIES → SECTIONS → MODALS → LINKS ← WORKFLOWS ← LOGGING
                    ↓
                  DATA-STORE (Vercel KV)
                    ↓
                  APIs → MCP (AI Tools)
                    ↓
                  BROWSER (User Interface)
```

## License

MIT
