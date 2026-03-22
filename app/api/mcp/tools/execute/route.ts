import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { verifyPixelbrainRouteAccess } from '@/lib/auth/pixelbrain-route-auth';
import {
  getAllSales,
  getAllTasks,
  getAllPlayers,
  getAllFinancials,
  getAllItems,
  getAllSites,
  getAllCharacters,
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
        if (dateRange?.start && dateRange?.end) {
          const start = new Date(dateRange.start).getTime();
          const end = new Date(dateRange.end).getTime();
          sales = sales.filter((s) => {
            const t = new Date(s.saleDate).getTime();
            return t >= start && t <= end;
          });
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
