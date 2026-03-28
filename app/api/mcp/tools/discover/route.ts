import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { verifyPixelbrainRouteAccess } from '@/lib/auth/pixelbrain-route-auth';

/** Tool catalog for Pixelbrain / M2M (ids must match execute handler). */
const TOOLS = [
  {
    id: 'get_tasks',
    name: 'get_tasks',
    description: 'List tasks with optional status filter. limit is required (default 50 server-side if invalid; max 200).',
    systemId: 'thegame',
    parameters: {
      type: 'object',
      properties: {
        filter: { type: 'object' },
        limit: { type: 'number', description: 'Required for agents; max 200 per page' },
        offset: { type: 'number' },
      },
      required: ['limit'],
    },
  },
  {
    id: 'get_sales',
    name: 'get_sales',
    description: 'List sales with optional date range. limit required (max 200).',
    systemId: 'thegame',
    parameters: {
      type: 'object',
      properties: {
        dateRange: { type: 'object' },
        limit: { type: 'number' },
        offset: { type: 'number' },
      },
      required: ['limit'],
    },
  },
  {
    id: 'get_players',
    name: 'get_players',
    description: 'List players with pagination. limit required (max 200).',
    systemId: 'thegame',
    parameters: {
      type: 'object',
      properties: {
        limit: { type: 'number' },
        offset: { type: 'number' },
      },
      required: ['limit'],
    },
  },
  {
    id: 'get_financials',
    name: 'get_financials',
    description: 'List financial records. limit required (max 200).',
    systemId: 'thegame',
    parameters: {
      type: 'object',
      properties: {
        limit: { type: 'number' },
        offset: { type: 'number' },
      },
      required: ['limit'],
    },
  },
  {
    id: 'get_items',
    name: 'get_items',
    description: 'List items. limit required (max 200).',
    systemId: 'thegame',
    parameters: {
      type: 'object',
      properties: {
        limit: { type: 'number' },
        offset: { type: 'number' },
      },
      required: ['limit'],
    },
  },
  {
    id: 'get_sites',
    name: 'get_sites',
    description: 'List sites. limit required (max 200).',
    systemId: 'thegame',
    parameters: {
      type: 'object',
      properties: {
        limit: { type: 'number' },
        offset: { type: 'number' },
      },
      required: ['limit'],
    },
  },
  {
    id: 'get_characters',
    name: 'get_characters',
    description: 'List characters. limit required (max 200).',
    systemId: 'thegame',
    parameters: {
      type: 'object',
      properties: {
        limit: { type: 'number' },
        offset: { type: 'number' },
      },
      required: ['limit'],
    },
  },
  {
    id: 'thegame.integrity.linkConsistency',
    name: 'Link consistency',
    description: 'Verify link endpoints for entities in the given calendar month.',
    systemId: 'thegame',
    parameters: {
      type: 'object',
      properties: {
        month: { type: 'number', description: '1-12' },
        year: { type: 'number', description: 'e.g. 2026' },
      },
      required: ['month', 'year'],
    },
  },
  {
    id: 'thegame.integrity.statusConsistency',
    name: 'Status consistency',
    description: 'Sale/financial status vs payment and collected flags for the month index.',
    systemId: 'thegame',
    parameters: {
      type: 'object',
      properties: {
        month: { type: 'number' },
        year: { type: 'number' },
      },
      required: ['month', 'year'],
    },
  },
  {
    id: 'thegame.integrity.monthIndex',
    name: 'Month index accuracy',
    description: 'Compare month indexes to sale dates and financial year/month fields.',
    systemId: 'thegame',
    parameters: {
      type: 'object',
      properties: {
        month: { type: 'number' },
        year: { type: 'number' },
      },
      required: ['month', 'year'],
    },
  },
  {
    id: 'thegame.integrity.archiveCompleteness',
    name: 'Archive completeness',
    description: 'Collected sales vs archive index and data keys.',
    systemId: 'thegame',
    parameters: {
      type: 'object',
      properties: {
        month: { type: 'number' },
        year: { type: 'number' },
      },
      required: ['month', 'year'],
    },
  },
  {
    id: 'thegame.integrity.taskTimelineVsMonthIndex',
    name: 'Task timeline vs month index',
    description:
      'Audit tasks in History scope for a month: collected index; flags missing or wrong-month doneAt/collectedAt.',
    systemId: 'thegame',
    parameters: {
      type: 'object',
      properties: {
        month: { type: 'number', description: '1-12' },
        year: { type: 'number', description: 'e.g. 2026' },
      },
      required: ['month', 'year'],
    },
  },
  {
    id: 'thegame.integrity.completedTasksMissingFromCompletedIndex',
    name: 'Completed tasks vs monthly index',
    description:
      'Done or Collected tasks that are not in any monthly tasks index (Redis: thegame:index:tasks:collected:MM-YY). No month parameters.',
    systemId: 'thegame',
    parameters: {
      type: 'object',
      properties: {},
    },
  },
  {
    id: 'thegame.integrity.activeTasksMissingFromActiveIndex',
    name: 'Active tasks vs active index',
    description:
      'Tasks not yet Done/Collected that are missing from thegame:index:task:active. No month parameters.',
    systemId: 'thegame',
    parameters: {
      type: 'object',
      properties: {},
    },
  },
  {
    id: 'thegame.tasks.repairActiveIndex',
    name: 'Repair active tasks index',
    description:
      'Rebuild thegame:index:task:active from all tasks (excludes ids in any tasks collected-month set). Returns diff counts and id samples.',
    systemId: 'thegame',
    parameters: {
      type: 'object',
      properties: {},
    },
  },
  {
    id: 'thegame.tasks.repairCompletedIndex',
    name: 'Repair completed tasks index',
    description:
      'Rebuild all thegame:index:tasks:collected:MM-YY sets from all tasks marked as Done or Collected. Returns rebuilt months count and id samples.',
    systemId: 'thegame',
    parameters: {
      type: 'object',
      properties: {},
    },
  },
  {
    id: 'thegame.sales.repairSummaries',
    name: 'Repair sales & dashboard summaries',
    description:
      'Recompute monthly and all-time rolling counters in Redis (salesRevenue, salesVolume, itemsSold, financial revenue/cost, task counts) from the archive vault. itemsSold is rebuilt from archived sale lines (item quantities + bundle quantity × itemsPerBundle), not Item.quantitySold sums. Use after KPI drift. Heavy: scans archive months.',
    systemId: 'thegame',
    parameters: {
      type: 'object',
      properties: {},
    },
  },
  {
    id: 'thegame.logs.patchEntry',
    name: 'Patch one entity log row',
    description:
      'Targeted: entityType (sale | task | item | financial), logEntryId from Data Center log JSON, optional entityId to validate. Refreshes lean fields and timestamps from current entity. No bulk repair.',
    systemId: 'thegame',
    parameters: {
      type: 'object',
      properties: {
        entityType: { type: 'string', description: 'sale | task | item | financial' },
        logEntryId: { type: 'string', description: 'UUID of the log entry row' },
        entityId: { type: 'string', description: 'Optional; must match entry.entityId if provided' },
        newEvent: { type: 'string', description: 'Optional; rename the event (e.g. fix DONE to CHARGED for sales)' },
      },
      required: ['entityType', 'logEntryId'],
    },
  },
  {
    id: 'thegame.logs.ensureDone',
    name: 'Ensure primary lifecycle log for one entity',
    description:
      'Targeted: entityType and entityId. Idempotent. sale→CHARGED, task→DONE, item→SOLD, financial→DONE (when paid+charged). Wire id: thegame.logs.ensureDone.',
    systemId: 'thegame',
    parameters: {
      type: 'object',
      properties: {
        entityType: { type: 'string', description: 'sale | task | item | financial' },
        entityId: { type: 'string', description: 'entity id for that type' },
      },
      required: ['entityType', 'entityId'],
    },
  },
  {
    id: 'thegame.logs.ensureCollected',
    name: 'Ensure COLLECTED log for one entity',
    description:
      'Targeted: entityType (sale or task only) and entityId. Appends COLLECTED if implied and missing. Idempotent.',
    systemId: 'thegame',
    parameters: {
      type: 'object',
      properties: {
        entityType: { type: 'string', description: 'sale | task' },
        entityId: { type: 'string', description: 'sale id or task id' },
      },
      required: ['entityType', 'entityId'],
    },
  },
];

export async function GET(req: NextRequest) {
  const auth = await verifyPixelbrainRouteAccess(req);
  if (!auth.ok) {
    return NextResponse.json({ error: auth.message }, { status: auth.status });
  }
  return NextResponse.json({ tools: TOOLS, systemId: 'thegame' });
}

export async function POST(req: NextRequest) {
  return GET(req);
}
