import { EntityType } from '@/types/enums';

/** Normalize MCP/Analyst entityType strings: sale | task | item | financial | exact EntityType value. */
export function parseEntityTypeParameter(raw: unknown): EntityType | null {
  if (raw == null || String(raw).trim() === '') return null;
  const s = String(raw).trim().toLowerCase();
  const aliases: Record<string, EntityType> = {
    sale: EntityType.SALE,
    sales: EntityType.SALE,
    task: EntityType.TASK,
    tasks: EntityType.TASK,
    item: EntityType.ITEM,
    items: EntityType.ITEM,
    financial: EntityType.FINANCIAL,
    financials: EntityType.FINANCIAL,
  };
  if (aliases[s]) return aliases[s];
  if (Object.values(EntityType).includes(raw as EntityType)) return raw as EntityType;
  const match = (Object.values(EntityType) as string[]).find((v) => v.toLowerCase() === s);
  return (match as EntityType) ?? null;
}
