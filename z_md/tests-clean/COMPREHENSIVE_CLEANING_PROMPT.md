# COMPREHENSIVE SYSTEM CLEANING PROMPT

## **CRITICAL CONTEXT**

You are working on **TheGame** - a gamified admin web-app for an Art & Design Studio. The user has been implementing **Phase 10.4** (hybrid data system with KV storage, while keeping the localStorage system for development) but is experiencing bugs in the KV after 2-3 days of work. The system needs **DEEP CLEANING** to remove legacy code and establish clean, consistent principles throughout.

## **SYSTEM ARCHITECTURE UNDERSTANDING**

### **Current State (Post Phase 10.4)**
- **Hybrid System**: Uses both `localStorage` (development) and KV storage (production)
- **Data Adapters**: New system uses adapters (`LocalAdapter`, `KVAdapter`, `HybridAdapter`)
- **API-First**: Modern components should use APIs directly, not legacy data store functions
- **Legacy Code**: `data-store-legacy.ts` contains old functions that need removal or refactoring to the new system
- **Logging System**: Unified logging with `/api/*-log` routes for tasks, items, financials, player

### **Data Flow Principles**
1. **New System**: Components → APIs → Adapters → Storage (KV/localStorage)
2. **Legacy System**: Components → DataStore → localStorage only
3. **Migration Goal**: All components should use new system, legacy functions removed

## **WORKFLOW COMMANDS**

### **INTERNALIZE Command**
**MUST BE USED FIRST** in every new chat:
1. Read `THEGAME_WIKI.md` (project vision, current state, workflow)
2. Read `PROJECT-STATUS.json` (current state)
3. Read project memories
4. Read relevant READMEs for current task
5. Understand current system state

### **CLEAN Command**
**Purpose**: Remove legacy code, enforce DRY principles, clean debugging code
**What it does**:
- Remove `console.log/error` statements
- Remove unused imports and dead code
- Extract components from large files
- Enforce `Z_INDEX_LAYERS` constant usage
- Remove duplicate logic
- Clean legacy functions and replace with new system

### **VERIFY Command**
**Purpose**: Actually investigate code before making claims
**What it does**:
- Read actual code files
- Compare systems side by side
- Test assumptions against real implementation
- Only make claims after verification

### **UPDATE Command**
**Purpose**: Refresh documentation with latest changes

### **ANALYSE Command**
**Purpose**: Analyze a specific component or section to identify cleaning opportunities
**What it does**:
- Examine file size and structure issues
- Identify duplicate code and components
- Find hardcoded values and mixed concerns
- Detect console debugging statements
- Assess legacy function usage
- Provide detailed cleaning recommendations

## **CLEANING WORKFLOW PRINCIPLES**

### **User's Core Philosophy**
- **"Genius is making simple the complex, not the opposite"**
- **"Don't overcomplicate stuff"**
- **"CLEAN doesn't mean redo from scratch, must respect functionalities"**
- **"Be extremely careful when migrating stuff to new components"**
- **"We don't want legacy and backwards compatibility"**

### **Cleaning Approach**
1. **Component-by-Component**: Focus on one section at a time
2. **Preserve Functionality**: Don't break working features
3. **Extract, Don't Rewrite**: Move code to new components, avoid recreating
4. **Remove Legacy**: Get rid of unneded old functions
5. **API-First**: Use modern API routes instead of legacy functions
6. **Console Cleanup**: Remove all debugging statements
7. **DRY Enforcement**: Consolidate duplicate logic

### **File Size & Structure Rules**
- **Large Files**: Split into smaller, focused components
- **Mixed Concerns**: Separate UI logic from business logic
- **Extraction**: Move functionality to dedicated component files
- **Constants**: Use centralized constants instead of hardcoded values

## **SPECIFIC CLEANING TARGETS**

### **Completed Sections** ✅
- **Finances**: Massive file cleaned, duplicate ConversionRatesModal removed, nested modals extracted
- **Data Center**: Dev Log Tab, Current Sprint, API integration
- **Research**: Notes, Diagrams, System Development tabs extracted
- **Settings**: Restructured into General/Admin/System tabs
- **Player**: Points calculation moved to new system

### **Remaining Legacy Code** 🎯
1. **`data-store-legacy.ts`**: Contains old functions that need removal
2. **Component Files**: May still reference legacy functions
3. **Console Statements**: Debugging code throughout system
4. **Unused Imports**: Dead imports and variables
5. **Duplicate Logic**: Repeated patterns across components

## **CRITICAL RULES**

### **File Deletion Rule**
**NEVER DELETE FILES** without explicit user permission. This is a strict rule to prevent data loss.

### **Breaking Changes Rule**
- **Foundational/Structural**: Ask and plan together
- **Basic/Feature**: Try approach first, then refine

### **Legacy Removal Strategy**
1. **Identify Usage**: Check where legacy functions are called
2. **Replace with APIs**: Use modern API routes instead
3. **Remove References**: Clean up imports and calls
4. **Remove Functions**: Delete unused legacy code
5. **Verify**: Ensure functionality still works

## **SYSTEM PRINCIPLES TO ENFORCE**

### **DRY (Don't Repeat Yourself)**
- Extract duplicate logic to utilities
- Use constants for repeated values
- Consolidate similar functions

### **Component Separation**
- UI components separate from business logic
- Single responsibility per component
- Clear interfaces between components

### **Modern Architecture**
- API-first data access
- Adapter pattern for storage
- Event-driven updates
- TypeScript type safety
- Idempotency for all business operations

### **Code Quality**
- No debugging console statements
- Proper error handling
- Consistent naming conventions
- Clean imports and exports

## **CURRENT BUGS & ISSUES**

### **Phase 10.4 Problems**
- Bugs in hybrid KV/localStorage system with idempotency
- Inconsistent data access patterns
- Legacy functions still in use
- Console debugging statements everywhere

### **Isolation Strategy**
- Clean component by component
- Remove legacy dependencies
- Establish consistent patterns
- Make bugs easier to isolate and fix

## **NEXT CLEANING TARGETS**

### **Priority Order**
1. **Data Store Legacy**: Remove unused legacy functions
2. **Component Analysis**: Find components using legacy functions
3. **API Migration**: Move components to use APIs directly
4. **Console Cleanup**: Remove all debugging statements
5. **Utility Extraction**: Create shared utilities for common patterns

### **Success Criteria**
- All components use new system (APIs + Adapters)
- No legacy function calls
- No console debugging statements
- Clean, focused component files
- Consistent error handling
- DRY principles enforced

## **USER PREFERENCES**

### **Communication Style**
- **Collaborative**: Build together, not separately
- **Direct**: Ask questions for big changes, try approaches for small changes
- **Respectful**: This is the user's project with established patterns
- **Thorough**: Actually investigate before making claims

### **Quality Standards**
- **Simple but Smart**: Complex logic made simple
- **Working First**: Don't break existing functionality
- **Clean Architecture**: Modern patterns throughout
- **Production Ready**: No debugging code in production

## **FINAL INSTRUCTIONS**

When the user says **"CLEAN"** or asks for component-by-component cleaning:

1. **INTERNALIZE** the system first
2. **Analyze** the target component/section
3. **Identify** legacy code and issues
4. **Plan** the cleaning approach
5. **Extract** components if needed
6. **Remove** legacy dependencies
7. **Verify** functionality still works
8. **Clean** console statements and unused code
9. **Report** what was cleaned and why

Remember: **The goal is to make the system as simple (but smart) as possible with clean principles applied throughout, so bugs can be isolated and solved easily.**
