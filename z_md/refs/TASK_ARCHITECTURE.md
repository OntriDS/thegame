# Task Architecture - Action Cards & Workflow Engine

## 🎯 Core Understanding: Task as Action Card

Tasks are the **action cards** of the system - they represent work to be done, missions to accomplish, and goals to achieve. They are the primary drivers of the workflow engine and create the foundation for all other entity relationships.

---

## 🏗️ Task Entity Architecture

### **Base Structure (Extends BaseEntity)**

```typescript
export interface Task extends BaseEntity {
  // Core Task Properties
  type: TaskType;                   // MISSION, MILESTONE, GOAL, TASK, RECURRENT
  status: TaskStatus;               // TODO, IN_PROGRESS, DONE, CANCELLED
  priority: TaskPriority;           // LOW, MEDIUM, HIGH, URGENT
  station: Station;                 // ADMIN, DESIGN, PRODUCTION, SALES, PERSONAL
  category: Category;               // Category within the station
  progress: number;                 // 0-100
  dueDate?: Date;
  frequencyConfig?: any;            // For complex frequency configuration
  order: number;                    // Sort order among siblings

  // Hierarchy System
  parentId?: string | null;         // Single parent field
  isRecurrentParent?: boolean;      // Is this a Recurrent Parent?
  isTemplate?: boolean;             // Is this a Recurrent Template?
  outputItemId?: string | null;     // if this task creates an Item

  // Site Relationships
  siteId?: string | null;           // Site where work is done
  targetSiteId?: string | null;     // Target site/client

  // Item Output Configuration
  outputItemType?: string;          // Type of item this task creates
  outputItemSubType?: SubItemType;  // SubType of item this task creates
  outputQuantity?: number;          // Quantity of items created
  outputUnitCost?: number;          // Unit cost of the item created
  outputItemName?: string;
  outputItemCollection?: Collection;
  outputItemPrice?: number;

  // Financial Impact (for THIS task only)
  cost: number;                     // negative cash impact
  revenue: number;                  // positive cash impact
  rewards: Rewards;                 // points and jungle coins

  // Lifecycle Timestamps
  doneAt?: Date;
  collectedAt?: Date;

  // Payment Flags
  isNotPaid?: boolean;
  isNotCharged?: boolean;
  isSold?: boolean;

  // Links System
  links: Link[];                    // Relationship tracking
}
```

---

## 📊 Task Types & Hierarchy

### **TaskType Enum**

```typescript
export enum TaskType {
  MISSION               = 'Mission',           // High-level objectives
  MILESTONE             = 'Milestone',         // Major checkpoints
  GOAL                  = 'Goal',              // Specific targets
  ASSIGNMENT            = 'Assignment',        // Work assignments
  RECURRENT_PARENT      = 'Recurrent Parent',  // Folder/container for recurrent tasks
  RECURRENT_TEMPLATE    = 'Recurrent Template', // Sets frequency pattern
  RECURRENT_INSTANCE    = 'Recurrent Instance', // Spawned with due date
  RECURRENT             = 'Recurrent'          // Recurring tasks
}
```

### **Hierarchy System**

```
Mission (High-level objective)
├── Milestone (Major checkpoint)
│   ├── Goal (Specific target)
│   │   ├── Assignment (Work assignment)
│   │   └── Task (Action card)
│   └── Recurrent Parent (Folder)
│       ├── Recurrent Template (Pattern)
│       └── Recurrent Instance (Spawned task)
```

**Key Relationships:**
- **Parent-Child**: Tasks can have one parent (Mission, Milestone, Goal, or Recurrent Parent)
- **Recurrent System**: Templates define patterns, Instances are spawned tasks
- **Order Field**: Controls sort order among siblings

---

## 🔄 Task Lifecycle & Workflows

### **Task Status Flow**

```
TODO → IN_PROGRESS → DONE
  ↓
CANCELLED (at any point)
```

### **Completion Workflow**

When a Task is marked as DONE, the system triggers:

1. **Item Creation** (if `outputItemType` is set)
   - Creates Item entity with specified type, quantity, and cost
   - Links Task to Item via `TASK_ITEM` link
   - Updates inventory across sites

2. **Financial Logging** (if `cost > 0` or `revenue > 0`)
   - Logs financial impact to Financials Log
   - Tracks cash flow and Jungle Coins

3. **Player Points** (if `rewards.points` is set)
   - Awards points to Character (only if role includes PLAYER)
   - Links Task to Character via `TASK_CHARACTER` link

4. **Logging & Audit**
   - Tasks Log: Records completion
   - Items Log: Records item creation
   - Player Log: Records points awarded
   - Financials Log: Records financial impact

---

## 🎮 Task Categories & Stations

### **Station System**

Tasks are organized by **Station** (main area) and **Category** (sub-area):

```typescript
// Stations
ADMIN, DESIGN, PRODUCTION, SALES, PERSONAL

// Categories (examples)
// ADMIN: Business, Legal, Finance
// DESIGN: Graphics, Web, Branding
// PRODUCTION: Manufacturing, Assembly, Quality
// SALES: Marketing, Customer Service, Feria
// PERSONAL: Health, Learning, Family
```

### **Priority System**

```typescript
export enum TaskPriority {
  LOW     = 'low',
  MEDIUM  = 'medium',
  HIGH    = 'high',
  URGENT  = 'urgent'
}
```

---

## 🔗 Task Relationships & Links

### **Link Types for Tasks**

- **`TASK_ITEM`**: Task created Item
- **`TASK_SALE`**: Task spawned from Sale
- **`TASK_CHARACTER`**: Task earned Character points
- **`TASK_FINREC`**: Task linked to Financial Record

### **Example Link Creation**

```typescript
// When task completes and creates an item
Link {
  linkType: 'TASK_ITEM',
  source: { type: 'task', id: taskId },
  target: { type: 'item', id: itemId },
  createdAt: new Date(),
  metadata: {
    quantity: task.outputQuantity,
    unitCost: task.outputUnitCost,
    itemType: task.outputItemType
  }
}

// When task awards points to character
Link {
  linkType: 'TASK_CHARACTER',
  source: { type: 'task', id: taskId },
  target: { type: 'player', id: characterId },
  createdAt: new Date(),
  metadata: {
    points: task.rewards.points,
    station: task.station,
    category: task.category
  }
}
```

---

## 🏭 Task Output System

### **Item Creation from Tasks**

Tasks can create Items when completed:

```typescript
// Task configuration for item creation
{
  outputItemType: 'ARTWORK',           // Type of item to create
  outputItemSubType: 'PAINTING',       // Subtype (if applicable)
  outputQuantity: 1,                   // How many items
  outputUnitCost: 50,                  // Cost per unit
  outputItemName: 'Custom Mural',      // Item name
  outputItemCollection: 'FERIA',       // Collection
  outputItemPrice: 150                 // Selling price
}
```

### **Financial Impact**

Tasks track their financial impact:

```typescript
{
  cost: 50,                    // What was spent (negative cash impact)
  revenue: 150,                // What was earned (positive cash impact)
  rewards: {
    points: { hp: 5, fp: 3, rp: 2, xp: 10 },
    currency: 'JUNGLE_COINS'
  }
}
```

---

## 🔄 Recurrent Task System

### **Recurrent Parent**
- Container for related recurring tasks
- Defines the group and frequency pattern

### **Recurrent Template**
- Sets the frequency configuration
- Defines what gets created when instances spawn

### **Recurrent Instance**
- Actual spawned task with due date
- Created from template based on frequency

### **Example: Feria Tasks**

```
Recurrent Parent: "Feria Tasks"
├── Recurrent Template: "Go to Feria" (weekly)
└── Recurrent Instances:
    ├── "Go to Feria - Week 1" (due: 2024-01-15)
    ├── "Go to Feria - Week 2" (due: 2024-01-22)
    └── "Go to Feria - Week 3" (due: 2024-01-29)
```

---

## 🎯 Task Modal & UI

### **Task Modal Features**

- **Hierarchy Selection**: Choose parent task
- **Station/Category**: Select work area
- **Item Output**: Configure item creation
- **Financial Impact**: Set cost, revenue, rewards
- **Recurrent Setup**: Configure recurring patterns
- **Due Dates**: Set deadlines and priorities

### **Task List Features**

- **Hierarchical View**: Tree structure with parents/children
- **Station Filtering**: Filter by work area
- **Status Tracking**: Visual progress indicators
- **Priority Sorting**: Urgent tasks first
- **Recurrent Management**: Template and instance management

---

## 🚀 Integration with Other Entities

### **Task → Item Flow**

1. Task created with `outputItemType`
2. Task completed (status: DONE)
3. Item automatically created
4. `TASK_ITEM` link established
5. Inventory updated across sites

### **Task → Sale Flow**

1. Sale created for service
2. Task automatically created from Sale
3. `SALE_TASK` link established
4. Task completion triggers Sale completion

### **Task → Character Flow**

1. Task completed with `rewards.points`
2. Character points updated (if role includes PLAYER)
3. `TASK_CHARACTER` link established
4. Player log updated

---

## 📊 Task Analytics & Reporting

### **Key Metrics**

- **Completion Rate**: Tasks done vs total
- **Station Performance**: Work by area
- **Financial Impact**: Cost vs revenue by task
- **Item Creation**: Items created from tasks
- **Point Distribution**: Points earned by character

### **Reports**

- **Task Progress**: Status across hierarchy
- **Station Breakdown**: Work distribution
- **Financial Summary**: Cost/revenue analysis
- **Recurrent Performance**: Recurring task completion

---

## 🔧 Technical Implementation

### **Workflow Integration**

```typescript
// Task completion triggers
export async function processTaskCompletionEffects(task: Task): Promise<Task> {
  // 1. Create item if configured
  if (task.outputItemType) {
    await createItemFromTask(task);
  }
  
  // 2. Log financial impact
  await logFinancialEffect(task);
  
  // 3. Award player points
  await logPlayerUpdateFromTask(task);
  
  // 4. Log task completion
  await logTaskCompletion(task);
  
  return task;
}
```

### **Data Persistence**

- **LocalAdapter**: localStorage + filesystem (development)
- **HybridAdapter**: KV storage + localStorage cache (production)
- **API Routes**: Server-side persistence and workflows

---

## ✅ Task Architecture Benefits

1. **Clear Hierarchy**: Mission → Milestone → Goal → Task
2. **Flexible Output**: Can create Items, trigger Sales, award Points
3. **Financial Tracking**: Built-in cost/revenue tracking
4. **Recurrent System**: Powerful recurring task management
5. **Link Integration**: Full relationship tracking
6. **Workflow Automation**: Automatic side effects on completion
7. **Audit Trail**: Complete logging and history

---

*This document serves as the comprehensive guide for Task entity architecture and workflows.*
