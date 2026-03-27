import { NextResponse } from 'next/server';
import { runPythonScript, getCachedData, setCachedData } from '@/lib/api-utils';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const symbol = searchParams.get('symbol') || 'HDFCBANK.NS';

  const cacheKey = `patterns_${symbol}`;
  const cached = getCachedData(cacheKey);
  if (cached) return NextResponse.json(cached);

  try {
    const data = await runPythonScript('detect_patterns.py', [symbol]);

    // Cache for 5 minutes (300 seconds)
    setCachedData(cacheKey, data, 300);

    return NextResponse.json(data);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
