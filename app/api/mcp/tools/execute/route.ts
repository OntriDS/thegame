import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { verifyPixelbrainRouteAccess } from '@/lib/auth/pixelbrain-route-auth';
import { getAllSales, getAllTasks, getAllPlayers } from '@/data-store/datastore';
import {
  auditArchiveCompleteness,
  auditLinkConsistency,
  auditMonthIndexAccuracy,
  auditStatusConsistency,
} from '@/lib/integrity/integrity-audits';

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
        const limit = Math.min(Number(parameters.limit) || 100, 500);
        const offset = Number(parameters.offset) || 0;
        const filter = parameters.filter as { status?: string } | undefined;
        let tasks = await getAllTasks();
        if (filter?.status) {
          tasks = tasks.filter((t) => String(t.status) === filter.status);
        }
        const slice = tasks.slice(offset, offset + limit);
        return NextResponse.json({
          success: true,
          data: { tasks: slice, count: slice.length, total: tasks.length },
        });
      }
      case 'get_sales': {
        const limit = Math.min(Number(parameters.limit) || 100, 500);
        const offset = Number(parameters.offset) || 0;
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
          },
        });
      }
      case 'get_players': {
        const limit = Math.min(Number(parameters.limit) || 100, 500);
        const players = await getAllPlayers();
        const slice = players.slice(0, limit);
        return NextResponse.json({
          success: true,
          data: { players: slice, count: slice.length, total: players.length },
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
