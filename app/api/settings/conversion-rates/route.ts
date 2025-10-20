import { NextRequest, NextResponse } from 'next/server';
import { getConversionRates, saveConversionRates } from '@/data-store/datastore';

export async function GET() {
  try {
    const rates = await getConversionRates();
    return NextResponse.json(rates);
  } catch (error) {
    console.error('Error fetching conversion rates:', error);
    return NextResponse.json({ error: 'Failed to fetch conversion rates' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const rates = await request.json();
    await saveConversionRates(rates);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error saving conversion rates:', error);
    return NextResponse.json({ error: 'Failed to save conversion rates' }, { status: 500 });
  }
}
