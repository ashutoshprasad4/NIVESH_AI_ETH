import { NextResponse } from 'next/server';
import { runPythonScript, getCachedData, setCachedData } from '@/lib/api-utils';

export async function GET() {
  const cacheKey = 'radar_data';
  const cached = getCachedData(cacheKey);
  if (cached) return NextResponse.json(cached);

  try {
    const data = await runPythonScript('fetch_radar.py');
    const response = { signals: data.signals || [], news: data.news || [] };

    // Cache for 5 minutes (300 seconds)
    setCachedData(cacheKey, response, 300);

    return NextResponse.json(response);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
