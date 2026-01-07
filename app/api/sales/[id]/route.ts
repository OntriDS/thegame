// app/api/sales/[id]/route.ts
import { NextResponse, NextRequest } from 'next/server';
import { getSaleById, removeSale } from '@/data-store/datastore';
import { requireAdminAuth } from '@/lib/api-auth';
import { removeSaleEffectsOnDelete } from '@/workflows/entities-workflows/sale.workflow'; // Import Cleanup Workflow

// Force dynamic rendering - this route accesses cookies
export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  if (!(await requireAdminAuth(req))) return new NextResponse('Unauthorized', { status: 401 });
  const sale = await getSaleById(params.id);
  if (!sale) return new NextResponse('Not Found', { status: 404 });
  return NextResponse.json(sale);
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  if (!(await requireAdminAuth(req))) return new NextResponse('Unauthorized', { status: 401 });

  // 1. Run Cleanup Workflow (Inventory Revert, Financials, Links)
  await removeSaleEffectsOnDelete(params.id);

  // 2. Remove Sale Entity
  await removeSale(params.id);

  return new NextResponse(null, { status: 204 });
}
