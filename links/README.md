# Links System - Canonical Patterns

## Link Creation Pattern

**ALWAYS use this pattern for creating links:**

```typescript
const link = makeLink(linkType, source, target, metadata);
await createLink(link);
await appendLinkLog(link, 'created');
```

## Entity Processing Flow

**Standard flow for all entities:**

```
DataStore.upsertX → onXUpsert → processLinkEntity(saved, EntityType.X)
```

## Responsibilities

- **`links/links-workflows.ts`**: Entity processors that create links based on entity properties
- **`workflows/entities-workflows/`**: Business logic only, no link creation
- **`workflows/*-utils.ts`**: Pure business logic, no link creation

## Validation

All links are validated via `validateLink()` before creation in `link-registry.ts`.

## Notes

- Links are created by `processLinkEntity()` - the universal entry point
- Business logic utils should be pure and not create links directly
- All link creation follows the makeLink + createLink + appendLinkLog pattern
