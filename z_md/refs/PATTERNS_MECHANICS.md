# Patterns & Mechanics - TheGame Admin System

## Overview
This document defines the comprehensive patterns, workflows, and game mechanics for TheGame admin application. It covers the entities architecture pattern, game mechanics system, and implementation roadmap.

---

## **ENTITIES ARCHITECTURE PATTERN**

### **RESPONSIBILITIES PATTERN**

#### **Modal (UI Layer)**
**Purpose**: Pure UI form for data collection and validation.

**Responsibilities**:
- Collect and validate user inputs
- Emit entity (and optional sideEffects) via `onSave` callback
- Close immediately via parent-controlled open state
- Handle form state and user interactions

**What it DOES NOT do**:
- ❌ Call APIs directly
- ❌ Mutate global state
- ❌ Perform side effects or logging
- ❌ Handle persistence

**Example Pattern**:
```typescript
const handleSave = () => {
  const entity = buildEntityFromForm();
  const sideEffects = { isNew: !existingEntity };
  onSave(entity, sideEffects); // Emit to parent
  onOpenChange(false);   // Close modal
};
```

#### **Parent (UI State Manager)**
**Purpose**: Owns UI state, orchestrates data flow, updates UI.

**Responsibilities**:
- Own modal open/close state
- Receive entity from modal via `onSave`
- Close modal after receiving entity
- Call DataStore to persist entity
- Update local UI state from authoritative response
- Handle UI events and re-renders

**What it DOES NOT do**:
- ❌ Perform side effects or logging
- ❌ Handle business logic beyond UI state
- ❌ Call APIs directly (uses DataStore)

**Example Pattern**:
```typescript
const handleEntitySave = async (entity, sideEffects) => {
  setModalOpen(false);                    // Close modal
  const saved = await DataStore.upsertX(entity, sideEffects); // Persist via DataStore
  updateLocalState(saved);                // Update UI from response
};
```

#### **DataStore + Adapters (Client Gateway)**
**Purpose**: Unified client-side API that delegates to appropriate storage backend.

**Responsibilities**:
- Provide unified interface for all data operations
- Delegate to appropriate adapter based on environment
- Handle caching and UI event dispatching
- Manage cross-environment consistency

**Environment Detection**:
- **No KV detected** → LocalAdapter (development)
- **KV available** → HybridAdapter (production)

#### **LocalAdapter (Development/Offline)**
**Purpose**: Complete implementation for localhost development.

**Responsibilities**:
- Use localStorage for entity caching + filesystem for persistence
- **Mirror ALL server-side behavior**:
  - Trigger workflows (side effects)
  - Delegate logging to LoggingDataStore
  - Handle idempotency
  - Manage entity relationships
- Dispatch UI events for reactive components
- Provide complete parity with production

**Key Point**: LocalAdapter IS the "server-side" for localhost - it handles everything that production API routes handle.

#### **HybridAdapter (Production)**
**Purpose**: Production adapter with KV as source of truth.

**Responsibilities**:
- Fetch to API routes for persistence
- Manage browser cache (localStorage) for performance
- Dispatch UI events after successful operations
- Handle context-aware behavior (browser vs server)

**What it DOES NOT do**:
- ❌ Handle side effects (delegated to API routes)
- ❌ Write logs (delegated to API routes)

#### **API Routes (Production Only)**
**Purpose**: Server-side persistence and side effect orchestration.

**Responsibilities**:
- Persist entities to KV storage
- Trigger workflows for side effects
- Write logs via atomic operations
- Return authoritative entity to client

**Entity-Specific Links Effects**:
- **`/api/tasks`**: Inventory Item + Financial Log + Player Progress Log + Items Log + Tasks Log
- **`/api/financial-records`**: Inventory Item + Financial Log + Player Progress Log + Items Log
- **`/api/items`**: Inventory Item + Items Log

#### **Workflows + Logs (Both Environments)**
**Purpose**: Centralized side effect handling and logging.

**Responsibilities**:
- **Production**: Invoked by API routes
- **Development**: Invoked by LocalAdapter directly
- Atomic logging operations
- Idempotent side effect handling
- Cross-entity relationship management

---

## **GAME MECHANICS SYSTEM**

### **Role-Based Mechanics - The Foundation**

**CHARACTER** is the universal entity, **ROLES** define permissions:

```
CHARACTER < ROLES:
├── CUSTOMER → sales, data, commcolor
├── FOUNDER → god rights, extra features  
├── DESIGNER → can complete design tasks
├── PRODUCER → can do production tasks
├── SELLER → can make Sales
└── PLAYER → can get points! progression and so on!
```

**KEY PRINCIPLE**: All game mechanics are **role-gated**:
- **Points, progression, tech trees** → Only for characters with PLAYER role
- **Task completion** → Based on role (DESIGNER can complete design tasks)
- **Sales creation** → Based on role (SELLER can create sales)
- **Admin features** → Only for characters with FOUNDER role

### **Entity Lifecycle Flow - The Core Process**

```
1. Entity Created/Updated/Deleted
   ↓
2. Effects Registry processes the change
   ↓
3. Cascade Engine checks what should happen to linked entities
   ↓
4. Directional Workflow Engine checks if any workflows should trigger
   ↓
5. Role-based gating: Actions executed only if character has required role
   ↓
6. Actions are executed (create entities, update status, award points, etc.)
```

**This is the fundamental flow that every entity interaction follows in The Rosetta Stone system.**

### **File Structure and Relationships**

```
lib/
├── game-mechanics/              # 🎮 THE CORE - All game mechanics in one place
│   ├── entity-rules.ts          # 🧠 THE BRAIN - Core rules and definitions
│   ├── cascade-operations.ts    # ⚡ CASCADE ENGINE - What happens on delete/update
│   └── directional-workflow.ts  # 🚀 WORKFLOW ENGINE - What happens on complete/create
└── adapters/
    ├── link-local-adapter.ts    # 💾 LOCAL STORAGE - Development environment
    └── link-hybrid-adapter.ts   # ☁️ KV STORAGE - Production environment
```

### **Core Files Explained**

#### **1. `entity-rules.ts` - The Brain 🧠**
**Location**: `lib/game-mechanics/entity-rules.ts`

**Purpose**: Defines the fundamental rules of the game mechanics system.

**Key Components**:
- **`LinkRule`**: Defines what happens when entities are deleted/updated
- **`DirectionalRule`**: Defines what happens when entities complete/create
- **`ENTITY_RULES`**: The complete rule set for all entity relationships

**Example Rule**:
```typescript
{
  linkType: 'TASK_ITEM',
  onSourceDelete: 'cascade',    // Delete Task → Delete Item
  onTargetDelete: 'prompt',     // Delete Item → Ask about Task
  onSourceUpdate: 'propagate',  // Task Done → Update Item status
  onTargetUpdate: 'ignore'      // Item update → Don't affect Task
}
```

#### **2. `cascade-operations.ts` - The Cascade Engine ⚡**
**Location**: `lib/game-mechanics/cascade-operations.ts`

**Purpose**: Handles what happens when entities are deleted or updated.

**Key Functions**:
- `evaluateDeleteCascade()`: Checks what should happen when deleting an entity
- `evaluateUpdateCascade()`: Checks what should happen when updating an entity
- `shouldBlockOperation()`: Determines if an operation should be blocked
- `requiresConfirmation()`: Determines if user confirmation is needed

**Example Flow**:
1. User tries to delete a Task
2. System finds all links involving that Task
3. For each link, checks the `LinkRule` for `onSourceDelete`
4. Returns actions: `cascade`, `prompt`, `block`, or `ignore`

#### **3. `directional-workflow.ts` - The Workflow Engine 🚀**
**Location**: `lib/game-mechanics/directional-workflow.ts`

**Purpose**: Handles what happens when entities complete or are created (workflow automation).

**Key Functions**:
- `processWorkflowTrigger()`: Main function that processes workflow triggers
- `shouldTriggerRule()`: Checks if a directional rule should trigger
- `createWorkflowAction()`: Creates the appropriate action based on the rule

**Example Flow** (Feria Workflow):
1. Recurrent Task "Go to Feria" completes
2. System finds `TASK_SALE` directional rule
3. Rule triggers because `sourceStatus: 'Done'` and `metadata: { createsSale: true }`
4. System creates a new Sale entity with status 'PENDING'

### **The Rosetta Stone Effect**

#### **What It Achieves**

1. **Traceability**: Every entity action can be traced through its relationships
2. **Automation**: Workflows automatically trigger based on entity state changes
3. **Consistency**: Rules ensure consistent behavior across all entity interactions
4. **Coherence**: Isolated entities become part of a connected ecosystem

#### **Example: The Feria Workflow (Role-Gated)**

```
1. Recurrent Task "Go to Feria" completes
   ↓ (TASK_SALE directional rule)
2. Creates Sale entity (status: PENDING)
   ↓ (SALE_FINREC directional rule)
3. Creates Financial Record for the sale
   ↓ (TASK_CHARACTER, SALE_CHARACTER, FINREC_CHARACTER rules)
4. ROLE CHECK: Does character have PLAYER role?
   ├── YES → Awards Character points for all three entities
   └── NO → No points awarded (character might be CUSTOMER only)
```

#### **Example: The Artwork Workflow (Role-Gated)**

```
1. Task "Create Artwork" completes
   ↓ (TASK_ITEM directional rule)
2. Creates Item entity (type: ARTWORK, status: FOR_SALE)
   ↓ (ITEM_SALE link when sold)
3. Item gets sold in a Sale
   ↓ (SALE_FINREC directional rule)
4. Creates Financial Record for the sale
   ↓ (All entities check for CHARACTER links)
5. ROLE CHECK: For each linked character, does they have PLAYER role?
   ├── YES → Character gets points for the entire workflow
   └── NO → No points awarded (character might be CUSTOMER only)
```

#### **Example: Character Creation Workflow**

```
1. Sale completed with customer "John Doe"
   ↓ (Sales workflow)
2. Character created: { name: "John Doe", roles: ["CUSTOMER"] }
   ↓ (No PLAYER role assigned)
3. Character can appear in sales data but cannot earn points
   ↓ (Future: FOUNDER can promote CUSTOMER to PLAYER role)
```

---

## **IMPLEMENTATION ROADMAP**

### **Phase 1: Links System Foundation**
- [ ] Create Link entity and LinkType enums
- [ ] Implement LinkRegistry interface
- [ ] Add links field to all entities
- [ ] Create basic link storage (localStorage/KV)

### **Phase 2: Link Rules Engine**
- [ ] Implement LinkRule interface
- [ ] Create rule evaluation engine
- [ ] Add cascade/prompt/block behaviors
- [ ] Implement relationship graph queries

### **Phase 3: Workflow Integration**
- [ ] Update entity workflows to create links
- [ ] Replace direct creation with link creation
- [ ] Update Effects Registry to include link context
- [ ] Test idempotency with links

### **Phase 4: UI Integration**
- [ ] Add relationship visualization
- [ ] Implement cascade operation prompts
- [ ] Show link context in entity modals
- [ ] Add relationship debugging tools

### **Phase 5: Advanced Features**
- [ ] Relationship analytics
- [ ] Link-based queries and filters
- [ ] Performance optimization

---

## **KEY PRINCIPLES**

### **Separation of Concerns**
- **Modal**: UI only
- **Parent**: UI state + orchestration
- **DataStore**: Client gateway
- **Adapters**: Environment-specific implementation
- **APIs**: Server-side persistence + side effects

### **Consistency**
- All modals follow identical pattern
- All parents handle side effects the same way
- All APIs only handle persistence
- Side effects centralized in workflows

### **Idempotency**
- All operations are idempotent
- Side effects can be safely retried and updated
- No duplicate data or logs

### **Environment Parity**
- LocalAdapter mirrors production behavior
- Same side effects in both environments
- Same logging and idempotency

---

## **SUCCESS CRITERIA**

- [x] All modals are UI-only (no APIs, no side effects)
- [x] All parents handle side effects consistently
- [x] All APIs only handle persistence
- [x] LocalAdapter mirrors production behavior
- [x] Side effects work in both environments
- [x] Idempotency maintained across all operations
- [x] Comments and Documentation match implementation
- [x] Pattern is consistent across all entities

---

*This document serves as the comprehensive guide for patterns and mechanics in TheGame admin system.*
