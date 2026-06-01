import { parseEntityTypeParameter } from '@/lib/mcp/parse-entity-type-param';
import { ensureCollectedLog } from '@/workflows/ensure-entity-logs';
import { EntityType } from '@/types/enums';

export async function execute(parameters: any) {
  const entityType = parseEntityTypeParameter(parameters.entityType);
  const entityId = String(parameters.entityId ?? '').trim();
  if (!entityType || !entityId) throw new Error('entityType and entityId are required');

  const data = await ensureCollectedLog(entityType, entityId);
  if (!data.success) throw new Error(data.error);

  const entityTypeLabel = entityType === EntityType.SALE ? 'sale' : 'task';

  if (data.noop) {
    return {
      entityType: entityTypeLabel,
      message: `Idempotent Success: The ${entityTypeLabel} collected log is already present and correct. No changes were needed.`
    };
  }

  return { ...data, entityType: entityTypeLabel };
}