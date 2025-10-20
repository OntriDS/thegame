// app/api/sites/route.ts
import { NextResponse, NextRequest } from 'next/server';
import { v4 as uuid } from 'uuid';
import type { Site } from '@/types/entities';
import { getAllSites, upsertSite, getSitesBySettlement, getSitesByRadius } from '@/data-store/datastore';
import { requireAdminAuth } from '@/lib/api-auth';

// Force dynamic rendering - this route accesses cookies
export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  if (!(await requireAdminAuth(req))) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  
  const { searchParams } = new URL(req.url);
  const settlementId = searchParams.get('settlementId');
  const lat = searchParams.get('lat');
  const lng = searchParams.get('lng');
  const radius = searchParams.get('radius');
  
  // Query by settlement
  if (settlementId) {
    const sites = await getSitesBySettlement(settlementId);
    return NextResponse.json(sites);
  }
  
  // Query by radius
  if (lat && lng && radius) {
    const sites = await getSitesByRadius(
      parseFloat(lat),
      parseFloat(lng),
      parseFloat(radius)
    );
    return NextResponse.json(sites);
  }
  
  // Default: return all sites
  const sites = await getAllSites();
  return NextResponse.json(sites);
}

export async function POST(req: NextRequest) {
  if (!(await requireAdminAuth(req))) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const body = (await req.json()) as Site;
  const site: Site = { 
    ...body, 
    id: body.id || uuid(), 
    createdAt: body.createdAt ? new Date(body.createdAt) : new Date(), 
    updatedAt: new Date(), 
    links: body.links || [] 
  };
  const saved = await upsertSite(site);
  return NextResponse.json(saved);
}
