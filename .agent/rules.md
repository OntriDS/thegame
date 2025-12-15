---
alwaysApply: true
---
# CURSOR AI RULES - THEGAME

**CRITICAL BUILD WARNING:** NEVER run `npm run build` from wrong directory. Always verify current directory first with `Get-Location` and navigate to project root: `cd "C:\Users\Usuario\AKILES\PIXELBRAIN\thegame"` before running any npm commands. Running from wrong directory causes Cursor chat serialization error that breaks the entire chat session.

## WORKFLOW RULES

- **Foundational/Structural Changes**: Ask and plan together (enums, entities, architecture, data structures, complex components)
- **Basic/Feature Changes**: Try your approach, user tests, refine together (give pages, simple components, UI improvements)
- **CRITICAL: NEVER DELETE FILES.** Do not delete any file without asking for and receiving explicit permission first.
- **Dont update PROJECT-STATUS.json** unless the user explicitly asks for it
- This is the user's project with established patterns - not a generic coding exercise
- Respect collaborative workflow: ask questions for big changes, try approaches for small changes
- Never delete files without explicit permission
- Always verify current directory before running npm commands

---

## AGENTIC WORKFLOW

- **Task Tracking**: Always maintain `task.md` to track progress.
- **Artifacts**: Use artifacts for plans (`implementation_plan.md`) and summaries (`walkthrough.md`).
- **Communication**: Use `notify_user` for critical decisions or reviews.
- **Proactive**: Fix obvious issues, but ask for architectural changes.

---

## EMOJI SHORTCUTS

- `:go:` → 🚀 (Launch/Start/Execute)

## WORKFLOW ACTIVATION

These workflows are available in `.agent/workflows/`. Use `view_file` to read them if needed, or `run_command` if they contain executable steps.

Workflows are defined in separate files within `.agent/workflows/` directory:
- NOSKIM - Force complete document reading
- HONEST - Force complete honesty and prevent assumptions
- INTERNALIZE - Read core project files only
- VERIFY - Thoroughly investigate systems before claims
- ANALYSE - Investigate system architecture and report issues
- CLEAN - Automatically clean old code and enforce DRY principles
- UPDATE - Refresh Wiki, README, and documentation
- DEBUG - Create systematic testing tools for complex bugs
- RESEARCH - Systematically research external knowledge needs
- COMPARE - Compare multiple items with structured matrix


---

 **Z_INDEX_LAYERS** The user prefers that all UI components use the constant for z-index `\lib\utils\z-index-utils.ts`