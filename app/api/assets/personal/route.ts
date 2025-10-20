import { NextRequest, NextResponse } from 'next/server';
import { getPersonalAssets, savePersonalAssets } from '@/data-store/datastore';

export async function GET() {
  try {
    const assets = await getPersonalAssets();
    return NextResponse.json(assets);
  } catch (error) {
    console.error('Error fetching personal assets:', error);
    return NextResponse.json({ error: 'Failed to fetch personal assets' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const assets = await request.json();
    await savePersonalAssets(assets);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error saving personal assets:', error);
    return NextResponse.json({ error: 'Failed to save personal assets' }, { status: 500 });
  }
}
