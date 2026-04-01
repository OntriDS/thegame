# Links System - Canonical Patterns

## Link creation

Use the link registry only (Rosetta Stone). Do **not** write duplicate rows to any separate “link log” lists.

```typescript
const link = makeLink(linkType, source, target);
await createLink(link);
```

## Entity processing flow

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

- Links are created by `processLinkEntity()` — the universal entry point
- Business logic utils should be pure and not create links directly
- Historical monthly KV lists under `thegame:logs:links:*` are obsolete; if any remain in Redis, delete them during DB cleanup (they are not read by the app anymore)
