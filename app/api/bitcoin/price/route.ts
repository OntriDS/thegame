import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

const PROVIDERS = [
  {
    name: 'coingecko',
    url: 'https://api.coingecko.com/api/v3/simple/price?ids=bitcoin&vs_currencies=usd',
    parse: (data: any) => Number(data?.bitcoin?.usd ?? 0),
  },
  {
    name: 'coinbase',
    url: 'https://api.coinbase.com/v2/prices/BTC-USD/spot',
    parse: (data: any) => Number(data?.data?.amount ?? 0),
  },
  {
    name: 'coindesk',
    url: 'https://api.coindesk.com/v1/bpi/currentprice/USD.json',
    parse: (data: any) => Number(data?.bpi?.USD?.rate_float ?? 0),
  },
  {
    name: 'binance',
    url: 'https://api.binance.com/api/v3/ticker/price?symbol=BTCUSDT',
    parse: (data: any) => Number(data?.price ?? 0),
  },
];

async function fetchFromProvider(provider: (typeof PROVIDERS)[number]) {
  try {
    const response = await fetch(provider.url, {
      headers: {
        'Accept': 'application/json',
      },
      cache: 'no-store',
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    const data = await response.json();
    const price = provider.parse(data);
    if (!price || Number.isNaN(price) || price <= 0) {
      throw new Error('Invalid price data');
    }

    return price;
  } catch (error) {
    console.warn(`[bitcoin-price] Provider ${provider.name} failed`, error);
    return null;
  }
}

export async function GET(_request: NextRequest) {
  for (const provider of PROVIDERS) {
    const price = await fetchFromProvider(provider);
    if (price && price > 0) {
      return NextResponse.json({ price, provider: provider.name });
    }
  }

  return NextResponse.json({ error: 'Unable to fetch bitcoin price' }, { status: 502 });
}
