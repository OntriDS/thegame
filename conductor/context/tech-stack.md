# Tech Stack Context

## Core Framework
- **Framework**: Next.js 14.2.3 (App Router)
- **Language**: TypeScript (Strict)
- **Styling**: Tailwind CSS 3.4 + `tailwindcss-animate`
- **State/Logic**: React 18.2.0 (Hooks, Context)

## UI Components & Libraries
- **Base**: Radix UI Primitives (Checkbox, Dialog, Label, Popover, Select, etc.)
- **Component Library**: Shadcn/ui (customized)
- **Icons**: Lucide React (`^0.468.0`)
- **Animations**: Framer Motion (`^12.23.12`)
- **Drag & Drop**: `@dnd-kit/core`, `@dnd-kit/sortable`, `@dnd-kit/modifiers` (v6/v9/v10)
- **Dates**: `date-fns` (`^4.1.0`), `react-day-picker` (`^9.9.0`)
- **Visualization**: `reactflow` (`^11.11.4`), `react-resizable`

## Data & Storage
- **Database**: Vercel KV (`@vercel/kv` `^3.0.0`) - Redis-based.
- **Auth**: `jose` (`^5.10.0`) for JWT/Session management.
- **Utilities**: `class-variance-authority`, `clsx`, `tailwind-merge`, `uuid`.

## Directory Structure
- `app/`: Next.js App Router (Routes & Pages).
  - `api/`: Server-side route handlers (34 protected routes).
  - `admin/`: Main application interface.
- `components/`: Feature-based UI components.
- `lib/`: Core logic.
  - `data-store.ts`: Repository pattern for KV.
- `workflows/`: "The Ribosome" - Entity processing logic.
- `conductor/`: Context-Driven Development files.
- `z_md/`: Legacy documentation.

## Visual Standards
- **Premium Aesthetic**: "Wow" factor, Glassmorphism, dynamic animations.
- **Theme System**: Custom `useTheme` hook with multiple color themes and Dark/Light mode.
- **Input Rule**: ALWAYS use `NumericInput` for numbers. NEVER `type="number"`.
