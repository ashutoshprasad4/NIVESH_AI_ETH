import { NextResponse } from 'next/server';
import { runPythonScript, getCachedData, setCachedData } from '@/lib/api-utils';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const symbols = searchParams.get('symbol') || 'HDFCBANK.NS';
  const period = searchParams.get('period') || '6mo';
  const interval = searchParams.get('interval') || '1d';

  const cacheKey = `market_${symbols}_${period}_${interval}`;
  const cached = getCachedData(cacheKey);
  if (cached) return NextResponse.json(cached);

  try {
    const data = await runPythonScript('fetch_market.py', [symbols, period, interval]);

    // Cache for 1 minute (60 seconds)
    setCachedData(cacheKey, data, 60);

    return NextResponse.json(data);
  } catch (error: any) {
    console.error('Market API Error:', error.message);
    return NextResponse.json({ error: 'Failed to load market data.' }, { status: 500 });
  }
}