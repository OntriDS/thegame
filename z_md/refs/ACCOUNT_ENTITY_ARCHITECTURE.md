# Account Entity Architecture • Authentication & Identity Layer

> **Architecture Update**: This project now uses a KV-only architecture with Upstash Redis.
> localStorage cache and offline mode are planned for future implementation.
> All references to HybridAdapter/LocalAdapter reflect the old 2-adapter system (removed Oct 2024).

────────────────────────────────────────

## TABLE OF CONTENTS

1. Problem Statement & Analysis
2. The Account Entity Solution
3. Entity Relationship Model
4. Current vs Future State
5. Implementation Roadmap
6. Migration Strategy
7. Security & Privacy
8. Use Cases & Workflows

────────────────────────────────────────

## 1. PROBLEM STATEMENT & ANALYSIS

### Current Issues (V0.1)

**❌ Data Duplication:**
```typescript
// Player has personal data
Player {
  email: "akiles@example.com"
  passwordHash: "..."
  name: "Player One"
}

// Character ALSO has personal data
Character {
  name: "TheCreator"
  contactEmail: "akiles@example.com"  // DUPLICATE!
  contactPhone: "+506 1234-5678"
}

// Same person, two places → Data sync nightmare!
```

**❌ Security Risk:**
- Authentication data (`passwordHash`) mixed with game progression
- No clear security boundary
- Personal info visible where it shouldn't be

**❌ Architectural Confusion:**
- Is "name" the display name or real name?
- Player.email vs Character.contactEmail - which is "real"?
- Customer without account → must use Character.contactEmail
- Customer with account → data in two entities

**❌ Future Scalability Problems:**
- How does a Customer create an account?
- How do we handle privacy settings?
- How do we support role-based access?
- How do we keep personal info secure?

### Core Insight

**One Real Person = One Identity = One Account**

The mistake: We've been storing **identity & authentication** in **game entities** (Player/Character), when these should be **separate concerns**.

---

## 2. THE ACCOUNT ENTITY SOLUTION

### Philosophy: Separation of Concerns

```
ACCOUNT ENTITY      = Identity + Authentication (WHO the person is)
PLAYER ENTITY       = Game Progression (WHAT they've achieved)
CHARACTER ENTITY    = Business Role (HOW they interact with the business)
```

### Account Entity Definition

```typescript
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
 * - Single Source of Truth for personal data
 * - Security-first design (authentication isolated)
 * - Privacy controls built-in
 * - One Account per real person
 * - Links to Player (optional) and Character (required)
 * 
 * V0.1: Not implemented (technical debt documented)
 * V0.2: Full implementation with migration from Player/Character
 */
export interface Account extends BaseEntity {
  // IDENTITY (Single Source of Truth)
  // Note: 'name' inherited from BaseEntity → Real person's name
  email: string;              // Real person's email (unique)
  phone?: string;             // Real person's phone
  
  // AUTHENTICATION (Security Layer)
  passwordHash: string;       // Hashed password
  sessionToken?: string;      // Current active session
  lastLoginAt?: Date;         // Last successful login
  loginAttempts: number;      // Failed login counter (security)
  
  // ACCESS CONTROL
  isActive: boolean;          // Account enabled/disabled
  isVerified: boolean;        // Email verified
  verificationToken?: string; // Email verification token
  resetToken?: string;        // Password reset token
  resetTokenExpiry?: Date;    // Reset token expiration
  
  // PRIVACY SETTINGS
  privacySettings: {
    showEmail: boolean;       // Allow others to see email
    showPhone: boolean;       // Allow others to see phone
    showRealName: boolean;    // Use real name or nickname
  };
  
  // RELATIONSHIPS (Ambassador Fields)
  playerId?: string | null;   // Links to Player entity (optional - only if playing the game)
  characterId: string;        // Links to Character entity (required - everyone has a character)
  
  // METADATA
  createdAt: Date;            // Inherited from BaseEntity
  updatedAt: Date;            // Inherited from BaseEntity
  lastActiveAt: Date;         // Last activity (any action)
  
  // Links System (inherited from BaseEntity)
  links: Link[];              // ACCOUNT_PLAYER, ACCOUNT_CHARACTER links
}
```

---

## 3. ENTITY RELATIONSHIP MODEL

### The Three-Entity System

```
┌─────────────────────────────────────────────────────────────┐
│                      REAL PERSON                            │
│                           │                                 │
│                           ▼                                 │
│                    ┌─────────────┐                         │
│                    │   ACCOUNT   │ ◄── Identity Layer      │
│                    │             │     (Who they are)      │
│                    │  • name     │                         │
│                    │  • email    │                         │
│                    │  • phone    │                         │
│                    │  • password │                         │
│                    │  • privacy  │                         │
│                    └──────┬──────┘                         │
│                           │                                 │
│              ┌────────────┴────────────┐                   │
│              │                         │                   │
│              ▼                         ▼                   │
│     ┌────────────────┐        ┌───────────────┐           │
│     │    PLAYER      │        │  CHARACTER    │           │
│     │  (optional)    │        │  (required)   │           │
│     │                │        │               │           │
│     │ • points       │        │ • roles       │           │
│     │ • level        │        │ • nickname    │           │
│     │ • achievements │        │ • achievements│           |
│     │ • progression  │        │ • purchased   │           │
│     │                │        │ • commColor   │           │
│     └────────────────┘        └───────────────┘           │
│     Game Progression          Business Role               │
│     (What achieved)           (How they interact)         │
└─────────────────────────────────────────────────────────────┘
```

### Key Relationships

**The Triforce - Three Entities, One Identity:**

```
Account (Power)     → WHO the person is (name, email, phone, auth)
  ↕                    ↕
Player (Wisdom)     → WHAT they've achieved (stats: points, story, progression)  
  ↕                    ↕
Character (Courage) → HOW they interact (roles, business logic, achievements, relationships)
```

**One Person = One Account = One Character per Game Universe**

```typescript
// Customer (no login) - Business only
Character {
  accountId: null  // No account → can't login
  name: "Maria Rodriguez"
  roles: [CUSTOMER]
  contactEmail: null  // Privacy: don't store here
  contactPhone: null  // Privacy: don't store here
}

// Customer (with login) - Has Account
Account {
  name: "Maria Rodriguez"
  email: "maria@example.com"
  phone: "+506 1234-5678"
  characterId: "char-maria"
  playerId: null  // Not playing the game
}
Character {
  accountId: "acc-maria"
  name: "Maria R."  // Nickname (display name)
  roles: [CUSTOMER]
}

// Player (Founder) - Full access
Account {
  name: "Akiles"
  email: "akiles@example.com"
  characterId: "char-founder"
  playerId: "player-one"
}
Player {
  accountId: "acc-akiles"
  level: 12
  points: { hp: 250, fp: 180, rp: 420, xp: 1250 }
}
Character {
  accountId: "acc-akiles"
  name: "TheCreator"  // Nickname
  roles: [FOUNDER, PLAYER]
}
```

---

## 4. CURRENT VS FUTURE STATE

### Current State (V0.1) - Technical Debt

```typescript
// Player Entity (BEFORE)
interface Player extends BaseEntity {
  name: string;              // ❌ Should be in Account
  email: string;             // ❌ Should be in Account
  passwordHash: string;      // ❌ Should be in Account
  sessionToken?: string;     // ❌ Should be in Account
  
  // ✅ These are correct (progression)
  level: number;
  points: { hp, fp, rp, xp };
  totalPoints: { hp, fp, rp, xp };
  jungleCoins: number;
  achievementsP: string[];
  characterIds: string[];
  totalTasksCompleted: number;
  // ...
}

// Character Entity (BEFORE)
interface Character extends BaseEntity {
  name: string;              // ⚠️ Confusion: Display name or real name?
  contactEmail?: string;     // ❌ Duplicate of Player.email
  contactPhone?: string;     // ❌ Should be in Account
  
  // ✅ These are correct (business role)
  roles: CharacterRole[];
  commColor?: CommColor;
  jungleCoins: number;
  purchasedAmount: number;
  inventory: string[];
  playerId: string;
  // ...
}
```

### Future State (V0.2) - Clean Architecture

```typescript
// Account Entity (NEW)
interface Account extends BaseEntity {
  name: string;              // ✅ Real name (Single Source of Truth)
  email: string;             // ✅ Real email (Unique identifier)
  phone?: string;            // ✅ Real phone
  passwordHash: string;      // ✅ Authentication (Secure)
  sessionToken?: string;     // ✅ Session management
  privacySettings: {...};    // ✅ Privacy controls
  playerId?: string | null;  // ✅ Optional link
  characterId: string;       // ✅ Required link
}

// Player Entity (AFTER)
interface Player extends BaseEntity {
  accountId: string;         // ✅ AMBASSADOR from Account
  
  // ✅ Pure progression data
  level: number;
  points: { hp, fp, rp, xp };
  totalPoints: { hp, fp, rp, xp };
  jungleCoins: number;
  achievementsP: string[];
  characterIds: string[];
  totalTasksCompleted: number;
  // ...
  
  // REMOVED: name, email, passwordHash, sessionToken
}

// Character Entity (AFTER)
interface Character extends BaseEntity {
  accountId?: string | null; // ✅ AMBASSADOR from Account (optional!)
  name: string;              // ✅ NICKNAME/Display name (can differ from Account.name)
  
  // ✅ Pure business role data
  roles: CharacterRole[];
  commColor?: CommColor;
  jungleCoins: number;
  purchasedAmount: number;
  inventory: string[];
  playerId?: string | null;
  // ...
  
  // REMOVED: contactEmail, contactPhone (now in Account)
}
```

---

## 5. IMPLEMENTATION ROADMAP

### Phase 1: Type Definitions & Constants ✅ COMPLETED

**Goal**: Define Account entity architecture at type level

**Tasks**:
- [x] ✅ Analyze current Player/Character entity structure
- [x] ✅ Design Account entity interface
- [x] ✅ Create Account interface in `types/entities.ts`
- [x] ✅ Add accountId field to Player entity (ambassador)
- [x] ✅ Add accountId field to Character entity (ambassador)
- [x] ✅ Update LinkType enum to include ACCOUNT_PLAYER, ACCOUNT_CHARACTER, PLAYER_ACCOUNT, CHARACTER_ACCOUNT
- [x] ✅ Update EntityType enum to include 'account'
- [x] ✅ Add PLAYER_ONE_ACCOUNT_ID to entity-constants.ts
- [x] ✅ Update achievementsP → achievementsPlayer
- [x] ✅ Update achievementsC → achievementsCharacter
- [x] ✅ Remove commColor from Player (Character-only)

**Deliverables**: ✅ COMPLETE

---

### Phase 2: Storage & Workflows ✅ COMPLETED

**Goal**: Implement Account entity storage and workflows

**Tasks**:
- [x] ✅ Create Account storage in KV-only system (localStorage cache and offline mode planned for future)
- [x] ✅ Add Account methods to DataStore
  - [x] ✅ `getAccounts(): Promise<Account[]>`
  - [x] ✅ `getAccount(id: string): Promise<Account | null>`
  - [x] ✅ `upsertAccount(account: Account, options): Promise<Account>`
  - [x] ✅ `deleteAccount(id: string): Promise<void>`
- [x] ✅ Create `processAccountEffects()` in entity-workflows.ts
- [x] ✅ Implement Account creation from Character (when contactEmail/contactPhone present)
- [x] ✅ Implement Account update from Character (when contact info changes)
- [x] ✅ Create The Triforce in player-one-init.ts (Account + Player + Character linked from start)
- [x] ✅ Create ACCOUNT_PLAYER, ACCOUNT_CHARACTER, PLAYER_ACCOUNT, CHARACTER_ACCOUNT links

**Deliverables**: ✅ COMPLETE
- Account entity fully operational in V0.1
- The Triforce (Account + Player + Character) created on system initialization
- Character Modal creates Account when email/phone entered
- Player Modal displays Account data (read-only) and has Edit Account submodal

---

### Phase 3: UI Integration & Data Flow ✅ COMPLETED

**Goal**: Integrate Account entity into UI components

**Tasks**:
- [x] ✅ Player Modal: Add Account Edit submodal (edit name, email, phone)
- [x] ✅ Player Modal: Update Personal Data submodal (read-only, loads from Account)
- [x] ✅ Character Modal: Load personal data from Account (for PLAYER role characters)
- [x] ✅ Character Modal: Make name/email/phone read-only for PLAYER role
- [x] ✅ Character Modal: Add Account Info submodal (for FOUNDER/ADMIN roles)
- [x] ✅ Links Tab: Show "Account created" with metadata (name, email, phone)
- [x] ✅ Data flow: Account → Character (contact info) → Player (display only)

**Deliverables**: ✅ COMPLETE
- Personal data flows through Account entity for PLAYER role characters
- No cross-data corruption (PLAYER characters can't edit personal data in Character Modal)
- Account Edit accessible from Player Modal
- Clean separation: Account (edit) vs Personal Data (view)

### Phase 4: Future Enhancements - NOT STARTED

**Goal**: Migrate existing Player/Character data to Account entity

**Tasks**:
- [ ] Create migration utility: `lib/utils/account-migration.ts`
- [ ] Implement Player → Account data migration
  ```typescript
  async function migratePlayerToAccount(player: Player): Promise<Account> {
    return {
      id: `acc-${player.id}`,
      name: player.name,
      email: player.email,
      passwordHash: player.passwordHash,
      sessionToken: player.sessionToken,
      playerId: player.id,
      characterId: player.characterIds[0], // First character
      privacySettings: {
        showEmail: false,
        showPhone: false,
        showRealName: true
      },
      isActive: player.isActive,
      isVerified: true,
      // ...
    };
  }
  ```
- [ ] Run migration for Player One
- [ ] Update Player entity to reference Account
- [ ] Remove personal fields from Player entity
- [ ] Update Character entity to reference Account
- [ ] Remove contactEmail/contactPhone from Character entity
- [ ] Update all modals to use Account data
- [ ] Update authentication to use Account entity

**Deliverables**:
- Player One migrated to Account
- Personal Data modal reads from Account
- Authentication uses Account
- Clean Player/Character entities

---

### Phase 4: Customer Account Creation - FUTURE (Multi-User)

**Goal**: Enable customers to create their own accounts

**Tasks**:
- [ ] Create account registration flow
- [ ] Create login/logout flow using Account
- [ ] Create "Create Account" button in Sales modal
- [ ] Link existing Characters to new Accounts
- [ ] Implement email verification
- [ ] Implement password reset
- [ ] Add privacy settings UI

**Deliverables**:
- Customers can create accounts
- Customers can login
- Email verification working
- Password reset working

---

### Phase 5: Role-Based Access Control - FUTURE (Security)

**Goal**: Implement role-based access control using Account + Character roles

**Tasks**:
- [ ] Create access control middleware
- [ ] Implement role-based permissions
  ```typescript
  // Example: Only FOUNDER can access certain admin pages
  if (character.roles.includes(CharacterRole.FOUNDER)) {
    // Full access
  } else if (character.roles.includes(CharacterRole.PLAYER)) {
    // Game access
  } else if (character.roles.includes(CharacterRole.CUSTOMER)) {
    // Limited access (view orders, profile)
  }
  ```
- [ ] Protect API routes with role checks
- [ ] Update UI to show/hide based on roles
- [ ] Implement privacy controls

**Deliverables**:
- Role-based access working
- Customers see customer portal
- Players see game interface
- Founders see full admin

---

## 6. MIGRATION STRATEGY

### Data Migration Path

```typescript
// Step 1: Create Account from Player One
const playerOne = await DataStore.getPlayers()[0];
const accountOne = {
  id: 'acc-player-one',
  name: playerOne.name,
  email: playerOne.email,
  phone: '', // Will be added later
  passwordHash: playerOne.passwordHash,
  sessionToken: playerOne.sessionToken,
  playerId: playerOne.id,
  characterId: playerOne.characterIds[0],
  privacySettings: {
    showEmail: false,
    showPhone: false,
    showRealName: true
  },
  isActive: true,
  isVerified: true,
  loginAttempts: 0,
  lastLoginAt: new Date(),
  lastActiveAt: playerOne.lastActiveAt,
  createdAt: playerOne.createdAt,
  updatedAt: new Date(),
  links: []
};
await DataStore.upsertAccount(accountOne);

// Step 2: Update Player to reference Account
const updatedPlayer = {
  ...playerOne,
  accountId: accountOne.id
  // Remove: name, email, passwordHash, sessionToken
};
await DataStore.upsertPlayer(updatedPlayer);

// Step 3: Update Character to reference Account
const character = await DataStore.getCharacter(accountOne.characterId);
const updatedCharacter = {
  ...character,
  accountId: accountOne.id,
  name: character.name || 'TheCreator' // Keep as nickname
  // Remove: contactEmail, contactPhone
};
await DataStore.upsertCharacter(updatedCharacter);
```

### Backward Compatibility

During migration, support both old and new patterns:

```typescript
// Helper function: Get personal data (V0.1 or V0.2)
async function getPersonalData(player: Player): Promise<PersonalData> {
  if (player.accountId) {
    // V0.2: Use Account
    const account = await DataStore.getAccount(player.accountId);
    return {
      name: account.name,
      email: account.email,
      phone: account.phone
    };
  } else {
    // V0.1: Use Player directly
    return {
      name: player.name,
      email: player.email,
      phone: '' // Not available in V0.1
    };
  }
}
```

---

## 7. SECURITY & PRIVACY

### Security Design

**Principle**: Authentication data completely isolated from business logic

```typescript
// ✅ GOOD: Account entity handles ALL auth
Account {
  passwordHash: string;      // Secure hash (bcrypt)
  sessionToken: string;       // JWT token
  loginAttempts: number;      // Brute force protection
  isActive: boolean;          // Account lockout
}

// ❌ BAD: Auth mixed with game data (V0.1)
Player {
  passwordHash: string;       // ❌ Mixed with progression!
  level: number;
  points: {...};
}
```

### Privacy Controls

Users control what others can see:

```typescript
interface PrivacySettings {
  showEmail: boolean;         // Default: false
  showPhone: boolean;         // Default: false
  showRealName: boolean;      // Default: true (or use nickname)
}

// Usage
function displayContact(account: Account, viewer: Account) {
  if (account.privacySettings.showEmail || viewer.id === account.id) {
    return account.email;
  }
  return 'Email hidden';
}
```

### Access Control Rules

| Role | Can Login | Can Edit Account | Can View Others | Can Delete Account |
|------|-----------|------------------|-----------------|-------------------|
| CUSTOMER | ✅ | ✅ Own only | ❌ | ✅ Own only |
| PLAYER | ✅ | ✅ Own only | ⚠️ Limited | ✅ Own only |
| TEAM | ✅ | ✅ Own only | ✅ Team only | ❌ |
| FOUNDER | ✅ | ✅ All | ✅ All | ✅ All |

---

## 8. USE CASES & WORKFLOWS

### Use Case 1: Customer (No Account)

**Scenario**: Customer buys at feria, provides email for receipt

```typescript
// 1. Sale captured with contact info
const sale = {
  counterpartyName: "Maria Rodriguez",
  // contactEmail stored temporarily in sale, NOT in Character
};

// 2. Character created (no account)
const customer = {
  name: "Maria R.",
  roles: [CharacterRole.CUSTOMER],
  accountId: null,  // No account = can't login
  purchasedAmount: 150
};
```

### Use Case 2: Customer Creates Account

**Scenario**: Customer wants to track orders online

```typescript
// 1. Customer requests account
// UI: "Create Account" button in customer portal

// 2. Account created
const account = {
  name: "Maria Rodriguez",
  email: "maria@example.com",
  phone: "+506 1234-5678",
  passwordHash: hash("password123"),
  characterId: existingCharacter.id,
  playerId: null,  // Not a player
  privacySettings: {
    showEmail: false,
    showPhone: false,
    showRealName: false  // Use nickname instead
  }
};

// 3. Character linked to Account
const updatedCharacter = {
  ...existingCharacter,
  accountId: account.id
};

// 4. Customer can now login and see:
// - Order history
// - Purchase total
// - Profile settings
```

### Use Case 3: Team Member Invitation

**Scenario**: Founder invites designer to join team

```typescript
// 1. Founder sends invitation
const invitation = {
  email: "designer@example.com",
  roles: [CharacterRole.DESIGNER, CharacterRole.TEAM]
};

// 2. Designer creates account
const account = {
  name: "Designer Name",
  email: "designer@example.com",
  passwordHash: hash("newpassword"),
  characterId: newCharacter.id,
  playerId: null  // Designer, not player
};

// 3. Character created with TEAM role
const character = {
  accountId: account.id,
  name: "Designer",
  roles: [CharacterRole.DESIGNER, CharacterRole.TEAM],
  commColor: CommColor.BLUE  // Set during onboarding
};

// 4. Designer can now:
// - Login to admin (limited access)
// - View assigned tasks
// - Update project status
// - Cannot delete data or manage finances
```

### Use Case 4: Player One (Current State)

**Scenario**: Founder using the system (V0.1 → V0.2 transition)

```typescript
// V0.1 (Current)
const playerOne = {
  name: "Akiles",
  email: "akiles@example.com",
  passwordHash: "...",
  level: 12,
  points: {...}
};

// V0.2 (Future)
const account = {
  name: "Akiles",
  email: "akiles@example.com",
  passwordHash: "...",
  characterId: "char-founder",
  playerId: "player-one"
};
const player = {
  accountId: "acc-akiles",
  level: 12,
  points: {...}
};
const character = {
  accountId: "acc-akiles",
  name: "TheCreator",  // Nickname
  roles: [FOUNDER, PLAYER]
};
```

---

## 9. KEY DECISIONS & RATIONALE

### Decision 1: Why Not Store Personal Data in Character?

**❌ Problem**: Character is a business entity, visible to others
**✅ Solution**: Account is private, controlled by owner

Example:
- Character.name = "TheCreator" (public display name)
- Account.name = "Akiles" (private real name)
- Customer sees "TheCreator", not real identity

### Decision 2: Why Not Store Auth Data in Player?

**❌ Problem**: Player is optional (not everyone plays the game)
**✅ Solution**: Account is required (everyone needs identity)

Example:
- Customer with account but no Player entity
- Customer can still login, view orders
- If they want to play game, Player created later

### Decision 3: One Character Per Person

**✅ Correct Understanding**: In real life, one person = one character
**❌ Multiplayer ≠ Multiple characters per person**
**✅ Multiplayer = Multiple people in same game universe**

Example:
- Founder A has their game universe with characters
- Founder B has their game universe with characters
- Future: Both universes can interconnect (super futuristic)
- But each person still has ONE character per game

---

## 10. STATUS & CURRENT STATE

**Current Phase**: V0.1 (Account Entity FULLY IMPLEMENTED)

**What's Working**:
- ✅ Account entity interface defined and storage operational
- ✅ The Triforce: Account + Player + Character linked from system start
- ✅ Account creation from Character when contact info provided
- ✅ Personal data flows: Account → Character → Player (read-only)
- ✅ Player Modal: Edit Account submodal + View Personal Data submodal
- ✅ Character Modal: Personal data read-only for PLAYER role
- ✅ Links System: ACCOUNT_PLAYER, ACCOUNT_CHARACTER bidirectional links
- ✅ Player One initialization creates all three entities with proper linking

**Important Notes**:
- Account entity exists but NOT connected to real login system yet (that's future work)
- Current authentication still uses Player.email/passwordHash (temporary, parallel system)
- "Player One" is the bootstrap identity (PLAYER_ONE_ACCOUNT_ID, PLAYER_ONE_ID, CHARACTER_ONE_ID)
- "Founder" is just a role that multiple people can have
- One character per person per game universe (no multi-character accounts)

**Future Work** (when needed):
- Connect Account entity to actual login/authentication system
- Migrate current auth to use Account instead of Player
- Customer account creation flow
- Email verification and password reset

────────────────────────────────────────

*This document serves as the architectural blueprint for the Account entity implementation. Update it as design evolves.*

