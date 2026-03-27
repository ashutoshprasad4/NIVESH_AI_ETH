import { NextResponse } from 'next/server';
import { execSync } from 'child_process';
import path from 'path';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const symbol = searchParams.get('symbol') || 'HDFCBANK.NS';
  try {
    const scriptPath = path.join(process.cwd(), 'scripts', 'detect_patterns.py');
    const output = execSync(`python "${scriptPath}" ${symbol}`, { timeout: 30000 }).toString();
    const data = JSON.parse(output);
    if (data.error) throw new Error(data.error);
    return NextResponse.json(data);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
