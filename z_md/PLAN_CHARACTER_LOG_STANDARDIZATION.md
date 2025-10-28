# CHARACTER LOG STANDARDIZATION PLAN

**Date**: January 2025  
**Status**: ✅ Implemented

## Problem Statement

1. **Character log showing wrong names**: Character log entries were showing task/item/sale names instead of the character's actual name due to `displayName` being overwritten by latest entry in character logs (all entries share same entityId).

2. **Duplicate TASK_CHARACTER links**: Both `playerCharacterId` and `customerCharacterId` were creating TASK_CHARACTER links, causing unnecessary "Akiles" duplicates in the links log.

3. **Character log missing information**: Character log only showed name and roles, missing native fields and event-specific details that other entity logs display.

## Solution

### Architecture Decision

**Performer selection = Player (via TASK_PLAYER link and points)**  
**Customer relationship = Character (via TASK_CHARACTER link)**

- When you select a "player" in the task modal, you're selecting a **Player entity** (not a Character)
- Points are awarded to the Player (via `TASK_PLAYER` link created by points workflow)
- Only customer relationships create `TASK_CHARACTER` links
- Character log is for customer actions (REQUESTED_TASK, OWNS_ITEM, PURCHASED)

### Key Principle

**Role is the primary Character field** - it defines WHO they are and WHAT they can do.

## Changes Made

### 1. Links Workflow (`links/links-workflows.ts`)

✅ **Removed** TASK_CHARACTER link creation for `playerCharacterId`
- `playerCharacterId` is internal assignment only
- Performer relationship handled via TASK_PLAYER link from points workflow

✅ **Kept** TASK_CHARACTER link for `customerCharacterId` only
- This represents customer relationship (REQUESTED_TASK action)
- Includes character name in logging

### 2. Character Log Display (`components/data-center/character-log-tab.tsx`)

✅ **Fixed name display**: Prioritize `data.name` over `entry.displayName`
- Fixes task/item/sale names showing instead of character name
- Character logs have all entries with same entityId (character's ID)

✅ **Enhanced field display**:
- **Roles**: ALWAYS shown prominently (primary identifier)
- **Native fields**: Show only when present (commColor, description, email, phone, isActive)
- **Event-specific details**:
  - REQUESTED_TASK: taskName, taskType, station
  - OWNS_ITEM: itemName, itemType, sourceTaskName
  - PURCHASED: saleName, saleType, totalRevenue

## Migration Path (Future v0.2)

### Current State (v0.1)
- Only Character One exists (Akiles)
- Player One is the only player
- Task modal has `playerCharacterId` but it doesn't create character links
- Points are awarded to Player One via existing workflow

### Future State (v0.2)
- Create `PlayerPickerSubmodal` that shows all players
- Return `playerId` instead of `characterId`
- Update points workflow to accept explicit `playerId` parameter
- Player selection determines WHO gets points
- Customer selection (still character) determines WHO requested/owns items

### Implementation Guidance

```typescript
// In TaskModal:
const [selectedPlayerId, setSelectedPlayerId] = useState(PLAYER_ONE_ID);

// Create PlayerPicker submodal that lists all players
// Returns: { playerId: string }
// Modal just captures which player should get points

// Points workflow already uses getMainPlayerId()
// Just need to pass selectedPlayerId to it
```

## Testing

1. Create task with customer character selected
2. Complete task
3. Verify:
   - ✅ No TASK_CHARACTER link for player-character
   - ✅ TASK_PLAYER link exists (from points workflow)
   - ✅ TASK_CHARACTER link exists only for customer
   - ✅ Character log shows correct character name (not task name)
   - ✅ Character log shows roles prominently
   - ✅ Character log shows optional native fields when present
   - ✅ Character log shows event-specific details

## Documentation Update

**Character Entity Priority**:
1. **Role** (PRIMARY) - defines WHO they are and capabilities
2. Name - display identifier
3. CommColor - communication style (ESSENTIAL for interaction)
4. Contact info - optional metadata
5. isActive - lifecycle status

**Link Rules**:
- TASK_CHARACTER = customer relationship only
- TASK_PLAYER = performer/points relationship
- No cross-pollination between these two relationship types

