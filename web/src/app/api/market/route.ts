import { NextResponse } from 'next/server';
import yahooFinance from 'yahoo-finance2';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const symbol = searchParams.get('symbol') || 'HDFCBANK.NS';
  const period = searchParams.get('period') || '6mo';
  const interval = searchParams.get('interval') || '1d';

  try {
    const { execSync } = require('child_process');
    const path = require('path');
    const scriptPath = path.join(process.cwd(), 'scripts', 'fetch_market.py');
    const output = execSync(`python "${scriptPath}" ${symbol} ${period} ${interval}`).toString();
    const data = JSON.parse(output);
    if (data.error) throw new Error(data.error);
    return NextResponse.json(data);
  } catch (error: any) {
    console.error('Market API Error:', error.message);
    return NextResponse.json({ error: 'Failed to fully load market data.' }, { status: 500 });
  }
}
