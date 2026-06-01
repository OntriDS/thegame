import { parseEntityTypeParameter } from '@/lib/mcp/parse-entity-type-param';
import { getLogEntryById, patchLogEntryById } from '@/workflows/entities-logging';
import { getSaleById, getTaskById, getItemById, getFinancialById } from '@/data-store/datastore';
import { getSaleLogDetails } from '@/lib/utils/sale-log-details';
import { calculateClosingDate } from '@/lib/utils/date-utils';
import { EntityType } from '@/types/enums';
import { getUTCNow, toUTC } from '@/lib/utils/utc-utils';

export async function execute(parameters: any) {
  const entityType = parseEntityTypeParameter(parameters.entityType);
  if (!entityType) throw new Error('entityType is required (sale | task | item | financial)');
  
  const logEntryId = String(parameters.logEntryId ?? '').trim();
  if (!logEntryId) throw new Error('logEntryId is required');
  
  const entityIdParam = parameters.entityId ? String(parameters.entityId).trim() : undefined;
  const newEvent = parameters.newEvent ? String(parameters.newEvent).trim() : undefined;

  const hit = await getLogEntryById(entityType, logEntryId);
  if (!hit) throw new Error(`Log entry not found: ${logEntryId}`);
  if (entityIdParam && hit.entry.entityId !== entityIdParam) throw new Error('entityId does not match this log entry');

  if (entityType === EntityType.SALE) {
    const sale = await getSaleById(hit.entry.entityId);
    if (!sale) throw new Error('Sale not found for log entry');
    const targetEvent = String(newEvent || hit.entry.event || '').toUpperCase();
    let timestampIso: string | undefined;
    if (targetEvent === 'CHARGED' || targetEvent === 'DONE') {
      const d = sale.doneAt || (sale as { chargedAt?: Date }).chargedAt;
      timestampIso = d ? toUTC(d).toISOString() : undefined;
    } else if (targetEvent === 'COLLECTED') {
      const raw = sale.collectedAt || calculateClosingDate(sale.saleDate ? toUTC(sale.saleDate) : getUTCNow());
      timestampIso = raw ? toUTC(raw).toISOString() : undefined;
    }
    const patchResult = await patchLogEntryById(EntityType.SALE, {
      logEntryId,
      entityId: entityIdParam,
      newEvent,
      saleLean: getSaleLogDetails(sale),
      timestampIso,
    });
    return { ...patchResult, entityId: sale.id, event: newEvent || hit.entry.event, entityType: 'sale' };
  }

  if (entityType === EntityType.TASK) {
    const task = await getTaskById(hit.entry.entityId);
    if (!task) throw new Error('Task not found for log entry');
    const targetEvent = String(newEvent || hit.entry.event || '').toUpperCase();
    let timestampIso: string | undefined;
    if (targetEvent === 'DONE' && task.doneAt) {
      timestampIso = toUTC(task.doneAt).toISOString();
    } else if (targetEvent === 'COLLECTED') {
      const raw = task.collectedAt || task.doneAt || getUTCNow();
      timestampIso = toUTC(raw).toISOString();
    }
    const patchResult = await patchLogEntryById(EntityType.TASK, {
      logEntryId,
      entityId: entityIdParam,
      newEvent,
      taskLean: { name: task.name, taskType: task.type, station: task.station },
      timestampIso,
    });
    return { ...patchResult, entityId: task.id, event: newEvent || hit.entry.event, entityType: 'task' };
  }

  if (entityType === EntityType.ITEM) {
    const item = await getItemById(hit.entry.entityId);
    if (!item) throw new Error('Item not found for log entry');
    const targetEvent = String(newEvent || hit.entry.event || '').toUpperCase();
    let timestampIso: string | undefined;
    if (targetEvent === 'SOLD') {
      const raw = item.soldAt || item.createdAt;
      timestampIso = raw ? toUTC(raw).toISOString() : undefined;
    } else if (targetEvent === 'COLLECTED') {
      const raw = item.soldAt || item.createdAt;
      timestampIso = raw ? toUTC(raw).toISOString() : undefined;
    }
    const patchResult = await patchLogEntryById(EntityType.ITEM, {
      logEntryId,
      entityId: entityIdParam,
      newEvent,
      itemLean: { name: item.name, itemType: item.type, subItemType: item.subItemType || '', soldQuantity: item.quantitySold || 0 },
      timestampIso,
    });
    return { ...patchResult, entityId: item.id, event: newEvent || hit.entry.event, entityType: 'item' };
  }

  if (entityType === EntityType.FINANCIAL) {
    const financial = await getFinancialById(hit.entry.entityId);
    if (!financial) throw new Error('Financial not found for log entry');
    const refMonth = toUTC(new Date(Date.UTC(financial.year, financial.month - 1, 1)));
    const targetEvent = String(newEvent || hit.entry.event || '').toUpperCase();
    let timestampIso: string | undefined;
    if (['DONE', 'PENDING', 'CREATED', 'UPDATED', 'CANCELLED'].includes(targetEvent)) {
      timestampIso = refMonth.toISOString();
    } else if (targetEvent === 'COLLECTED') {
      const raw = financial.collectedAt || refMonth;
      timestampIso = toUTC(raw).toISOString();
    }
    const patchResult = await patchLogEntryById(EntityType.FINANCIAL, {
      logEntryId,
      entityId: entityIdParam,
      newEvent,
      financialLean: { name: financial.name, type: financial.type, station: financial.station, cost: financial.cost, revenue: financial.revenue },
      timestampIso,
    });
    return { ...patchResult, entityId: financial.id, event: newEvent || hit.entry.event, entityType: 'financial' };
  }

  throw new Error(`patchEntry not supported for entityType: ${entityType}`);
}