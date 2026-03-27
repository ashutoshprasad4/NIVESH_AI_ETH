import { NextResponse } from 'next/server';
import { execSync } from 'child_process';
import path from 'path';

export async function GET() {
  try {
    const scriptPath = path.join(process.cwd(), 'scripts', 'fetch_radar.py');
    const output = execSync(`python "${scriptPath}"`, { timeout: 60000 }).toString();
    const data = JSON.parse(output);
    if (data.error) throw new Error(data.error);
    return NextResponse.json({ signals: data.signals || [], news: data.news || [] });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
