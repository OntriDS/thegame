import { NextRequest, NextResponse } from 'next/server';
import { getCompanyAssets, saveCompanyAssets } from '@/data-store/datastore';

export async function GET() {
  try {
    const assets = await getCompanyAssets();
    return NextResponse.json(assets);
  } catch (error) {
    console.error('Error fetching company assets:', error);
    return NextResponse.json({ error: 'Failed to fetch company assets' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const assets = await request.json();
    await saveCompanyAssets(assets);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error saving company assets:', error);
    return NextResponse.json({ error: 'Failed to save company assets' }, { status: 500 });
  }
}
