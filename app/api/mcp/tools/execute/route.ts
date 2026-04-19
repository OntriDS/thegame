import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { verifyPixelbrainRouteAccess } from '@/lib/auth/pixelbrain-route-auth';
import {
  getAllSales,
  getSalesForMonth,
  getAllTasks,
  getAllPlayers,
  getAllFinancials,
  getAllItems,
  getAllSites,
  getAllCharacters,
  repairPrimaryTaskIndex,
  repairTaskActiveIndex,
  repairTaskCompletedIndex,
  getGlobalTaskCounts,
} from '@/data-store/datastore';
import {
  auditArchiveCompleteness,
  auditLinkConsistency,
  auditMonthIndexAccuracy,
  auditStatusConsistency,
} from '@/lib/integrity/integrity-audits';
import {
  auditActiveTasksMissingFromActiveIndex,
  auditCompletedTasksMissingFromCompletedIndex,
  auditTaskTimelineVsMonthIndex,
} from '@/lib/integrity/task-timeline-audit';
import { SummaryService } from '@/data-store/services/summary.service';
import { EntityType } from '@/types/enums';
import { getUTCNow, toUTC, endOfDayUTC, startOfMonthUTC, endOfMonthUTC } from '@/lib/utils/utc-utils';

const DEFAULT_LIST_LIMIT = 50;
const MAX_LIST_LIMIT = 200;

function clampLimit(raw: unknown): number {
  const n = Number(raw);
  if (!Number.isFinite(n) || n < 1) return DEFAULT_LIST_LIMIT;
  return Math.min(Math.floor(n), MAX_LIST_LIMIT);
}

function clampOffset(raw: unknown): number {
  const n = Number(raw);
  if (!Number.isFinite(n) || n < 0) return 0;
  return Math.floor(n);
}

function parseMonthYear(params: Record<string, unknown>): { month: number; year: number } | null {
  const month = Number(params.month);
  const year = Number(params.year);
  if (!Number.isFinite(month) || !Number.isFinite(year)) return null;
  if (month < 1 || month > 12) return null;
  if (year < 2000 || year > 2100) return null;
  return { month, year };
}

function isMonthScopedUTCRange(startRaw: string, endRaw: string): { year: number; month: number } | null {
  try {
    const start = toUTC(startRaw);
    const end = endOfDayUTC(toUTC(endRaw));

    const monthStart = startOfMonthUTC(start);
    const monthEnd = endOfMonthUTC(start);

    if (start.getTime() !== monthStart.getTime()) return null;
    if (end.getTime() !== monthEnd.getTime()) return null;
    if (
      start.getUTCFullYear() !== end.getUTCFullYear() ||
      start.getUTCMonth() !== end.getUTCMonth()
    ) {
      return null;
    }

    return {
      year: start.getUTCFullYear(),
      month: start.getUTCMonth() + 1,
    };
  } catch {
    return null;
  }
}

export async function POST(req: NextRequest) {
  const auth = await verifyPixelbrainRouteAccess(req);
  if (!auth.ok) {
    return NextResponse.json({ error: auth.message }, { status: auth.status });
  }

  let body: { toolId?: string; parameters?: Record<string, unknown> };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ success: false, error: 'Invalid JSON' }, { status: 400 });
  }

  const toolId = body.toolId;
  const parameters = body.parameters ?? {};

  if (!toolId || typeof toolId !== 'string') {
    return NextResponse.json({ success: false, error: 'toolId is required' }, { status: 400 });
  }

  try {
    switch (toolId) {
      case 'get_tasks': {
        const limit = clampLimit(parameters.limit);
        const offset = clampOffset(parameters.offset);
        const filter = parameters.filter as { status?: string } | undefined;
        let tasks = await getAllTasks();
        if (filter?.status) {
          tasks = tasks.filter((t) => String(t.status) === filter.status);
        }
        const slice = tasks.slice(offset, offset + limit);
        const hasMore = offset + limit < tasks.length;
        return NextResponse.json({
          success: true,
          data: {
            tasks: slice,
            count: slice.length,
            total: tasks.length,
            offset,
            limit,
            hasMore,
          },
        });
      }
      case 'get_sales': {
        const limit = clampLimit(parameters.limit);
        const offset = clampOffset(parameters.offset);
        const dateRange = parameters.dateRange as { start?: string; end?: string } | undefined;
        let sales = await getAllSales();
        if (dateRange) {
          const hasStart = typeof dateRange.start === 'string' && dateRange.start.length > 0;
          const hasEnd = typeof dateRange.end === 'string' && dateRange.end.length > 0;
          if (hasStart !== hasEnd) {
            return NextResponse.json(
              { success: false, error: 'dateRange requires both `start` and `end` when provided.' },
              { status: 400 }
            );
          }
          if (hasStart && hasEnd) {
            try {
              const monthly = isMonthScopedUTCRange(dateRange.start as string, dateRange.end as string);
              if (monthly) {
                sales = await getSalesForMonth(monthly.year, monthly.month);
              } else {
                const start = toUTC(dateRange.start as string).getTime();
                const end = endOfDayUTC(toUTC(dateRange.end as string)).getTime();
                if (start > end) {
                  return NextResponse.json(
                    { success: false, error: '`dateRange.start` must be <= `dateRange.end`.' },
                    { status: 400 }
                  );
                }
                sales = sales.filter((s) => {
                  try {
                    const timestamp = toUTC(s.saleDate).getTime();
                    return timestamp >= start && timestamp <= end;
                  } catch {
                    return false;
                  }
                });
              }
            } catch {
              return NextResponse.json(
                { success: false, error: 'dateRange values must be parseable UTC date strings.' },
                { status: 400 }
              );
            }
          }
        }
        const slice = sales.slice(offset, offset + limit);
        const hasMore = offset + limit < sales.length;
        return NextResponse.json({
          success: true,
          data: {
            sales: slice.map((s) => ({
              id: s.id,
              amount: s.totals?.totalRevenue ?? 0,
              date: s.saleDate,
              status: s.status,
            })),
            count: slice.length,
            total: sales.length,
            offset,
            limit,
            hasMore,
          },
        });
      }
      case 'get_players': {
        const limit = clampLimit(parameters.limit);
        const offset = clampOffset(parameters.offset);
        const players = await getAllPlayers();
        const slice = players.slice(offset, offset + limit);
        const hasMore = offset + limit < players.length;
        return NextResponse.json({
          success: true,
          data: { players: slice, count: slice.length, total: players.length, offset, limit, hasMore },
        });
      }
      case 'get_financials': {
        const limit = clampLimit(parameters.limit);
        const offset = clampOffset(parameters.offset);
        const financials = await getAllFinancials();
        const slice = financials.slice(offset, offset + limit);
        const hasMore = offset + limit < financials.length;
        return NextResponse.json({
          success: true,
          data: { financials: slice, count: slice.length, total: financials.length, offset, limit, hasMore },
        });
      }
      case 'get_items': {
        const limit = clampLimit(parameters.limit);
        const offset = clampOffset(parameters.offset);
        const items = await getAllItems();
        const slice = items.slice(offset, offset + limit);
        const hasMore = offset + limit < items.length;
        return NextResponse.json({
          success: true,
          data: { items: slice, count: slice.length, total: items.length, offset, limit, hasMore },
        });
      }
      case 'get_sites': {
        const limit = clampLimit(parameters.limit);
        const offset = clampOffset(parameters.offset);
        const sites = await getAllSites();
        const slice = sites.slice(offset, offset + limit);
        const hasMore = offset + limit < sites.length;
        return NextResponse.json({
          success: true,
          data: { sites: slice, count: slice.length, total: sites.length, offset, limit, hasMore },
        });
      }
      case 'get_characters': {
        const limit = clampLimit(parameters.limit);
        const offset = clampOffset(parameters.offset);
        const characters = await getAllCharacters();
        const slice = characters.slice(offset, offset + limit);
        const hasMore = offset + limit < characters.length;
        return NextResponse.json({
          success: true,
          data: {
            characters: slice,
            count: slice.length,
            total: characters.length,
            offset,
            limit,
            hasMore,
          },
        });
      }
      case 'thegame.integrity.linkConsistency': {
        const my = parseMonthYear(parameters);
        if (!my) {
          return NextResponse.json(
            { success: false, error: 'month and year (valid calendar) are required' },
            { status: 400 }
          );
        }
        const data = await auditLinkConsistency(my.month, my.year);
        return NextResponse.json({ success: true, data });
      }
      case 'thegame.integrity.statusConsistency': {
        const my = parseMonthYear(parameters);
        if (!my) {
          return NextResponse.json(
            { success: false, error: 'month and year (valid calendar) are required' },
            { status: 400 }
          );
        }
        const data = await auditStatusConsistency(my.month, my.year);
        return NextResponse.json({ success: true, data });
      }
      case 'thegame.integrity.monthIndex': {
        const my = parseMonthYear(parameters);
        if (!my) {
          return NextResponse.json(
            { success: false, error: 'month and year (valid calendar) are required' },
            { status: 400 }
          );
        }
        const data = await auditMonthIndexAccuracy(my.month, my.year);
        return NextResponse.json({ success: true, data });
      }
      case 'thegame.integrity.archiveCompleteness': {
        const my = parseMonthYear(parameters);
        if (!my) {
          return NextResponse.json(
            { success: false, error: 'month and year (valid calendar) are required' },
            { status: 400 }
          );
        }
        const data = await auditArchiveCompleteness(my.month, my.year);
        return NextResponse.json({ success: true, data });
      }
      case 'thegame.integrity.taskTimelineVsMonthIndex': {
        const my = parseMonthYear(parameters);
        if (!my) {
          return NextResponse.json(
            { success: false, error: 'month and year (valid calendar) are required' },
            { status: 400 }
          );
        }
        const data = await auditTaskTimelineVsMonthIndex(my.month, my.year);
        return NextResponse.json({ success: true, data });
      }
      case 'thegame.integrity.completedTasksMissingFromCompletedIndex': {
        const data = await auditCompletedTasksMissingFromCompletedIndex();
        return NextResponse.json({ success: true, data });
      }
      case 'thegame.integrity.activeTasksMissingFromActiveIndex': {
        const data = await auditActiveTasksMissingFromActiveIndex();
        return NextResponse.json({ success: true, data });
      }
      case 'thegame.tasks.repairPrimaryIndex': {
        const data = await repairPrimaryTaskIndex();
        return NextResponse.json({ success: true, data });
      }
      case 'thegame.tasks.repairActiveIndex': {
        const data = await repairTaskActiveIndex();
        return NextResponse.json({ success: true, data });
      }
      case 'thegame.tasks.repairCompletedIndex': {
        const data = await repairTaskCompletedIndex();
        return NextResponse.json({ success: true, data });
      }
      case 'thegame.tasks.getGlobalTaskCounts': {
        const data = await getGlobalTaskCounts();
        return NextResponse.json({ success: true, data });
      }
      case 'thegame.sales.repairSummaries': {
        const monthKey = parameters.monthKey ? String(parameters.monthKey).trim() : undefined;
        if (monthKey) {
          try {
            const totals = await SummaryService.rebuildSummaryForMonth(monthKey);
            return NextResponse.json({ success: true, message: `Rebuilt summary for ${monthKey}`, data: { totals } });
          } catch (err) {
            const message = err instanceof Error ? err.message : 'Invalid monthKey';
            return NextResponse.json({ success: false, error: message }, { status: 400 });
          }
        }
        const data = await SummaryService.rebuildAllSummaries();
        return NextResponse.json({ success: true, data });
      }
      case 'thegame.logs.patchEntry': {
        const { parseEntityTypeParameter } = await import('@/lib/mcp/parse-entity-type-param');
        const entityType = parseEntityTypeParameter(parameters.entityType);
        if (!entityType) {
          return NextResponse.json(
            {
              success: false,
              error: 'entityType is required (sale | task | item | financial)',
            },
            { status: 400 }
          );
        }
        const logEntryId = String(parameters.logEntryId ?? '').trim();
        if (!logEntryId) {
          return NextResponse.json({ success: false, error: 'logEntryId is required' }, { status: 400 });
        }
        const entityIdParam = parameters.entityId ? String(parameters.entityId).trim() : undefined;
        const newEvent = parameters.newEvent ? String(parameters.newEvent).trim() : undefined;

        const { getLogEntryById, patchLogEntryById } = await import('@/workflows/entities-logging');
        const hit = await getLogEntryById(entityType, logEntryId);
        if (!hit) {
          return NextResponse.json(
            { success: false, error: `Log entry not found: ${logEntryId}` },
            { status: 404 }
          );
        }
        if (entityIdParam && hit.entry.entityId !== entityIdParam) {
          return NextResponse.json(
            { success: false, error: 'entityId does not match this log entry' },
            { status: 400 }
          );
        }

        if (entityType === EntityType.SALE) {
          const { getSaleById } = await import('@/data-store/datastore');
          const { getSaleLogDetails } = await import('@/lib/utils/sale-log-details');
          const { calculateClosingDate } = await import('@/lib/utils/date-utils');
          const sale = await getSaleById(hit.entry.entityId);
          if (!sale) {
            return NextResponse.json(
              { success: false, error: 'Sale not found for log entry' },
              { status: 404 }
            );
          }
          const targetEvent = String(newEvent || hit.entry.event || '').toUpperCase();
          let timestampIso: string | undefined;
          if (targetEvent === 'CHARGED' || targetEvent === 'DONE') {
            const d = sale.doneAt || (sale as { chargedAt?: Date }).chargedAt;
            timestampIso = d ? toUTC(d).toISOString() : undefined;
          } else if (targetEvent === 'COLLECTED') {
            const raw =
              sale.collectedAt ||
              calculateClosingDate(sale.saleDate ? toUTC(sale.saleDate) : getUTCNow());
            timestampIso = raw ? toUTC(raw).toISOString() : undefined;
          }
          const patchResult = await patchLogEntryById(EntityType.SALE, {
            logEntryId,
            entityId: entityIdParam,
            newEvent,
            saleLean: getSaleLogDetails(sale),
            timestampIso,
          });
          return NextResponse.json({
            success: true,
            data: { ...patchResult, entityId: sale.id, event: newEvent || hit.entry.event, entityType: 'sale' },
          });
        }

        if (entityType === EntityType.TASK) {
          const { getTaskById } = await import('@/data-store/datastore');
          const task = await getTaskById(hit.entry.entityId);
          if (!task) {
            return NextResponse.json(
              { success: false, error: 'Task not found for log entry' },
              { status: 404 }
            );
          }
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
          return NextResponse.json({
            success: true,
            data: { ...patchResult, entityId: task.id, event: newEvent || hit.entry.event, entityType: 'task' },
          });
        }

        if (entityType === EntityType.ITEM) {
          const { getItemById } = await import('@/data-store/datastore');
          const item = await getItemById(hit.entry.entityId);
          if (!item) {
            return NextResponse.json(
              { success: false, error: 'Item not found for log entry' },
              { status: 404 }
            );
          }
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
            itemLean: {
              name: item.name,
              itemType: item.type,
              subItemType: item.subItemType || '',
              soldQuantity: item.quantitySold || 0,
            },
            timestampIso,
          });
          return NextResponse.json({
            success: true,
            data: { ...patchResult, entityId: item.id, event: newEvent || hit.entry.event, entityType: 'item' },
          });
        }

        if (entityType === EntityType.FINANCIAL) {
          const { getFinancialById } = await import('@/data-store/datastore');
          const financial = await getFinancialById(hit.entry.entityId);
          if (!financial) {
            return NextResponse.json(
              { success: false, error: 'Financial not found for log entry' },
              { status: 404 }
            );
          }
          const refMonth = toUTC(Date.UTC(financial.year, financial.month - 1, 1));
          const targetEvent = String(newEvent || hit.entry.event || '').toUpperCase();
          let timestampIso: string | undefined;
          if (
            targetEvent === 'DONE' ||
            targetEvent === 'PENDING' ||
            targetEvent === 'CREATED' ||
            targetEvent === 'UPDATED' ||
            targetEvent === 'CANCELLED'
          ) {
            timestampIso = refMonth.toISOString();
          } else if (targetEvent === 'COLLECTED') {
            const raw = financial.collectedAt || refMonth;
            timestampIso = toUTC(raw).toISOString();
          }
          const patchResult = await patchLogEntryById(EntityType.FINANCIAL, {
            logEntryId,
            entityId: entityIdParam,
            newEvent,
            financialLean: {
              name: financial.name,
              type: financial.type,
              station: financial.station,
              cost: financial.cost,
              revenue: financial.revenue,
            },
            timestampIso,
          });
          return NextResponse.json({
            success: true,
            data: {
              ...patchResult,
              entityId: financial.id,
              event: newEvent || hit.entry.event,
              entityType: 'financial',
            },
          });
        }

        return NextResponse.json(
          { success: false, error: `patchEntry not supported for entityType: ${entityType}` },
          { status: 400 }
        );
      }
      case 'thegame.logs.ensureDone': {
        const { parseEntityTypeParameter } = await import('@/lib/mcp/parse-entity-type-param');
        const { ensureDoneLog } = await import('@/workflows/ensure-entity-logs');
        const entityType = parseEntityTypeParameter(parameters.entityType);
        const entityId = String(parameters.entityId ?? '').trim();
        if (!entityType || !entityId) {
          return NextResponse.json(
            { success: false, error: 'entityType and entityId are required' },
            { status: 400 }
          );
        }
        const data = await ensureDoneLog(entityType, entityId);
        if (!data.success) {
          return NextResponse.json({ success: false, error: data.error }, { status: 400 });
        }
        
        const entityTypeLabel =
          entityType === EntityType.SALE
            ? 'sale'
            : entityType === EntityType.TASK
              ? 'task'
              : entityType === EntityType.ITEM
                ? 'item'
                : entityType === EntityType.FINANCIAL
                  ? 'financial'
                  : String(entityType);

        if (data.noop) {
          return NextResponse.json({ 
            success: true, 
            data: { 
              entityType: entityTypeLabel, 
              message: `Idempotent Success: The ${entityTypeLabel} log is already in the correct state. No changes were needed.` 
            } 
          });
        }
        
        return NextResponse.json({ success: true, data: { ...data, entityType: entityTypeLabel } });
      }
      case 'thegame.logs.ensureCollected': {
        const { parseEntityTypeParameter } = await import('@/lib/mcp/parse-entity-type-param');
        const { ensureCollectedLog } = await import('@/workflows/ensure-entity-logs');
        const entityType = parseEntityTypeParameter(parameters.entityType);
        const entityId = String(parameters.entityId ?? '').trim();
        if (!entityType || !entityId) {
          return NextResponse.json(
            { success: false, error: 'entityType and entityId are required' },
            { status: 400 }
          );
        }
        const data = await ensureCollectedLog(entityType, entityId);
        if (!data.success) {
          return NextResponse.json({ success: false, error: data.error }, { status: 400 });
        }
        const entityTypeLabel = entityType === EntityType.SALE ? 'sale' : 'task';
        
        if (data.noop) {
          return NextResponse.json({ 
            success: true, 
            data: { 
              entityType: entityTypeLabel, 
              message: `Idempotent Success: The ${entityTypeLabel} collected log is already present and correct. No changes were needed.` 
            } 
          });
        }
        
        return NextResponse.json({ success: true, data: { ...data, entityType: entityTypeLabel } });
      }
      default:
        return NextResponse.json({ success: false, error: `Unknown tool: ${toolId}` }, { status: 404 });
    }
  } catch (e) {
    console.error('[MCP execute]', e);
    return NextResponse.json(
      { success: false, error: e instanceof Error ? e.message : 'Execution failed' },
      { status: 500 }
    );
  }
}
