import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { verifyPixelbrainRouteAccess } from '@/lib/auth/pixelbrain-route-auth';

/** Tool catalog for Pixelbrain / M2M (ids must match execute handler). */
const TOOLS = [
  {
    id: 'get_tasks',
    name: 'get_tasks',
    description: 'List tasks with optional status filter and limit.',
    systemId: 'thegame',
    parameters: {
      type: 'object',
      properties: {
        filter: { type: 'object' },
        limit: { type: 'number' },
        offset: { type: 'number' },
      },
    },
  },
  {
    id: 'get_sales',
    name: 'get_sales',
    description: 'List sales with optional date range and limit.',
    systemId: 'thegame',
    parameters: {
      type: 'object',
      properties: {
        dateRange: { type: 'object' },
        limit: { type: 'number' },
        offset: { type: 'number' },
      },
    },
  },
  {
    id: 'get_players',
    name: 'get_players',
    description: 'List players (capped).',
    systemId: 'thegame',
    parameters: {
      type: 'object',
      properties: { limit: { type: 'number' } },
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
